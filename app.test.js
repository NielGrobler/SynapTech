// app.test.js
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import https from 'https';
import fs from 'fs';
import router from './router.js';

let server;
const port = 3001;

// Bypass self-signed cert for local HTTPS in tests
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

beforeAll(async () => {
	const sslOptions = {
		key: fs.readFileSync('server.key'),
		cert: fs.readFileSync('server.cert')
	};

	await new Promise((resolve, reject) => {
		server = https.createServer(sslOptions, router).listen(port, (err) => {
			if (err) reject(err);
			else resolve();
		});
	});
});

afterAll(async () => {
	await new Promise((resolve) => {
		server.close(() => resolve());
	});
});

describe('App HTTPS server tests', () => {
	it('should respond on root route', async () => {
		const res = await fetch(`https://localhost:${port}/`);
		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toMatch(/.+/); // or more specific match depending on your response
	});
});
