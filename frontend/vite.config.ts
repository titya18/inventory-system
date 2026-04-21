import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: '/inventory/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-mui': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'vendor-radix': [
            '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-avatar',
            '@radix-ui/react-dropdown-menu', '@radix-ui/react-label', '@radix-ui/react-popover',
            '@radix-ui/react-progress', '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area',
            '@radix-ui/react-slot',
          ],
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          'vendor-socket': ['socket.io-client'],
          'vendor-date': ['dayjs', 'date-fns'],
          'vendor-motion': ['framer-motion'],
          'vendor-misc': ['zustand', 'axios', 'xlsx', 'sweetalert2', 'antd', 'lucide-react'],
          'vendor-canvas': ['html2canvas'],
        },
      },
    },
  },
});
