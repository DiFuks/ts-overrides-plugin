import { relative } from 'node:path';
import outmatch from 'outmatch';
import type ts from 'typescript/lib/tsserverlibrary';

import type { Override } from '../types/Override';

interface IdePluginConfig {
	overrides?: Override[];
	ignores?: string[];
}

const getOverrideLanguageServices = (
	typescript: typeof ts,
	overridesFromConfig: Override[],
	project: ts.server.Project,
	docRegistry: ts.DocumentRegistry,
): ts.LanguageService[] =>
	[...overridesFromConfig].reverse().map(override => {
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
			getScriptFileNames: () => {
				const originalFiles = project.getScriptFileNames();
				const isMatch = outmatch(override.files);

				return originalFiles.filter(
					fileName =>
						fileName.endsWith(`.d.ts`) || isMatch(relative(project.getCurrentDirectory(), fileName)),
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
