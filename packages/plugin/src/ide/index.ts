import { relative } from 'node:path';
import outmatch from 'outmatch';
import type ts from 'typescript/lib/tsserverlibrary';

import type { Override } from '../types/Override';

type IsMatch = (fileName: string) => boolean;

type OverrideLanguageService = [IsMatch, ts.LanguageService];

interface IdePluginConfig {
	overrides?: Override[];
	ignores?: string[];
}

const getOverrideLanguageServices = (
	typescript: typeof ts,
	overridesFromConfig: Override[],
	project: ts.server.Project,
	docRegistry: ts.DocumentRegistry,
): OverrideLanguageService[] =>
	[...overridesFromConfig].reverse().map(override => {
		const match = outmatch(override.files);

		const overrideLanguageServiceHost: ts.LanguageServiceHost = {
			fileExists: path => project.fileExists(path),
			getCurrentDirectory: () => project.getCurrentDirectory(),
			getDefaultLibFileName: () => project.getDefaultLibFileName(),
			getScriptSnapshot: fileName => project.getScriptSnapshot(fileName),
			getScriptVersion: fileName => project.getScriptVersion(fileName),
			readFile: path => project.readFile(path),
			getCompilationSettings: () => ({
				...project.getCompilationSettings(),
				...typescript.convertCompilerOptionsFromJson(override.compilerOptions, project.getCurrentDirectory())
					.options,
			}),
			getScriptFileNames: () => project.getScriptFileNames(),
		};

		const languageService = typescript.createLanguageService(overrideLanguageServiceHost, docRegistry);
		const isMatch = (fileName: string): boolean => match(relative(project.getCurrentDirectory(), fileName));

		return [isMatch, languageService];
	});

const getLanguageServiceForFile = (
	fileName: string,
	overridesInfo: OverrideLanguageService[],
	originalLanguageService: ts.LanguageService,
): ts.LanguageService => {
	const overrideForFile = overridesInfo.find(([isMatch]) => isMatch(fileName))?.[1];

	if (overrideForFile) {
		return overrideForFile;
	}

	return originalLanguageService;
};

const plugin: ts.server.PluginModuleFactory = ({ typescript }) => ({
	create: info => {
		const { overrides: overridesFromConfig = [], ignores } = info.config as IdePluginConfig;
		const ignoresMatcher = ignores ? outmatch(ignores) : null;

		const docRegistry = typescript.createDocumentRegistry();

		const overrideLanguageServices = getOverrideLanguageServices(
			typescript,
			overridesFromConfig,
			info.project,
			docRegistry,
		);

		const originalLanguageServiceWithDocRegistry = typescript.createLanguageService(info.project, docRegistry);

		return new Proxy(originalLanguageServiceWithDocRegistry, {
			get: (target, property: keyof ts.LanguageService) => {
				if (property === `getQuickInfoAtPosition`) {
					return ((fileName, position) => {
						const overrideForFile = getLanguageServiceForFile(fileName, overrideLanguageServices, target);

						return overrideForFile.getQuickInfoAtPosition(fileName, position);
					}) as ts.LanguageService['getQuickInfoAtPosition'];
				}

				if (property === `getSemanticDiagnostics`) {
					return (fileName => {
						if (ignoresMatcher?.(relative(info.project.getCurrentDirectory(), fileName))) {
							return [];
						}

						const overrideForFile = getLanguageServiceForFile(fileName, overrideLanguageServices, target);

						return overrideForFile.getSemanticDiagnostics(fileName);
					}) as ts.LanguageService['getSemanticDiagnostics'];
				}

				return target[property as keyof ts.LanguageService];
			},
		});
	},
});

export = plugin;
