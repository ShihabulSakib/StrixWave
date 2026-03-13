import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  plugins: [
    react(),
    sourceIdentifierPlugin({
      enabled: !isProd,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })
  ],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "buffer": require.resolve("buffer/"),
      "stream": require.resolve("stream-browserify"),
      "events": require.resolve("events")
    },
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  }
})
