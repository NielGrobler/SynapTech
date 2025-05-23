import { describe, it, expect } from 'vitest';
import BatchRequest from './batch.js';

describe('BatchRequest', () => {
	it('should initialize with an empty items array', () => {
		const batch = new BatchRequest();
		expect(batch.items).toEqual([]);
	});

	it('should add a query request to items', () => {
		const batch = new BatchRequest();
		const query = 'SELECT * FROM users';
		batch.addQueryReq(query);
		expect(batch.items).toEqual([
			{ queryReq: { query } }
		]);
	});

	it('should add an upload request to items', () => {
		const batch = new BatchRequest();
		const formData = { key: 'value' };
		const filename = 'file.txt';
		batch.addUploadReq(formData, filename);
		expect(batch.items).toEqual([
			{ uploadReq: { formData, filename } }
		]);
	});
});
