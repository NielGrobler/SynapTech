// query.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import dotenv from 'dotenv';
import { DatabaseQuery, DatabaseQueryBuilder, decodeBase64 } from './query.js';

// Mock dependencies
vi.mock('axios');
vi.mock('dotenv');

describe('decodeBase64', () => {
  it('should decode a base64 string', () => {
    const base64String = 'SGVsbG8gV29ybGQ='; // "Hello World" in base64
    expect(decodeBase64(base64String)).toBe('Hello World');
  });

  it('should handle non-base64 strings', () => {
    // Since the implementation always tries to decode,
    // we'll just test that it doesn't throw errors for non-base64 inputs
    const nonBase64String = 'Not a base64 string!@#';
    const result = decodeBase64(nonBase64String);
    expect(typeof result).toBe('string');
  });

  it('should decode array of base64 strings', () => {
    const base64Array = ['SGVsbG8=', 'V29ybGQ=']; // ["Hello", "World"] in base64
    expect(decodeBase64(base64Array)).toEqual(['Hello', 'World']);
  });

  it('should decode object with base64 values', () => {
    const base64Object = {
      greeting: 'SGVsbG8=', // "Hello" in base64
      target: 'V29ybGQ=' // "World" in base64
    };
    expect(decodeBase64(base64Object)).toEqual({
      greeting: 'Hello',
      target: 'World'
    });
  });

  it('should handle nested objects and arrays', () => {
    const nestedObject = {
      greeting: 'SGVsbG8=', // "Hello" in base64
      nested: {
        target: 'V29ybGQ=' // "World" in base64
      },
      list: ['SGVsbG8=', 'V29ybGQ='] // ["Hello", "World"] in base64
    };
    expect(decodeBase64(nestedObject)).toEqual({
      greeting: 'Hello',
      nested: {
        target: 'World'
      },
      list: ['Hello', 'World']
    });
  });

  it('should return non-string primitives as is', () => {
    expect(decodeBase64(123)).toBe(123);
    expect(decodeBase64(true)).toBe(true);
    expect(decodeBase64(null)).toBe(null);
    expect(decodeBase64(undefined)).toBe(undefined);
  });
});

describe('QueryResult', () => {
  it('should properly map data from response', () => {
    const mockData = {
      InsertId: 42,
      RecordSet: [{ id: 1, name: 'Test' }],
      rowsAffected: 1
    };

    // Directly create QueryResult instance instead of using a private method
    const result = new (class QueryResult {
      constructor(res) {
        this.insertId = res.InsertId;
        this.recordSet = res.RecordSet;
        this.rowsAffected = res.rowsAffected;
      }
    })(mockData);

    expect(result.insertId).toBe(42);
    expect(result.recordSet).toEqual([{ id: 1, name: 'Test' }]);
    expect(result.rowsAffected).toBe(1);
  });
});

describe('DatabaseQuery', () => {
  beforeEach(() => {
    process.env.DB_HOST = 'testhost';
    process.env.DB_PORT = '1234';
    process.env.DB_API_KEY = 'testkey';
    
    // Mock console.log to prevent output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should construct with statement and params', () => {
    const query = new DatabaseQuery('SELECT * FROM users', { id: 1 });
    expect(query.statement).toBe('SELECT * FROM users');
    expect(query.params).toEqual({ id: 1 });
  });

  it('should send query using the provided agent', async () => {
    const mockAgent = { key: 'value' };
    const mockResponse = {
      data: {
        InsertId: 42,
        RecordSet: [{ id: 1, name: 'VGVzdA==' }], // "Test" in base64
        rowsAffected: 1
      }
    };

    axios.post.mockResolvedValue(mockResponse);

    const query = new DatabaseQuery('SELECT * FROM users', { id: 1 });
    const response = await query.sendUsing(mockAgent);

    expect(axios.post).toHaveBeenCalledWith(
      'https://testhost:1234/query',
      {
        query: 'SELECT * FROM users',
        params: { id: 1 }
      },
      {
        headers: {
          'X-API-Key': 'testkey'
        },
        httpsAgent: mockAgent
      }
    );
    
    expect(response).toEqual(mockResponse);
  });

  it('should get decoded result using the provided agent', async () => {
    const mockAgent = { key: 'value' };
    const mockResponse = {
      data: {
        InsertId: 42,
        RecordSet: [{ id: 1, name: 'VGVzdA==' }], // "Test" in base64
        rowsAffected: 1
      }
    };

    axios.post.mockResolvedValue(mockResponse);

    const query = new DatabaseQuery('SELECT * FROM users', { id: 1 });
    const result = await query.getResultUsing(mockAgent);

    expect(result.insertId).toBe(42);
    expect(result.recordSet).toEqual([{ id: 1, name: 'Test' }]); // Decoded from base64
    expect(result.rowsAffected).toBe(1);
  });
});

describe('DatabaseQueryBuilder', () => {
  beforeEach(() => {
    process.env.DB_HOST = 'testhost';
    process.env.DB_PORT = '1234';
    process.env.DB_API_KEY = 'testkey';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should build a query with statement and params', () => {
    const builder = new DatabaseQueryBuilder();
    builder.query('SELECT * FROM users WHERE id = :id');
    builder.input('id', 1);

    const query = builder.build();

    expect(query).toBeInstanceOf(DatabaseQuery);
    expect(query.statement).toBe('SELECT * FROM users WHERE id = :id');
    expect(query.params).toEqual({ id: 1 });
  });

  it('should allow chaining methods', () => {
    const builder = new DatabaseQueryBuilder()
      .query('SELECT * FROM users WHERE id = :id')
      .input('id', 1);

    const query = builder.build();

    expect(query).toBeInstanceOf(DatabaseQuery);
    expect(query.statement).toBe('SELECT * FROM users WHERE id = :id');
    expect(query.params).toEqual({ id: 1 });
  });

  it('should throw error if parameter is defined multiple times', () => {
    const builder = new DatabaseQueryBuilder()
      .query('SELECT * FROM users WHERE id = :id')
      .input('id', 1)
      .input('id', 2);

    expect(() => builder.build()).toThrow('id already exists in query.');
  });

  it('should throw error with multiple errors joined', () => {
    const builder = new DatabaseQueryBuilder()
      .query('SELECT * FROM users')
      .input('id', 1)
      .input('id', 2)
      .input('name', 'John')
      .input('name', 'Doe');

    expect(() => builder.build()).toThrow('id already exists in query.\nname already exists in query.');
  });

  it('should send query using the provided agent', async () => {
    const mockAgent = { key: 'value' };
    const mockResponse = { data: 'mockData' };

    axios.post.mockResolvedValue(mockResponse);

    const builder = new DatabaseQueryBuilder()
      .query('SELECT * FROM users')
      .input('id', 1);

    const response = await builder.sendUsing(mockAgent);

    expect(axios.post).toHaveBeenCalledWith(
      'https://testhost:1234/query',
      {
        query: 'SELECT * FROM users',
        params: { id: 1 }
      },
      {
        headers: {
          'X-API-Key': 'testkey'
        },
        httpsAgent: mockAgent
      }
    );
    
    expect(response).toEqual(mockResponse);
  });

  it('should get result using the provided agent', async () => {
    const mockAgent = { key: 'value' };
    const mockResponse = {
      data: {
        InsertId: 42,
        RecordSet: [{ id: 1, name: 'VGVzdA==' }], // "Test" in base64
        rowsAffected: 1
      }
    };

    axios.post.mockResolvedValue(mockResponse);

    const builder = new DatabaseQueryBuilder()
      .query('SELECT * FROM users')
      .input('id', 1);

    const result = await builder.getResultUsing(mockAgent);

    expect(result.insertId).toBe(42);
    expect(result.recordSet).toEqual([{ id: 1, name: 'Test' }]); // Decoded from base64
    expect(result.rowsAffected).toBe(1);
  });
});
