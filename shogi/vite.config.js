import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        base: mode === 'production' ? '/myGames/shogi/' : '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
            // やねうら王の pthread worker(?url import)が data: URL に
            // インライン化されると opaque origin になり、COEP 下で
            // importScripts が NetworkError になるため無効化する
            assetsInlineLimit: 0,
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
            // UMD 形式のため esbuild の CJS→ESM 変換に載せる(exclude すると
            // 素の UMD が ESM として配信され export が空になる)
            include: ['@mizarjp/yaneuraou.k-p'],
        },
        worker: {
            format: 'es',
        },
    };
});
