import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					loadTypeScriptPlugins: true,
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		ignores: ['dist', '*.config.*'],
	}
);
