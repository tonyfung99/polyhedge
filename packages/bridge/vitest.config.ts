import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        pool: 'forks',  // Use forks instead of threads to avoid stack overflow on cleanup
        poolOptions: {
            forks: {
                singleFork: true,  // Run tests sequentially in a single fork
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: ['node_modules/', 'dist/', '**/*.test.ts', 'src/__tests__/**'],
        },
    },
});

