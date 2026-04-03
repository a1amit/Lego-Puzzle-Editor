import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rolldownOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('node_modules/react-dom'))
                        return 'vendor-react';
                    if (id.includes('node_modules/react/'))
                        return 'vendor-react';
                    if (id.includes('node_modules/three') || id.includes('node_modules/@react-three'))
                        return 'vendor-three';
                    if (id.includes('node_modules/monaco-editor'))
                        return 'vendor-monaco';
                    if (id.includes('node_modules/zustand') || id.includes('node_modules/zod'))
                        return 'vendor-utils';
                    if (id.includes('node_modules/react-router') || id.includes('node_modules/@clerk'))
                        return 'vendor-router-auth';
                },
            },
        },
    },
});
