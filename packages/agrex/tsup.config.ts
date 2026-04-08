import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'mocks/index': 'src/mocks/index.ts',
    'layout/force': 'src/layout/force.ts',
    'layout/dagre': 'src/layout/dagre.ts',
    'layout/elk': 'src/layout/elk.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@xyflow/react', 'd3-force', '@dagrejs/dagre', 'elkjs', 'elkjs/lib/elk.bundled.js'],
  esbuildOptions(options) {
    options.jsx = 'automatic'
  },
})
