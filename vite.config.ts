import * as path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	build: {
		sourcemap: true,
		ssr: true,
		target: 'node16',
		lib: {
			formats: ['es'],
			entry: path.resolve(__dirname, 'src/index.ts'),
			fileName: 'index',
		},
	},
	plugins: [tsconfigPaths()],
	test: {
		coverage: {
			enabled: true,
			include: ['src'],
		},
	},
});
