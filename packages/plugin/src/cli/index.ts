import * as path from 'node:path';
import type { PluginConfig, ProgramTransformer } from 'ts-patch';
import type ts from 'typescript';

import { type Override } from '../types/Override';
import { getDiagnosticForFile, getDiagnosticsForProject, getOverridePrograms } from './utils';

interface CliPluginConfig extends PluginConfig {
	overrides: Override[];
}

const plugin: ProgramTransformer = (program, host, pluginConfig, extras) => {
	const { overrides: overridesFromConfig } = pluginConfig as CliPluginConfig;
	const { plugins, ...defaultCompilerOptions } = program.getCompilerOptions();
	const sortedOverridesFromConfig = [...overridesFromConfig].reverse();
	const rootPath = defaultCompilerOptions.project ? path.dirname(defaultCompilerOptions.project) : process.cwd();

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
						cancellationToken,
					)) as ts.Program['getBindAndCheckDiagnostics'];
			}

			// for build mode
			// for watch mode - ts-loader
			if (property === `getSemanticDiagnostics`) {
				return ((sourceFile, cancellationToken) => {
					// for build ForkTsCheckerWebpackPlugin and tspc
					if (!sourceFile) {
						return getDiagnosticsForProject(target, overridePrograms, cancellationToken);
					}

					// for ts-loader - watch and build
					return getDiagnosticForFile(
						overridePrograms,
						target,
						sourceFile,
						`getSemanticDiagnostics`,
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
