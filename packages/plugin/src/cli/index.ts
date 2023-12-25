import type { PluginConfig } from 'ts-patch';
import fs from 'node:fs';
import { ProgramTransformerExtras, TransformerPlugin } from 'ts-patch/plugin-types';
import { globSync } from 'glob';
import type { CancellationToken, CompilerOptions, Program, SourceFile } from 'typescript';
import * as path from 'path';

interface Override {
  files: string[];
  compilerOptions: CompilerOptions;
}

interface CliPluginConfig extends PluginConfig {
  overrides: Override[];
}

export default function (program: Program, host: any, pluginConfig: CliPluginConfig, extras: ProgramTransformerExtras): Program {
  const {overrides} = pluginConfig;
  const defaultCompilerOptions = program.getCompilerOptions();
  const rootPath = defaultCompilerOptions.project ? path.dirname(defaultCompilerOptions.project) : process.cwd();

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
      program: extras.ts.createProgram(files, {
        ...defaultCompilerOptions,
        ...override.compilerOptions,
      }),
    }
  });

  return new Proxy(program, { get: (target, p, receiver) => {
    if (p === 'getSemanticDiagnostics') {
      return (sourceFile: SourceFile, cancellationToken?: CancellationToken) => {
        const originalDiagnostics = target.getSemanticDiagnostics(sourceFile, cancellationToken);

        // for ForkTsCheckerWebpackPlugin and tspc
        if (!sourceFile) {
          const overridesDiagnostics = overridesWithProgram.flatMap((override) => {
            cancellationToken?.throwIfCancellationRequested();

            return override.files.flatMap((file) => {
              cancellationToken?.isCancellationRequested();

              const sourceFile = override.program.getSourceFile(file);

              if (!sourceFile) {
                return [];
              }

              return override.program.getSemanticDiagnostics(sourceFile);
            });
          });

          return [...originalDiagnostics, ...overridesDiagnostics];
        }

        // for ts-loader
        const override = overridesWithProgram.find((override) => {
          return override.files.includes(sourceFile.fileName);
        });

        if (override) {
          return override.program.getSemanticDiagnostics(sourceFile);
        }

        return originalDiagnostics;
      }
    }


    return target[p as keyof Program];
  }});
}


