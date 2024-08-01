# ts-overrides-plugin

A plugin for `TypeScript` that allows overriding `tsconfig` for specific files

[![typedoc-theme-hierarchy (latest)](https://img.shields.io/npm/v/ts-overrides-plugin)](https://www.npmjs.com/package/ts-overrides-plugin)
[![typedoc-theme-hierarchy (downloads)](https://img.shields.io/npm/dw/ts-overrides-plugin)](https://www.npmjs.com/package/ts-overrides-plugin)
[![typedoc-theme-hierarchy (stars)](https://img.shields.io/github/stars/difuks/ts-overrides-plugin?style=social)](https://github.com/DiFuks/ts-overrides-plugin)

## Why is it needed?

The plugin partially addresses [this issue](https://github.com/microsoft/TypeScript/issues/33407).

The most popular use case is migrating a project from `strict: false` to `strict: true`, but it can also be used for
any other cases where you need to override the `tsconfig` settings for specific files.

## What can it do?

- Override diagnostics for files in the `IDE`
- Override type hints when hovering over variables in the `IDE`
- Override diagnostics for files in `webpack`, `tsc`, and other builders that use `ts-patch`


## Known issues

- Paths in `tsconfig` should not start with `./`
- The plugin does not work in `WebStorm` when using `yarn pnp` and workspaces ([see issue](https://youtrack.jetbrains.com/issue/WEB-67907/TypeScript-plugins-do-not-work-with-yarn-pnp) and [workaround](https://youtrack.jetbrains.com/issue/WEB-67907/TypeScript-plugins-do-not-work-with-yarn-pnp#focus=Comments-27-10253640.0-0))
- Some issues may be caused by incompatibility of the latest TypeScript version with ts-patch. For example: [issue](https://github.com/nonara/ts-patch/issues/152), [issue](https://github.com/nonara/ts-patch/issues/140), [issue](https://github.com/nonara/ts-patch/issues/159)
- Memory leaks are possible with a very large number of files (> 3000)

## Installation and setup

Examples can be seen in the [`example`](https://github.com/DiFuks/ts-overrides-plugin/tree/main/packages/example) folder.
Specially for `TS4`, a separate [`example`](https://github.com/DiFuks/ts-overrides-plugin/tree/main/packages/example-ts4) folder.
Specially for `TS3`, a separate [`example`](https://github.com/DiFuks/ts-overrides-plugin/tree/main/packages/example-ts3) folder.

### For using the plugin only in the IDE

Execute in the terminal:
```bash
yarn add -D ts-overrides-plugin
```

In the `tsconfig.json` file, add:
```json5
{
  "compilerOptions": {
    "strict": false, // Default settings
    "plugins": [
      {
        "name": "ts-overrides-plugin",
        "overrides": [
            {
              "files": ["src/modern/**/*.{ts,tsx}"], // Path to files (glob) for which settings need to be overridden. Should not start with './'
              "compilerOptions": { // Settings for these files
                "strict": true
              }
            },
            {
              "files": ["src/legacy/**/*.{ts,tsx}"],
              "compilerOptions": { // Settings are inherited only from the default settings
                "strict": true,
                "strictNullChecks": false
              }
            }
        ]
      }
    ]
  }
}
```

### For use in `webpack`, `tsc`

For the plugin to work correctly in `webpack`, `tsc`, it's necessary to use the [`ts-patch`](https://github.com/nonara/ts-patch) library.

Execute in the terminal:

```bash
yarn add -D ts-overrides-plugin ts-patch # For TS5
yarn add -D ts-overrides-plugin ts-patch@2.1.0 # For TS4
yarn add -D ts-overrides-plugin ts-patch@1.4.5 # For TS3
```

In the `tsconfig.json` file, add:

```json5
{
  "compilerOptions": {
    "strict": false, // Default settings
    "plugins": [
      {
        "name": "ts-overrides-plugin",
        "transform": "ts-overrides-plugin",
        "transformProgram": true,
        "overrides": [
          {
            "files": ["src/modern/**/*.{ts,tsx}"], // Path to files (glob) for which settings need to be overridden. Should not start with './'
            "compilerOptions": { // Settings for these files
              "strict": true,
            },
          },
          {
            "files": ["src/legacy/**/*.{ts,tsx}"],
            "compilerOptions": { // Settings are inherited only from the default settings
              "strict": true,
              "strictNullChecks": false
            }
          }
        ]
      }
    ]
  }
}
```

If you are using [`Persistent Patch`](https://github.com/nonara/ts-patch?tab=readme-ov-file#method-2-persistent-patch)
with `ts-patch` (`yarn ts-patch install`), then there is nothing more to do.

For `TypesSript 3` and `TypesSript 4` version, it is possible to use only the Persistent Patch option with.

If, however, you are using [`Live Compiler`](https://github.com/nonara/ts-patch?tab=readme-ov-file#method-1-live-compiler) (Only `TypeScript 5`,
the following steps are necessary):

For the `tsc` command – replace it with `tspc` in `package.json`:

```json5
{
  "scripts": {
    "build": "tspc"
  }
}
```

For `ForkTsCheckerWebpackPlugin` in the `webpack.config.js` file, add:

```js
const path = require('path');

module.exports = {
	plugins: [
		new ForkTsCheckerWebpackPlugin({
			typescript: {
				typescriptPath: require.resolve('ts-patch/compiler'),
			}
		}),
	],
};
```

For `ts-loader` in the `webpack.config.js` file, add:

```js
const path = require('path');

module.exports = {
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				loader: 'ts-loader',
				options: {
					compiler: require.resolve('ts-patch/compiler'),
				}
			},
		],
	},
};
```
