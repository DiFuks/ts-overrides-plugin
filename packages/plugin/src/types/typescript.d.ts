import { type Diagnostic, type SourceFile } from 'typescript';

declare module 'typescript' {
	namespace ts {
		interface Program {
			getBindAndCheckDiagnostics(sourceFile: SourceFile, cancellationToken?: CancellationToken): Diagnostic[];
		}
	}

	export = ts;
}
