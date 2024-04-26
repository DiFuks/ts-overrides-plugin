import type ts from 'typescript';

export interface Override {
	files: string[];
	compilerOptions: ts.CompilerOptions;
}
