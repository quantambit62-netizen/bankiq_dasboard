import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
//import tailwindcss from "tailwindcss"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  server: {
    proxy: {
      '/run-job': {
        target: 'http://15.207.8.159:8502',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/status': {
        target: 'http://15.207.8.159:8502',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
})
