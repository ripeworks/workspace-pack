import test from 'ava'
import resolveDependencies from '../lib/resolveDependencies'

test('does not include devDeps', async t => {
  const deps = {
    'koa': '^2.5.2'
  }

  const resolved = await resolveDependencies(deps)

  // eslint is a devDependency
  t.falsy(resolved.find(d => d.split('@').shift() === 'eslint'))
})

test('resolves local deps', async t => {
  const deps = {
    'koa': '^2.5.2',
    'something-local': '0.0.1'
  }

  const localDeps = [{
    name: 'something-local',
    dependencies: {
      'query-string': '^6.1.0'
    }
  }]

  const resolved = await resolveDependencies(deps, localDeps)

  t.truthy(resolved.find(d => d.split('@').shift() === 'query-string'))
  t.truthy(resolved.find(d => d.split('@').shift() === 'decode-uri-component'))
})
