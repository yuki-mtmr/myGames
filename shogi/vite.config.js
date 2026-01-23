import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        base: mode === 'production' ? '/myGames/shogi/' : '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
        },
        server: {
            headers: {
                // Required for SharedArrayBuffer (YaneuraOu WASM)
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
            },
        },
        preview: {
            headers: {
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
            },
        },
        optimizeDeps: {
            exclude: ['@mizarjp/yaneuraou.k-p'],
        },
        worker: {
            format: 'es',
        },
    };
});
