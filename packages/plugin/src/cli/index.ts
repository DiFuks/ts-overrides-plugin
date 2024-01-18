import * as path from 'path';
import type { PluginConfig, ProgramTransformer } from 'ts-patch';
import type ts from 'typescript';

import { getOverridesWithProgram, Override, OverrideWithProgram } from '../utils/getOverrides';

interface CliPluginConfig extends PluginConfig {
  overrides: Override[];
}

const getDiagnosticsForProject = (
  overridesWithProgram: OverrideWithProgram[],
  overridesFiles: string[],
  originalDiagnostics: readonly ts.Diagnostic[],
  cancellationToken?: ts.CancellationToken
) => {
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

  const originalDiagnosticsWithoutOverrides = originalDiagnostics.filter((originalDiagnostic) => {
    if (!originalDiagnostic.file) {
      return true;
    }

    return !overridesFiles.includes(originalDiagnostic.file.fileName);
  });

  return [...originalDiagnosticsWithoutOverrides, ...overridesDiagnostics];
};

const plugin: ProgramTransformer = (program, _, pluginConfig, extras) => {
  const { overrides: overridesFromConfig } = pluginConfig as CliPluginConfig;
  const defaultCompilerOptions = program.getCompilerOptions();
  const rootPath = defaultCompilerOptions.project
    ? path.dirname(defaultCompilerOptions.project)
    : process.cwd();

  const overridesWithProgram = getOverridesWithProgram({
    overridesFromConfig,
    rootPath,
    defaultCompilerOptions,
    ts: extras.ts,
  });

  const overridesFiles = overridesWithProgram.flatMap((override) => {
    return override.files;
  });

  return new Proxy(program, {
    get: (target, property) => {
      // for watch mode - ForkTsCheckerWebpackPlugin and tspc
      if (property === 'getBindAndCheckDiagnostics') {
        return (sourceFile: ts.SourceFile, cancellationToken?: ts.CancellationToken) => {
          // for ts-loader
          const overrides = overridesWithProgram.find((override) => {
            return override.files.includes(sourceFile.fileName);
          });

          if (overrides) {
            return overrides.program.getBindAndCheckDiagnostics(sourceFile, cancellationToken);
          }

          return target.getBindAndCheckDiagnostics(sourceFile, cancellationToken);
        };
      }

      // for build mode
      // for watch mode - ts-loader
      if (property === 'getSemanticDiagnostics') {
        return (sourceFile: ts.SourceFile, cancellationToken?: ts.CancellationToken) => {
          // for ForkTsCheckerWebpackPlugin and tspc
          if (!sourceFile) {
            const originalDiagnostics = target.getSemanticDiagnostics(sourceFile, cancellationToken);

            return getDiagnosticsForProject(
              overridesWithProgram,
              overridesFiles,
              originalDiagnostics,
              cancellationToken
            );
          }

          // for ts-loader
          const overrides = overridesWithProgram.find((override) => {
            return override.files.includes(sourceFile.fileName);
          });

          if (overrides) {
            return overrides.program.getSemanticDiagnostics(sourceFile, cancellationToken);
          }

          return target.getSemanticDiagnostics(sourceFile, cancellationToken);
        };
      }

      return target[property as keyof ts.Program];
    },
  });
};

export default plugin;
