import { globSync } from 'glob';
import hash from 'object-hash';
import type ts from 'typescript';

export interface Override {
  files: string[];
  compilerOptions: ts.CompilerOptions;
}

export interface OverrideWithProgram extends Override {
  program: ts.Program;
}

interface OverridesByFile {
  [file: string]: {
    compilerOptions: ts.CompilerOptions;
    hash: string;
  };
}

interface OverridesByHash {
  [hash: string]: Override;
}

interface Params {
  overridesFromConfig: Override[];
  defaultCompilerOptions: ts.CompilerOptions;
  rootPath: string;
}

export const getOverrides = ({
  overridesFromConfig,
  rootPath,
  defaultCompilerOptions,
}: Params): Override[] => {
  const overridesByFile: OverridesByFile = {};
  const overridesByHash: OverridesByHash = {};

  overridesFromConfig.forEach((override) => {
    const files = globSync(override.files, {
      cwd: rootPath,
      absolute: true,
    });

    files.forEach((file) => {
      const existingOptions = overridesByFile[file]?.compilerOptions || defaultCompilerOptions;

      const newCompilerOptions = {
        ...existingOptions,
        ...override.compilerOptions,
      };

      overridesByFile[file] = {
        compilerOptions: newCompilerOptions,
        hash: hash(newCompilerOptions),
      };
    });
  });

  Object.entries(overridesByFile).forEach(([file, { hash: hashValue, compilerOptions }]) => {
    const files = overridesByHash[hashValue]?.files || [];

    overridesByHash[hashValue] = {
      files: [...files, file],
      compilerOptions,
    };
  });

  return Object.values(overridesByHash);
};

interface OverrideWithProgramParams extends Params {
  ts: typeof ts;
}

export const getOverridesWithProgram = (
  params: OverrideWithProgramParams
): OverrideWithProgram[] => {
  const overrides = getOverrides(params);

  return overrides.map((override) => {
    const program = params.ts.createProgram(override.files, override.compilerOptions);

    return {
      ...override,
      program,
    };
  });
};
