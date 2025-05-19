import { describe, it, expect, vi, beforeEach } from 'vitest';
import search from './search.js';

describe('search.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchProjects', () => {
    it('should fetch and return projects on success', async () => {
      const mockData = [{ name: 'Alpha' }];
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockData),
        })
      );

      const result = await search.fetchProjects('Alpha');
      expect(fetch).toHaveBeenCalledWith('/api/search/project?projectName=Alpha');
      expect(result).toEqual(mockData);
    });

    it('should alert and log on fetch failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
      global.alert = vi.fn();
      console.error = vi.fn();

      await search.fetchProjects('ErrorTest');

      expect(console.error).toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith('Failed fetching projects.');
    });
  });

  describe('fetchUsers', () => {
    it('should fetch and return users on success', async () => {
      const mockUsers = [{ name: 'Jane' }];
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers),
        })
      );

      const result = await search.fetchUsers('Jane');
      expect(fetch).toHaveBeenCalledWith('/api/search/user?userName=Jane');
      expect(result).toEqual(mockUsers);
    });

    it('should alert and log on fetch failure', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('User Fetch Fail')));
      global.alert = vi.fn();
      console.error = vi.fn();

      await search.fetchUsers('fail');

      expect(console.error).toHaveBeenCalled();
      expect(alert).toHaveBeenCalledWith('Failed fetching users.');
    });
  });

  describe('markType', () => {
    it('should assign type to each element in the array', () => {
      const arr = [{}, {}, {}];
      search.markType(arr, 'project');
      arr.forEach(item => expect(item.type).toBe('project'));
    });
  });

  describe('merge', () => {
    it('should merge and sort two arrays based on comparator', () => {
      const a = [{ name: 'A' }, { name: 'C' }];
      const b = [{ name: 'B' }, { name: 'D' }];

      const result = search.merge(
        a,
        b,
        (x) => x.name,
        (x) => x.name,
        (x, y) => x.localeCompare(y)
      );

      expect(result.map(x => x.name)).toEqual(['A', 'B', 'C', 'D']);
    });
  });
});
