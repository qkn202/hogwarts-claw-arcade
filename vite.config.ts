import { defineConfig } from 'vite'
export default defineConfig({ base: './', build: { outDir: 'dist', chunkSizeWarningLimit: 800, target: ['es2020', 'safari16'] } })
