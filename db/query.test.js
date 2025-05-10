import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { DatabaseQueryBuilder, DatabaseQuery } from './query.js';

vi.mock('axios');

describe('DatabaseQueryBuilder', () => {
	it('should create a valid SELECT query with parameters', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30)
			.addParam('status', 'active');

		const query = queryBuilder.build();

		expect(query.statement).toBe('SELECT * FROM users');
		expect(query.params).toEqual({
			age: 30,
			status: 'active',
		});
	});
	it('should throw an error if a duplicate parameter is added', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30);

		// trying to add the same parameter again should cause an error
		queryBuilder.addParam('age', 25);

		try {
			queryBuilder.build();
		} catch (error) {
			expect(error.message).toBe('age already exists in query.');
		}
	});

	it('should handle multiple parameters and errors correctly', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30)
			.addParam('status', 'active')
			.addParam('name', 'John Doe')
			.addParam('age', 25);

		try {
			queryBuilder.build();
		} catch (error) {
			expect(error.message).toBe('age already exists in query.');
		}
	});

	it('should allow chaining of addParam methods', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30)
			.addParam('status', 'active')
			.addParam('name', 'John Doe');

		const query = queryBuilder.build();

		expect(query.statement).toBe('SELECT * FROM users');
		expect(query.params).toEqual({
			age: 30,
			status: 'active',
			name: 'John Doe',
		});
	});

	it('should build query with no parameters', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		const query = queryBuilder.build();

		expect(query.statement).toBe('SELECT * FROM users');
		expect(query.params).toEqual({});
	});

	it('should return an empty parameter object if no parameters are added', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');
		const query = queryBuilder.build();

		expect(query.params).toEqual({});
	});

	it('should collect and throw multiple errors when adding duplicate parameters', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30)
			.addParam('status', 'active')
			.addParam('age', 25)  // Duplicate parameter
			.addParam('status', 'inactive'); // Another duplicate

		try {
			queryBuilder.build();
		} catch (error) {
			expect(error.message).toBe('age already exists in query.\nstatus already exists in query.');
		}
	});

	it('should return the correct result when checking for existing parameters', () => {
		const queryBuilder = new DatabaseQueryBuilder('SELECT * FROM users');

		queryBuilder.addParam('age', 30);
		expect(queryBuilder.params.hasOwnProperty('age')).toBe(true);
		expect(queryBuilder.params.hasOwnProperty('status')).toBe(false);
	});
});

const encodeBase64 = str => Buffer.from(str, 'ascii').toString('base64');

describe('decodeBase64', () => {
	it('should decode base64 strings to ASCII', async () => {
		const encoded = encodeBase64('hello');
		const result = await import('./query.js').then(mod => mod.decodeBase64(encoded));
		expect(result).toBe('hello');
	});

	it('should decode nested structures', async () => {
		const input = {
			user: encodeBase64('Alice'),
			meta: {
				role: encodeBase64('admin'),
				id: encodeBase64('42')
			},
			list: [encodeBase64('a'), encodeBase64('b')]
		};
		const result = await import('./query.js').then(mod => mod.decodeBase64(input));
		expect(result).toEqual({
			user: 'Alice',
			meta: { role: 'admin', id: '42' },
			list: ['a', 'b']
		});
	});
});

describe('DatabaseQuery', () => {
	const httpsAgentMock = { dummy: 'agent' };

	it('should send a query using sendUsing and return raw data', async () => {
		const responseData = { data: { user: 'raw' } };
		axios.post.mockResolvedValue(responseData);

		const query = new DatabaseQuery('SELECT * FROM users', { age: 30 });
		const result = await query.sendUsing(httpsAgentMock);

		expect(axios.post).toHaveBeenCalledWith(
			expect.stringContaining('https://'),
			{
				query: 'SELECT * FROM users',
				params: { age: 30 }
			},
			expect.objectContaining({
				headers: expect.objectContaining({
					'X-API-Key': expect.any(String)
				}),
				httpsAgent: httpsAgentMock
			})
		);

		expect(result).toEqual(responseData);
	});

	it('should decode response data with getRecordSetUsing', async () => {
		const encoded = encodeBase64('secret');
		axios.post.mockResolvedValue({ data: { value: encoded } });

		const query = new DatabaseQuery('SELECT * FROM secure_table', {});
		const result = await query.getRecordSetUsing(httpsAgentMock);

		expect(result).toEqual({ value: 'secret' });
	});

	it('should return null on request error', async () => {
		axios.post.mockRejectedValue(new Error('Network Error'));

		const query = new DatabaseQuery('SELECT * FROM broken', {});
		const result = await query.getRecordSetUsing(httpsAgentMock);

		expect(result).toBeNull();
	});
});

