/* eslint-disable @typescript-eslint/no-unsafe-return,@typescript-eslint/no-explicit-any */
import type { ProgramTransformer } from 'ts-patch';
import type ts from 'typescript';

import cliPlugin from './cli';
import idePlugin from './ide';

type Plugin = {
	// For IDE plugins
	(...args: Parameters<ts.server.PluginModuleFactory>): ReturnType<ts.server.PluginModuleFactory>;
	// For CLI plugins
	(...args: Parameters<ProgramTransformer>): ReturnType<ProgramTransformer>;
};

const plugin: Plugin = (...args: unknown[]) => {
	if (args.length === 1) {
		return idePlugin(...(args as Parameters<ts.server.PluginModuleFactory>)) as any;
	}

	return cliPlugin(...(args as Parameters<ProgramTransformer>)) as any;
};

export = plugin;
