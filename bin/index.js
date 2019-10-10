#!/usr/bin/env node

const { resolve } = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver-promise");
const glob = require("fast-glob");
const { existsSync, copySync, removeSync, ensureDirSync } = require("fs-extra");
const mri = require("mri");
const resolveDependencies = require("../lib/resolveDependencies");

const rootDir = process.cwd();
const args = mri(process.argv.slice(2), {
  default: {
    "build-dir": "_build"
  },
  string: ["build-dir", "output"]
});

const [folder] = args._;

if (!folder) {
  throw new Error("Please supply a folder");
}

const workspacePkg = require(resolve(rootDir, "package.json"));
if (!workspacePkg.workspaces) {
  throw new Error(
    "You must specify a `workspaces` field in your workspaces's package.json."
  );
}

const localPackages = glob.sync(workspacePkg.workspaces, {
  cwd: rootDir,
  onlyDirectories: true
});
const pkgDir = localPackages.find(dir => dir.split("/").pop() === folder);

if (!pkgDir) {
  throw new Error(`Folder \`${folder}\` was not found.`);
}

const pkg = require(resolve(rootDir, pkgDir, "package.json"));

const localModules = [];
for (const dir of localPackages) {
  try {
    const pkg = require(resolve(rootDir, dir, "package.json"));
    localModules.push(pkg);
  } catch (e) {}
}

const buildDir = resolve(rootDir, args["build-dir"]);
removeSync(buildDir);

const main = async () => {
  // copy package to build folder
  copySync(resolve(rootDir, pkgDir), buildDir);
  ensureDirSync(resolve(rootDir, pkgDir, "node_modules"));

  // build
  if (pkg.scripts && pkg.scripts.build) {
    execSync("yarn build", { cwd: buildDir });
  }

  // resolve dependencies
  const deps = await resolveDependencies(pkg.dependencies, localModules);

  // copy dependencies to node_modules
  deps
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(dep => {
      const versionIndex = dep.lastIndexOf("@");
      const dirName = versionIndex <= 0 ? dep : dep.substr(0, versionIndex);
      const dir = resolve(rootDir, "node_modules", dirName);
      if (!existsSync(dir)) return;

      copySync(dir, resolve(buildDir, "node_modules", dirName), {
        dereference: true
      });
    });

  // package into zip
  const output = args.output || `${pkg.name.replace("/", "-")}.zip`;
  const zip = archiver(resolve(rootDir, output), {
    store: true
  });
  zip.directory(buildDir, false);
  await zip.finalize();

  // remove build folder
  removeSync(buildDir);
};

main()
  .then(() => process.exit())
  .catch(e => console.error(e) && process.exit(1));
