process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import https from 'https';
import fs from 'fs';
import request from 'supertest';
import router from './router.js';
import './app.js'; // This ensures the file is loaded and instrumented for coverage


let server;

const sslOptions = {
	key: fs.readFileSync('server.key'),
	cert: fs.readFileSync('server.cert')
};

describe('HTTPS Server', () => {
	beforeAll(() => {
		server = https.createServer(sslOptions, router).listen(0); // use ephemeral port
	});

	afterAll(() => {
		server.close();
	});

	it('should respond to GET / with 302', async () => {
        const res = await request(server).get('/');
        expect(res.statusCode).toBe(302);
      });
      
});
