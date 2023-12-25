import ts from 'typescript/lib/tsserverlibrary';
import { globSync } from 'glob';
import path from 'path';
import fs from 'node:fs';

interface Override {
  files: string[];
  compilerOptions: ts.CompilerOptions;
}

interface IdePluginConfig {
  overrides: Override[];
}

function init({ typescript }: { typescript: typeof ts}) {
  function create(info: ts.server.PluginCreateInfo) {
    const { overrides } = info.config as IdePluginConfig;
    const defaultCompilerOptions = info.project.getCompilerOptions();
    const rootPath = path.dirname(info.project.getProjectName());

    const overridesWithProgram = overrides.map((override) => {
      const files = globSync(override.files, {
        cwd: rootPath,
        absolute: true,
      });

      return {
        files,
        options: {
          ...defaultCompilerOptions,
          ...override.compilerOptions,
        },
      }
    });

    return new Proxy(info.languageService, {
      get(target, p, receiver): any {
        if (p === 'getSemanticDiagnostics') {
          return (fileName: string) => {
            const override = overridesWithProgram.find((override) => {
              return override.files.includes(fileName);
            });

            if (override) {
              const defaultProgram = target.getProgram();
              const sourceFile = defaultProgram?.getSourceFile(fileName);
              const program = typescript.createProgram([fileName], override.options);

              return program.getSemanticDiagnostics(sourceFile);
            }

            return target.getSemanticDiagnostics(fileName);
          }
        }

        return target[p as keyof ts.LanguageService];
      }
    })
  }

  return { create };
}

export = init;