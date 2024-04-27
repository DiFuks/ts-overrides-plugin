import outmatch from 'outmatch';
import * as path from 'path';
import type ts from 'typescript/lib/tsserverlibrary';

import { Override } from '../types/Override';

interface IdePluginConfig {
  overrides: Override[];
}

const getOverrideLanguageServices = (
  typescript: typeof ts,
  overridesFromConfig: Override[],
  languageServiceHost: ts.LanguageServiceHost,
  docRegistry: ts.DocumentRegistry
) => {
  return [...overridesFromConfig].reverse().map((override) => {
    return typescript.createLanguageService(
      new Proxy(languageServiceHost, {
        get(target, property: keyof ts.LanguageServiceHost) {
          if (property === 'getScriptFileNames') {
            return (() => {
              const originalFiles = target.getScriptFileNames();
              const isMatch = outmatch(override.files);

              return originalFiles.filter((fileName) =>
                isMatch(path.relative(target.getCurrentDirectory(), fileName))
              );
            }) as ts.LanguageServiceHost['getScriptFileNames'];
          }

          if (property === 'getCompilationSettings') {
            return (() => {
              return {
                ...target.getCompilationSettings(),
                ...override.compilerOptions,
              };
            }) as ts.LanguageServiceHost['getCompilationSettings'];
          }

          return target[property as keyof ts.LanguageServiceHost];
        },
      }),
      docRegistry
    );
  });
};

const getLanguageServiceForFile = (
  fileName: string,
  overrideLanguageServices: ts.LanguageService[],
  originalLanguageService: ts.LanguageService
) => {
  const overrideForFile = overrideLanguageServices.find((override) => {
    return override.getProgram()?.getRootFileNames().includes(fileName);
  });

  if (overrideForFile) {
    return overrideForFile;
  }

  return originalLanguageService;
};

const plugin: ts.server.PluginModuleFactory = ({ typescript }) => {
  return {
    create: (info) => {
      const { overrides: overridesFromConfig } = info.config as IdePluginConfig;

      const docRegistry = typescript.createDocumentRegistry();

      const overrideLanguageServices = getOverrideLanguageServices(
        typescript,
        overridesFromConfig,
        info.languageServiceHost,
        docRegistry
      );

      const originalLanguageServiceWithDocRegistry = typescript.createLanguageService(
        info.languageServiceHost,
        docRegistry
      );

      return new Proxy(originalLanguageServiceWithDocRegistry, {
        get(target, property: keyof ts.LanguageService) {
          if (property === 'getQuickInfoAtPosition') {
            return ((fileName, position) => {
              const overrideForFile = getLanguageServiceForFile(
                fileName,
                overrideLanguageServices,
                target
              );

              return overrideForFile.getQuickInfoAtPosition(fileName, position);
            }) as ts.LanguageService['getQuickInfoAtPosition'];
          }

          if (property === 'getSemanticDiagnostics') {
            return ((fileName) => {
              const overrideForFile = getLanguageServiceForFile(
                fileName,
                overrideLanguageServices,
                target
              );

              return overrideForFile.getSemanticDiagnostics(fileName);
            }) as ts.LanguageService['getSemanticDiagnostics'];
          }

          return target[property as keyof ts.LanguageService];
        },
      });
    },
  };
};

export = plugin;
