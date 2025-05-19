
import fs from 'fs';
import path from 'path';

//import { Agent } from 'https';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import FormData from 'form-data';

import { QueryResult } from './query.js';

const { Agent } = require('https');

function decodeBase64(val) { //okay so this is for multiple different objects ???
	// Handle primitives
	if (val === null || val === undefined) return val;
	if (typeof val === 'number' || typeof val === 'boolean') return val;

	// Handle arrays
	if (Array.isArray(val)) {
		return val.map(decodeBase64);
	}

	// Handle objects
	if (typeof val === 'object') {
		const result = {};
		for (const key in val) {
		result[key] = decodeBase64(val[key]);
		}
		return result;
	}

	// Handle strings: try to decode as base64, fallback to original string if not valid JSON
	if (typeof val === 'string') {
		try {
		const decoded = Buffer.from(val, 'base64').toString('utf-8');
		// Try to parse as JSON, fallback to string if fails
		try {
			return JSON.parse(decoded);
		} catch {
			return decoded;
		}
		} catch {
		return val;
		}
	}

	return val;
	}

class QuerySender {
	constructor() {
		//const ca = fs.readFileSync(path.join(__dirname, 'server.crt'));

		this.agent = new Agent({
			//	ca: ca,
			rejectUnauthorized: false
		});

		this.url = `https://${process.env.DB_HOST}:${process.env.DB_PORT}/query`;
		this.apiKey = process.env.DB_API_KEY;
	}

	async send(query) {
		const response = await axios.post(this.url, {
			query: query.statement,
			params: query.params,
		}, {
			headers: {
				'X-API-Key': this.apiKey
			},
			httpsAgent: this.agent
		});

		return response;
	}

	async getResult(query) {
		const res = await this.send(query);

		return new QueryResult(decodeBase64(res.data));
	}
}

class FileStorageClient {
	constructor() {
		this.baseUrl = `https://${process.env.FILE_STORAGE_HOST}:${process.env.FILE_STORAGE_PORT}`;
		this.apiKey = process.env.FILE_STORAGE_API_KEY;

		//const ca = fs.readFileSync(path.join(__dirname, 'server.crt'));
		this.agent = new Agent({
			//ca: ca,
			rejectUnauthorized: false
		});
	}

	async uploadFile(fileBuffer, filename) {
		console.log("[FileStorageClient] Uploading file...");

		const fileBufferHydrated = Buffer.from(fileBuffer);
		const fileType = await fileTypeFromBuffer(fileBufferHydrated);
		const mimeType = fileType?.mime;

		const form = new FormData();
		form.append('file', fileBufferHydrated, {
			filename,
			contentType: mimeType,
		});

		const response = await axios.post(`${this.baseUrl}/upload`, form, {
			headers: {
				...form.getHeaders(),
				'X-API-Key': this.apiKey,
			},
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
			httpsAgent: this.agent,
		});

		return response.data;
	}

	extractFilename(contentDisposition) {
		if (!contentDisposition) {
			return null;
		}

		const match = contentDisposition.match(/filename="?(.+?)"?$/);
		return match ? match[1] : null;
	}

	async downloadFile(fileUuid, ext) {
		console.log("[Downloading file]...");
		console.log(fileUuid);
		const response = await axios.get(`${this.baseUrl}/download/${fileUuid}.${ext}`, {
			responseType: 'arraybuffer',
			headers: {
				'X-API-Key': this.apiKey,
			},
			httpsAgent: this.agent,
		});

		return {
			buffer: response.data,
			contentType: response.headers['content-type'],
			filename: this.extractFilename(response.headers['content-disposition']),
		};
	}


	async sendBatch(batchReq) {
		const res = await axios.post(`${this.baseUrl}/batch/`, {
			items: this.items
		}, {
			headers: {
				'X-API-Key': this.apiKey,
				'Content-Type': 'application/json',
			},
			maxContentLength: Infinity,
			maxBodyLength: Infinity,
			httpsAgent: this.agent,
		});

		return res.data;
	}
}

export {
	QuerySender,
	FileStorageClient,
	decodeBase64
}
