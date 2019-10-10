# workspace-pack

Create a deployable npm package when using Yarn workspaces

## Details

If you use Yarn's `workspaces` feature to manage a monorepo, but need to "pack" a single package into a deployable zip that resolves both local and remote dependencies, this might be the tool for you.

## Install

```
$ yarn global add workspace-pack
```

## Usage

```bash
# In your workspaces root dir
$ workspace-pack my-package-folder
```

## Options

| CLI arg       | Description                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------ |
| `--build-dir` | Specify where the prepared package is created before it is built and zipped. _Default: `_build`_ |
| `--output`    | Where to store the resulting .zip file. _Default: `${package.name}.zip`_                         |
