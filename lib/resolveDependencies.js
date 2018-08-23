const { ls, config } = require('npm-remote-ls')
config({development: false, optional: false})

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

module.exports = resolveDependencies;
