import { describe, it, expect, vi, beforeEach } from 'vitest';
import userInfo from './userInfo';

describe('userInfo Module Tests', () => {
	describe('fetchFromApi', () => {
		beforeEach(() => {
			vi.resetAllMocks();
		});

		it('should return user info on successful fetch', async () => {
			const mockData = { name: 'John Doe', email: 'john@example.com' };

			global.fetch = vi.fn(() =>
				Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockData),
				})
			);

			const data = await userInfo.fetchFromApi();
			expect(data).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/user/info', { credentials: 'include' });
		});

		it('should throw an error if not authenticated', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
				ok: false,
				status: 401,
				})
		);

		await expect(userInfo.fetchFromApi()).rejects.toThrow('Not authenticated');
		});
	});
});