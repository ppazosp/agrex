import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'mocks/index': 'src/mocks/index.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@xyflow/react'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
