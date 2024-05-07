# ts-overrides-plugin

Плагин для `TypeScript`, который позволяет переопределять `tsconfig` для определенных файлов

[![typedoc-theme-hierarchy (latest)](https://img.shields.io/npm/v/ts-overrides-plugin)](https://www.npmjs.com/package/ts-overrides-plugin)
[![typedoc-theme-hierarchy (downloads)](https://img.shields.io/npm/dw/ts-overrides-plugin)](https://www.npmjs.com/package/ts-overrides-plugin)
[![typedoc-theme-hierarchy (stars)](https://img.shields.io/github/stars/difuks/ts-overrides-plugin?style=social)](https://github.com/DiFuks/ts-overrides-plugin)

## Зачем нужен?

Самый популярный вариант использования – перевод проекта с `strict: false` на `strict: true`, но также подходит для
любых других случаев, когда нужно переопределить настройки `tsconfig` для определенных файлов.

## Что умеет?

- Переопределять диагностику для файлов в `IDE`
- Переопределять подсказки о типах при наведении на переменные в `IDE`
- Переопределять диагностику для файлов в `webpack`, `tsc` и других сборщиках, где можно использовать `ts-patch`

## Установка и настройка

Примеры можно увидеть в папке [`example`](https://github.com/DiFuks/ts-overrides-plugin/tree/main/packages/example).

### Для использования плагина только в IDE

Выполнить в терминале:
```bash
yarn add -D ts-overrides-plugin
```

В файле `tsconfig.json` добавить:
```json5
{
  "compilerOptions": {
    "strict": false, // Настройки по умолчанию
    "plugins": [
      {
        "name": "ts-overrides-plugin",
        "config": {
          "overrides": [
            {
              "files": ["src/modern/**/*.{ts,tsx}"], // Путь к файлам (glob), для которых нужно переопределить настройки. Не должен начинаться с './'
              "compilerOptions": { // Настройки для этих файлов
                "strict": true
              }
            },
            {
              "files": ["src/legacy/**/*.{ts,tsx}"],
              "compilerOptions": { // Настройки наследуются только от настроек по умолчанию
                "strict": true,
                "strictNullChecks": false
              }
            }
          ]
        }
      }
    ]
  }
}
```

### Для использования в `webpack`, `tsc`

Для корректной работы плагина в `webpack`, `tsc` необходимо использовать библиотеку [`ts-patch`](https://github.com/nonara/ts-patch).

Выполнить в терминале:

```bash
yarn add -D ts-overrides-plugin ts-patch
```

В файле `tsconfig.json` добавить:

```json5
{
  "compilerOptions": {
    "strict": false, // Настройки по умолчанию
    "plugins": [
      {
        "name": "ts-overrides-plugin",
        "transform": "ts-overrides-plugin/cli",
        "transformProgram": true,
        "overrides": [
          {
            "files": ["src/modern/**/*.{ts,tsx}"], // Путь к файлам (glob), для которых нужно переопределить настройки. Не должен начинаться с './'
            "compilerOptions": { // Настройки для этих файлов
              "strict": true,
            },
          },
          {
            "files": ["src/legacy/**/*.{ts,tsx}"],
            "compilerOptions": { // Настройки наследуются только от настроек по умолчанию
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

Если вы используете [`Persistent Patch`](https://github.com/nonara/ts-patch?tab=readme-ov-file#method-2-persistent-patch)
в `ts-patch`, то больше ничего делать не нужно, если же [`Live Compiler`](https://github.com/nonara/ts-patch?tab=readme-ov-file#method-1-live-compiler), то
необходимо выполнить следующие действия:

Для команды `tsc` – заменить на `tspc` в `package.json`:

```json5
{
  "scripts": {
    "build": "tspc"
  }
}
```

Для `ForkTsCheckerWebpackPlugin` в файле `webpack.config.js` добавить:

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

Для `ts-loader` в файле `webpack.config.js` добавить:

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

## Известные проблемы

- Пути в `tsconfig` не должны начинаться с `./`
- Плагин не работает в `WebStorm` при использовании `yarn pnp`
