import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'

function chromeExtension(): Plugin {
  return {
    name: 'chrome-extension',
    transformIndexHtml(html) {
      // Extension pages cannot load crossorigin module scripts.
      return html.replace(/\s+crossorigin(?:="[^"]*")?/g, '')
    },
    closeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json')
      copyFileSync('background.js', 'dist/background.js')
      mkdirSync('dist/icons', { recursive: true })
      for (const file of readdirSync('icons')) {
        if (!file.endsWith('.png')) continue
        copyFileSync(`icons/${file}`, `dist/icons/${file}`)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    chromeExtension(),
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: 'newtab.html',
      },
    },
  },
})
