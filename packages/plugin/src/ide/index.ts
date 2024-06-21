import { relative } from 'node:path';
import outmatch from 'outmatch';
import type ts from 'typescript/lib/tsserverlibrary';

import { type Override } from '../types/Override';

interface IdePluginConfig {
	overrides: Override[];
}

const getOverrideLanguageServices = (
	typescript: typeof ts,
	overridesFromConfig: Override[],
	languageServiceHost: ts.LanguageServiceHost,
	docRegistry: ts.DocumentRegistry,
): ts.LanguageService[] =>
	[...overridesFromConfig].reverse().map(override => {
		const overrideLanguageServiceHost: ts.LanguageServiceHost = {
			fileExists: path => languageServiceHost.fileExists(path),
			getCurrentDirectory: (): string => languageServiceHost.getCurrentDirectory(),
			getDefaultLibFileName: (options: ts.CompilerOptions): string =>
				languageServiceHost.getDefaultLibFileName(options),
			getScriptSnapshot: fileName => languageServiceHost.getScriptSnapshot(fileName),
			getScriptVersion: fileName => languageServiceHost.getScriptVersion(fileName),
			readFile: (path, encoding) => languageServiceHost.readFile(path, encoding),
			getCompilationSettings: () => ({
				...languageServiceHost.getCompilationSettings(),
				...typescript.convertCompilerOptionsFromJson(
					override.compilerOptions,
					languageServiceHost.getCurrentDirectory(),
				).options,
			}),
			getScriptFileNames: () => {
				const originalFiles = languageServiceHost.getScriptFileNames();
				const isMatch = outmatch(override.files);

				return originalFiles.filter(fileName =>
					isMatch(relative(languageServiceHost.getCurrentDirectory(), fileName)),
				);
			},
		};

		return typescript.createLanguageService(overrideLanguageServiceHost, docRegistry);
	});

const getLanguageServiceForFile = (
	fileName: string,
	overrideLanguageServices: ts.LanguageService[],
	originalLanguageService: ts.LanguageService,
): ts.LanguageService => {
	const overrideForFile = overrideLanguageServices.find(
		override => override.getProgram()?.getRootFileNames().includes(fileName),
	);

	if (overrideForFile) {
		return overrideForFile;
	}

	return originalLanguageService;
};

const plugin: ts.server.PluginModuleFactory = ({ typescript }) => ({
	create: info => {
		const { overrides: overridesFromConfig } = info.config as IdePluginConfig;

		const docRegistry = typescript.createDocumentRegistry();

		const overrideLanguageServices = getOverrideLanguageServices(
			typescript,
			overridesFromConfig,
			info.languageServiceHost,
			docRegistry,
		);

		const originalLanguageServiceWithDocRegistry = typescript.createLanguageService(
			info.languageServiceHost,
			docRegistry,
		);

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
