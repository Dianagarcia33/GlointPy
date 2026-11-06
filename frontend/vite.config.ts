import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const buildTimestamp = Date.now().toString();

const generateVersionPlugin = () => ({
  name: 'generate-version-file',
  buildStart() {
    try {
      const publicDir = path.resolve(__dirname, 'public');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(
        path.resolve(publicDir, 'version.json'),
        JSON.stringify({ version: buildTimestamp, builtAt: new Date().toISOString() }, null, 2)
      );
    } catch (err) {
      console.error('Error writing version.json:', err);
    }
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), generateVersionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(buildTimestamp),
  },
  build: {
    rollupOptions: {
      output: {
        // Librerías en archivos aparte: casi no cambian entre despliegues, así el navegador
        // las conserva en caché y solo vuelve a descargar el código propio de la app.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', 'zustand'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['motion'],
        },
      },
    },
  },
});
