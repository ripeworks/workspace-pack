const { resolve } = require('path')
const { execSync } = require('child_process')
const archiver = require('archiver-promise')
const glob = require('fast-glob')
const { ls, config } = require('npm-remote-ls')
const { existsSync, copySync, removeSync, ensureDirSync } = require('fs-extra')
config({development: false, optional: false})

const rootDir = process.cwd()
const folder = process.argv[2]

if (!folder) {
  throw new Error('Please supply a folder')
}

const workspacePkg = require(resolve(rootDir, 'package.json'))
if (!workspacePkg.workspaces) {
  throw new Error('You must specify a `workspaces` field in your workspaces\'s package.json.')
}

const localPackages = glob.sync(workspacePkg.workspaces, {cwd: rootDir, onlyDirectories: true})
const pkgDir = localPackages.find(dir => dir.split('/').pop() === folder)

if (!pkgDir) {
  throw new Error(`Folder \`${folder}\` was not found.`)
}

const pkg = require(resolve(rootDir, pkgDir, 'package.json'))

const localModules = []
for (const dir of localPackages) {
  try {
    const pkg = require(resolve(rootDir, dir, 'package.json'))
    localModules.push(pkg)
  } catch (e) {}
}

const buildDir = resolve(rootDir, '_build')
removeSync(buildDir)

const main = async () => {
  // copy package to build folder
  copySync(resolve(rootDir, pkgDir), buildDir)
  ensureDirSync(resolve(rootDir, pkgDir, 'node_modules'))

  // build
  if (pkg.scripts && pkg.scripts.build) {
    execSync('yarn build', {cwd: buildDir})
  }

  // resolve dependencies
  const deps = await resolveDependencies(pkg.dependencies, localModules)

  // copy dependencies to node_modules
  deps
    .filter((value, index, self) => self.indexOf(value) === index)
    .map(dep => {
      const dirName = dep.split('@').shift()
      const dir = resolve(rootDir, 'node_modules', dirName)
      if (!existsSync(dir)) return

      copySync(dir, resolve(buildDir, 'node_modules', dirName), {dereference: true})
    })

  // package into zip
  const zip = archiver(resolve(rootDir, `${pkg.name}.zip`), {store: true})
  zip.directory(buildDir, false)
  await zip.finalize()

  // remove build folder
  removeSync(buildDir)
}

const resolveDependencies = async (dependencies, localPkgs = []) => {
  const deps = []

  for (const dep in dependencies) {
    const localPkg = localPkgs.find(pkg => pkg.name === dep)

    if (localPkg) {
      deps.push(dep)
      deps.push(...(await resolveDependencies(localPkg.dependencies, localPkgs)))
    } else {
      const moduleDeps = await new Promise(resolve =>
        ls(dep, dependencies[dep], true, obj => resolve(obj))
      )
      deps.push(...moduleDeps)
    }
  }

  return deps
}

main()
  .then(() => process.exit())
  .catch((e) => console.error(e) && process.exit(1))
