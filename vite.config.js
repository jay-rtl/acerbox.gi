import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } },
  },
  server: {
    host: '127.0.0.1',
    watch: { ignored: ['**/.local/**', '**/backend/**'] },
    fs: { deny: ['**/.env*', '**/.git/**', '**/.local/**', '**/backend/**', '**/tests/**', '**/scripts/**'] },
    proxy: { '/api': `http://127.0.0.1:${process.env.ACERBOX_LOCAL_API_PORT === '8083' ? '8083' : '8080'}` },
  },
});
