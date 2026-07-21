import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const isDisableHmr = process.env.DISABLE_HMR === 'true';
  
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // If HMR is disabled by the platform, set to false to completely shut down websocket connection attempts.
      // Otherwise, configure it dynamically to allow proper client connection.
      hmr: isDisableHmr ? false : {
        host: 'localhost',
        protocol: 'ws',
        port: 3000,
      },
    },
  };
});
