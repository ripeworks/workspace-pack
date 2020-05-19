const { ls, config } = require('npm-remote-ls')
const path = require("path");
const fs = require("fs");
config({ development: false, optional: false })

const resolveDependencies = async (dependencies, localPkgs = [], localRepositories = []) => {
  console.log(localRepositories)
  const deps = []

  for (const dep in dependencies) {
    const localPkg = localPkgs.find(pkg => pkg.name === dep)

    if (localPkg) {
      deps.push(dep)
      deps.push(...(await resolveDependencies(localPkg.dependencies, localPkgs, localRepositories)))
    } else {
      const localDepPath = localRepositories.map(localRepo => path.join(localRepo, dep, "package.json")).find(localDepPath => fs.existsSync(localDepPath));

      const moduleDeps = localDepPath ? Object.keys(require(localDepPath).dependencies || {}) : await new Promise(resolve =>
        ls(dep, dependencies[dep], true, obj => resolve(obj))
      )

      deps.push(...(moduleDeps || []))
    }
  }

  return deps
}

module.exports = resolveDependencies;
