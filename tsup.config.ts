import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'ir/index': 'src/ir/index.ts',
    'adapters/index': 'src/adapters/index.ts',
    'plugins/index': 'src/plugins/index.ts',
    'shared/index': 'src/shared/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['node:*'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  treeshake: true,
  minify: false,
});