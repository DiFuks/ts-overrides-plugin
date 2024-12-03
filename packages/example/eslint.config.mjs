import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import * as parser from '@typescript-eslint/parser';
import plugin from 'ts-overrides-plugin';
import typescript from 'typescript';

const parserProgram = parser.createProgram('tsconfig.json');
const host = typescript.createCompilerHost(parserProgram.getCompilerOptions());
const originalProgram = typescript.createProgram(parserProgram.getRootFileNames(), parserProgram.getCompilerOptions(), host);
const pluginProgram = plugin(originalProgram, host, {
	"ignores": ["src/ignored/**/*.{ts,tsx}"],
	"overrides": [
		{
			"files": [
				"src/modern/**/*.{ts,tsx}",
			],
			"compilerOptions": {
				"strict": true,
			},
		},
	]
}, { ts: typescript });

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				programs: [pluginProgram],
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: ['dist', '*.config.*'],
	}
);
