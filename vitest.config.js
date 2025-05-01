import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom', // <-- Add this line
		coverage: {
			reporter: ['text', 'html'],
			exclude: ['**/node_modules/**', '**/tests/**', '**/public/**']
		}
	},
});
