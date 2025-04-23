import fetchUsername from './fetchUsername';

global.fetch = jest.fn();

describe('User Info Functions', () => {
	beforeEach(() => {
		fetch.mockClear();
		document.body.innerHTML = '<div id="username"></div>';
	});

	describe('fetchUserInfo', () => {
		it('should return user info when fetch is successful', async () => {
			const mockData = { name: 'Henry Cavill' };
			fetch.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue(mockData)
			});

			const result = await fetchUsername.fetchUserInfo();
			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/user/info', { credentials: 'include' });
		});

		it('should throw an error if fetch is not ok', async () => {
			fetch.mockResolvedValueOnce({ ok: false });

			await expect(fetchUsername.fetchUserInfo()).rejects.toThrow('Not authenticated');
		});
	});

	describe('setUsername', () => {
		it('should set the first name in the DOM', async () => {
			const mockData = { name: 'Henry Cavill' };
			fetch.mockResolvedValueOnce({
				ok: true,
				json: jest.fn().mockResolvedValue(mockData)
			});

			await fetchUsername.setUsername();

			const usernameEl = document.getElementById('username');
			expect(usernameEl.innerHTML).toBe('Henry');
		});

		it('should handle fetch errors gracefully', async () => {
			console.error = jest.fn();
			fetch.mockResolvedValueOnce({ ok: false });

			await expect(fetchUsername.setUsername()).rejects.toThrow('Not authenticated');
			expect(console.error).not.toBeCalled();
		});
	});
});

