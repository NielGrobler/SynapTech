import fetchUsername from './fetchUsername.js';  // Ensure correct import

// Mock DOM environment for testing
beforeAll(() => {
	document.body.innerHTML = '<div id="username"></div>';
});

// Mock fetch for testing
beforeEach(() => {
	global.fetch = jest.fn();
});

describe('User Info Functions', () => {
	it('fetchUsername.fetchUserInfo should return user info when fetch is successful', async () => {
		const mockResponse = { name: 'John Doe' };
		fetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockResponse),
		});

		const result = await fetchUsername.fetchUserInfo();

		expect(result).toEqual(mockResponse);
		expect(fetch).toHaveBeenCalledWith('/api/user/info', { credentials: 'include' });
	});

	it('fetchUsername.fetchUserInfo should throw an error if fetch is not ok', async () => {
		fetch.mockResolvedValueOnce({ ok: false });

		await expect(fetchUsername.fetchUserInfo()).rejects.toThrow('Not authenticated');
	});

	it('fetchUsername.setUsername should set the first name in the DOM', async () => {
		const mockResponse = { name: 'John Doe' };
		fetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve(mockResponse),
		});

		await fetchUsername.setUsername();

		const userElement = document.getElementById('username');
		expect(userElement.innerHTML).toBe('John');
	});
});

