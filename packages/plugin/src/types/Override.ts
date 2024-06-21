import type ts from 'typescript/lib/tsserverlibrary';

export interface Override {
	files: string[];
	compilerOptions: ts.server.protocol.CompilerOptions;
}
