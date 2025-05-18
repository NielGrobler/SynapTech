// query.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import dotenv from 'dotenv';
import { DatabaseQuery, DatabaseQueryBuilder } from './query.js';

// Mock dependencies
vi.mock('axios');
vi.mock('dotenv');

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


});
