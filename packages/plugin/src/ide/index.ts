import * as path from 'path';
import type ts from 'typescript/lib/tsserverlibrary';

import { getOverrides, Override } from '../utils/getOverrides';

interface IdePluginConfig {
  overrides: Override[];
}

const plugin: ts.server.PluginModuleFactory = ({ typescript }) => {
  function create(info: ts.server.PluginCreateInfo) {
    const { overrides: overridesFromConfig } = info.config as IdePluginConfig;
    const defaultCompilerOptions = info.project.getCompilerOptions();
    const rootPath = path.dirname(info.project.getProjectName());

    const overrides = getOverrides({ overridesFromConfig, rootPath, defaultCompilerOptions });

    return new Proxy(info.languageService, {
      get(target, property) {
        if (property === 'getSemanticDiagnostics') {
          return (fileName: string) => {
            const overrideForFile = overrides.find((override) => {
              return override.files.includes(fileName);
            });

            if (overrideForFile) {
              const defaultProgram = target.getProgram();
              const sourceFile = defaultProgram?.getSourceFile(fileName);
              const program = typescript.createProgram([fileName], overrideForFile.compilerOptions);

              return program.getSemanticDiagnostics(sourceFile);
            }

            return target.getSemanticDiagnostics(fileName);
          };
        }

        return target[property as keyof ts.LanguageService];
      },
    });
  }

  return { create };
};

export = plugin;
