import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        offscreen: 'src/offscreen/audio.html',
      },
    },
  },
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `${name}-${version}.zip` }),
  ],
  optimizeDeps: {
    exclude: [
      'lindera-wasm-ipadic',
    ],
  },
  server: {
    cors: {
      origin: [
        /chrome-extension:\/\//,
      ],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
