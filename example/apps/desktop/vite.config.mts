// Đuôi `.mts`, không phải `.ts`: package này không khai `"type": "module"`,
// nên Vite nạp `vite.config.ts` như CommonJS và cảnh báo về cú pháp ESM.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // Electron nạp file từ đĩa nên đường dẫn asset phải là tương đối.
  base: './',
  build: { outDir: 'dist/renderer' },
});
