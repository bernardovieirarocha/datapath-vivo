/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Caminho relativo: funciona no GitHub Pages em qualquer subpasta (/<repo>/).
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.test.ts'],
      thresholds: {
        'src/core/bits.ts': { 100: true },
        // Aceite da Fase 2: cobertura do core/mono ≥ 95%.
        'src/core/mono/**': { statements: 95, branches: 85, functions: 95, lines: 95 },
      },
    },
  },
});
