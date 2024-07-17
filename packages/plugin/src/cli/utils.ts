import path from 'node:path';
import outmatch from 'outmatch';
import type ts from 'typescript';

import { type Override } from '../types/Override';

const getOverrideProgram = (
	rootPath: string,
	typescript: typeof ts,
	override: Override,
	filesToOriginalDiagnostic: string[],
	defaultCompilerOptions: ts.CompilerOptions,
	host?: ts.CompilerHost,
): {
	overrideProgram: ts.Program;
	filesToCurrentOverrideDiagnostic: string[];
} => {
	const isMatch = outmatch(override.files);
	const filesToCurrentOverrideDiagnostic: string[] = filesToOriginalDiagnostic.filter(fileName =>
		isMatch(path.relative(rootPath, fileName)),
	);

	const overrideProgram = typescript.createProgram(
		filesToCurrentOverrideDiagnostic,
		{
			...defaultCompilerOptions,
			...typescript.convertCompilerOptionsFromJson(override.compilerOptions, rootPath).options,
		},
		host,
	);

	return { overrideProgram, filesToCurrentOverrideDiagnostic };
};

export const getDiagnosticsForProject = (
	program: ts.Program,
	overridePrograms: OverridePrograms,
	cancellationToken?: ts.CancellationToken,
): ts.Diagnostic[] => {
	const resultDiagnostic: ts.Diagnostic[] = overridePrograms.resultOverrides.flatMap(override =>
		override
			.getRootFileNames()
			.flatMap(fileName => override.getSemanticDiagnostics(override.getSourceFile(fileName), cancellationToken)),
	);

	const originalDiagnostics = overridePrograms.filesToOriginalDiagnostic.flatMap(fileName => {
		const sourceFile = program.getSourceFile(fileName);

		return sourceFile ? program.getSemanticDiagnostics(sourceFile, cancellationToken) : [];
	});

	return [...resultDiagnostic, ...originalDiagnostics];
};

export const getOverridePrograms = (
	rootPath: string,
	typescript: typeof ts,
	overridesFromConfig: Override[],
	rootFileNames: readonly string[],
	defaultCompilerOptions: ts.CompilerOptions,
	host?: ts.CompilerHost,
): {
	resultOverrides: ts.Program[];
	filesToOriginalDiagnostic: string[];
} => {
	let filesToOriginalDiagnostic: string[] = [...rootFileNames];

	const resultOverrides: ts.Program[] = overridesFromConfig.map(override => {
		const { overrideProgram, filesToCurrentOverrideDiagnostic } = getOverrideProgram(
			rootPath,
			typescript,
			override,
			filesToOriginalDiagnostic,
			defaultCompilerOptions,
			host,
		);

		filesToOriginalDiagnostic = filesToOriginalDiagnostic.filter(
			fileName => !filesToCurrentOverrideDiagnostic.includes(fileName),
		);

		return overrideProgram;
	});

	return { resultOverrides, filesToOriginalDiagnostic };
};

export interface OverridePrograms {
	filesToOriginalDiagnostic: string[];
	resultOverrides: ts.Program[];
}

export const getDiagnosticForFile = (
	overridePrograms: OverridePrograms,
	target: ts.Program,
	sourceFile: ts.SourceFile,
	method: 'getSemanticDiagnostics' | 'getBindAndCheckDiagnostics',
	cancellationToken?: ts.CancellationToken,
): readonly ts.Diagnostic[] => {
	const { fileName } = sourceFile;

	if (overridePrograms.filesToOriginalDiagnostic.includes(fileName)) {
		return target[method](sourceFile, cancellationToken);
	}

	const overrideProgramForFile = overridePrograms.resultOverrides.find(overrideProgram =>
		overrideProgram.getRootFileNames().includes(fileName),
	);

	return overrideProgramForFile
		? overrideProgramForFile[method](sourceFile, cancellationToken)
		: target[method](sourceFile, cancellationToken);
};
