import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		coverage: {
			reporter: ['text', 'html'], // show in terminal + generate HTML report
			exclude: ['**/node_modules/**', '**/tests/**', '**/public/**']
		},
	},
});

