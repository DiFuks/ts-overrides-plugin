import * as path from 'node:path';
import outmatch from 'outmatch';
import type { PluginConfig, ProgramTransformer } from 'ts-patch';
import type ts from 'typescript';

import { type Override } from '../types/Override';

interface CliPluginConfig extends PluginConfig {
	overrides?: Override[];
	ignores?: string[];
}

type IsMatch = (fileName: string) => boolean;

type OverrideProgram = [IsMatch, ts.Program];

export const getOverridePrograms = (
	rootPath: string,
	typescript: typeof ts,
	overridesFromConfig: Override[],
	rootFileNames: readonly string[],
	defaultCompilerOptions: ts.CompilerOptions,
	host?: ts.CompilerHost,
): OverrideProgram[] =>
	overridesFromConfig.map(override => {
		const match = outmatch(override.files);
		const isMatch = (fileName: string): boolean => match(path.relative(rootPath, fileName));
		const program = typescript.createProgram(
			rootFileNames,
			{
				...defaultCompilerOptions,
				...typescript.convertCompilerOptionsFromJson(override.compilerOptions, rootPath).options,
			},
			host,
		);

		return [isMatch, program];
	});

export const getDiagnosticForFile = (
	overridePrograms: OverrideProgram[],
	target: ts.Program,
	sourceFile: ts.SourceFile,
	method: 'getSemanticDiagnostics' | 'getBindAndCheckDiagnostics',
	ignoreMatcher: ((fileName: string) => boolean) | null,
	cancellationToken?: ts.CancellationToken,
): readonly ts.Diagnostic[] => {
	if (ignoreMatcher?.(sourceFile.fileName)) {
		return [];
	}

	const { fileName } = sourceFile;

	const overrideProgramForFile = overridePrograms.find(([isMatch]) => isMatch(fileName))?.[1];

	return overrideProgramForFile
		? overrideProgramForFile[method](sourceFile, cancellationToken)
		: target[method](sourceFile, cancellationToken);
};

export const getDiagnosticsForProject = (
	program: ts.Program,
	overridePrograms: OverrideProgram[],
	ignoreMatcher: ((fileName: string) => boolean) | null,
	cancellationToken?: ts.CancellationToken,
): ts.Diagnostic[] =>
	program
		.getSourceFiles()
		.flatMap(sourceFile =>
			getDiagnosticForFile(
				overridePrograms,
				program,
				sourceFile,
				`getSemanticDiagnostics`,
				ignoreMatcher,
				cancellationToken,
			),
		);

const plugin: ProgramTransformer = (program, host, pluginConfig, extras) => {
	const { overrides: overridesFromConfig = [], ignores } = pluginConfig as CliPluginConfig;
	const { plugins, ...defaultCompilerOptions } = program.getCompilerOptions();
	const sortedOverridesFromConfig = [...overridesFromConfig].reverse();
	const rootPath = defaultCompilerOptions.project ? path.dirname(defaultCompilerOptions.project) : process.cwd();
	const ignoreMatcher = ignores ? (fileName: string) => outmatch(ignores)(path.relative(rootPath, fileName)) : null;

	const overridePrograms = getOverridePrograms(
		rootPath,
		extras.ts,
		sortedOverridesFromConfig,
		program.getRootFileNames(),
		defaultCompilerOptions,
		host,
	);

	return new Proxy(program, {
		get: (target, property: keyof ts.Program) => {
			// for watch mode - ForkTsCheckerWebpackPlugin and tspc
			if (property === `getBindAndCheckDiagnostics`) {
				return ((sourceFile, cancellationToken) =>
					getDiagnosticForFile(
						overridePrograms,
						target,
						sourceFile,
						`getBindAndCheckDiagnostics`,
						ignoreMatcher,
						cancellationToken,
					)) as ts.Program['getBindAndCheckDiagnostics'];
			}

			// for build mode
			// for watch mode - ts-loader
			if (property === `getSemanticDiagnostics`) {
				return ((sourceFile, cancellationToken) => {
					// for build ForkTsCheckerWebpackPlugin and tspc
					if (!sourceFile) {
						return getDiagnosticsForProject(target, overridePrograms, ignoreMatcher, cancellationToken);
					}

					// for ts-loader - watch and build
					return getDiagnosticForFile(
						overridePrograms,
						target,
						sourceFile,
						`getSemanticDiagnostics`,
						ignoreMatcher,
						cancellationToken,
					);
				}) as ts.Program['getSemanticDiagnostics'];
			}

			return target[property];
		},
	});
};

// eslint-disable-next-line import/no-default-export
export default plugin;
