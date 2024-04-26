import outmatch from 'outmatch';
import * as path from 'path';
import type { PluginConfig, ProgramTransformer } from 'ts-patch';
import ts from 'typescript';
import { Override } from '../types/Override';

interface CliPluginConfig extends PluginConfig {
  overrides: Override[];
}

const getOverridePrograms = (
  rootPath: string,
  typescript: typeof ts,
  overridesFromConfig: Override[],
  originalProgram: ts.Program,
  host?: ts.CompilerHost
) => {
  let filesToOriginalDiagnostic: string[] = [...originalProgram.getRootFileNames()];
  const { plugins, ...defaultCompilerOptions } = originalProgram.getCompilerOptions();

  const sortedOverrides = [...overridesFromConfig].reverse();

  const resultOverrides: ts.Program[] = [];

  for (const override of sortedOverrides) {
    const isMatch = outmatch(override.files);
    const filesToCurrentOverrideDiagnostic: string[] = [];

    for (const fileName of filesToOriginalDiagnostic) {
      const toOverrideDiagnostic = isMatch(path.relative(rootPath, fileName));

      if (toOverrideDiagnostic) {
        filesToCurrentOverrideDiagnostic.push(fileName);
      }
    }

    const overrideProgram = typescript.createProgram(
      filesToCurrentOverrideDiagnostic,
      {
        ...defaultCompilerOptions,
        ...override.compilerOptions,
      },
      host
    );
    resultOverrides.push(overrideProgram);

    filesToOriginalDiagnostic = filesToOriginalDiagnostic.filter(
      (fileName) => !filesToCurrentOverrideDiagnostic.includes(fileName)
    );
  }

  return { resultOverrides, filesToOriginalDiagnostic };
};

const getDiagnosticsForProject = (
  overridePrograms: ts.Program[],
  originalProgram: ts.Program,
  filesToOriginalDiagnostic: string[],
  cancellationToken?: ts.CancellationToken
): ts.Diagnostic[] => {
  const diagnostics: ts.Diagnostic[] = [];
  for (const overrideProgram of overridePrograms) {
    for (const rootFileName of overrideProgram.getRootFileNames()) {
      const sourceFile = overrideProgram.getSourceFile(rootFileName);

      const diagnosticsForOverride = overrideProgram.getSemanticDiagnostics(
        sourceFile,
        cancellationToken
      );

      diagnostics.push(...diagnosticsForOverride);
    }
  }

  for (const rootFileName of filesToOriginalDiagnostic) {
    if (filesToOriginalDiagnostic.includes(rootFileName)) {
      const sourceFile = originalProgram.getSourceFile(rootFileName);

      const diagnosticsForOriginal = originalProgram.getSemanticDiagnostics(
        sourceFile,
        cancellationToken
      );

      diagnostics.push(...diagnosticsForOriginal);
    }
  }

  return diagnostics;
};

let overridePrograms: {
  filesToOriginalDiagnostic: string[];
  resultOverrides: ts.Program[];
} | null = null;

const plugin: ProgramTransformer = (program, host, pluginConfig, extras) => {
  const { overrides: overridesFromConfig } = pluginConfig as CliPluginConfig;
  const { plugins, ...defaultCompilerOptions } = program.getCompilerOptions();
  const rootPath = defaultCompilerOptions.project
    ? path.dirname(defaultCompilerOptions.project)
    : process.cwd();
  overridePrograms = null;

  overridePrograms = getOverridePrograms(rootPath, extras.ts, overridesFromConfig, program, host);

  // Возвращать новую программу без файлов, которые подменяются оверрайдами
  return new Proxy(program, {
    get: (target, property: keyof ts.Program) => {
      if (property === 'getBindAndCheckDiagnostics') {
        return ((sourceFile, cancellationToken) => {
          const { fileName } = sourceFile;

          if (!overridePrograms || overridePrograms.filesToOriginalDiagnostic.includes(fileName)) {
            return target.getBindAndCheckDiagnostics(sourceFile, cancellationToken);
          }

          const overrideProgramForFile = overridePrograms?.resultOverrides.find(
            (overrideProgram) => {
              return overrideProgram.getRootFileNames().includes(fileName);
            }
          );

          return overrideProgramForFile
            ? overrideProgramForFile.getBindAndCheckDiagnostics(sourceFile, cancellationToken)
            : target.getBindAndCheckDiagnostics(sourceFile, cancellationToken);
        }) as ts.Program['getBindAndCheckDiagnostics'];
      }

      if (property === 'getSemanticDiagnostics') {
        return ((sourceFile, cancellationToken) => {
          if (!sourceFile) {
            overridePrograms = null;

            const overrideProgramsForBuild = getOverridePrograms(
              rootPath,
              extras.ts,
              overridesFromConfig,
              target,
              host
            );

            return getDiagnosticsForProject(
              overrideProgramsForBuild.resultOverrides,
              target,
              overrideProgramsForBuild.filesToOriginalDiagnostic,
              cancellationToken
            );
          }

          const { fileName } = sourceFile;

          if (!overridePrograms || overridePrograms.filesToOriginalDiagnostic.includes(fileName)) {
            return target.getSemanticDiagnostics(sourceFile, cancellationToken);
          }

          const overrideProgramForFile = overridePrograms?.resultOverrides.find(
            (overrideProgram) => {
              return overrideProgram.getRootFileNames().includes(fileName);
            }
          );

          return overrideProgramForFile
            ? overrideProgramForFile.getSemanticDiagnostics(sourceFile, cancellationToken)
            : target.getSemanticDiagnostics(sourceFile, cancellationToken);
        }) as ts.Program['getSemanticDiagnostics'];
      }

      return target[property];
    },
  });
};

export default plugin;
