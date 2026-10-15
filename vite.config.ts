import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base relativa: o build funciona no GitHub Pages (/consulta-clima/) e em qualquer subpasta.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
})
