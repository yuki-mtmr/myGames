import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    const env = loadEnv(mode, process.cwd(), '');

    return {
        base: mode === 'production' ? '/myGames/' : '/',
        build: {
            outDir: 'dist',
            assetsDir: 'assets',
            sourcemap: false,
        },
        define: {
            // Make env variables available at build time
            'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(env.VITE_GOOGLE_MAPS_API_KEY || ''),
        },
    };
});
