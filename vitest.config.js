import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		reporters: ['verbose'],
		environment: 'jsdom', 
		setupFiles: './vitest.setup.js',
		coverage: {
			reporter: ['text', 'html'],
			exclude: [
				'**/node_modules/**', 
				'**/public/**', 
				'**/vitest.config.js', //js files that do not need to be tested since they are either irrelevant or unused
				'**/view_db.js',
				'**/working_query.js',
				'**/tempCodeRunnerFile.js',
			]
		}
	},
	
});
