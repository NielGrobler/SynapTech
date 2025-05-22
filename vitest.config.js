import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['verbose'],
		environment: 'jsdom', 
		setupFiles: './vitest.setup.js',
		coverage: {
			reporter: ['text', 'html'],
			exclude: ['**/node_modules/**', '**/tests/**', '**/public/**']
		}
	},
	
});
