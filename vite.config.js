import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: 'icons/*.png',
          dest: 'icons',
        },
        {
          src: 'manifest.json',
          dest: '.',
        },
      ],
    }),
  ],
  build: {
    minify: false,
    outDir: 'dist/build',
    rollupOptions: {
      input: {
        popup: resolve(import.meta.dirname, 'src/tabsPopup.html'),
        background: resolve(import.meta.dirname, 'src/background.js'),
      },
      output: {
        entryFileNames: 'src/[name].js',
        chunkFileNames: 'src/[name].js',
        assetFileNames: 'src/[name].[ext]',
      },
    },
  },
});
