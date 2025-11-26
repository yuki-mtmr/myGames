import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        base: mode === 'production' ? '/myGames/shogi/' : '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
        },
    };
});
