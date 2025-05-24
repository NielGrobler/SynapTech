import { describe, it, expect, vi, beforeEach } from 'vitest';
import search, { queryListener } from './search.js';
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

// Mocking the pageAdder methods to avoid DOM manipulation in tests
vi.mock('./pageAdder.js', () => {
	const mock = {
		assignListToElement: vi.fn(),
		userToElement: vi.fn(),
		projectToElement: vi.fn(),
	};
	return {
		...mock,
		default: mock, // <-- Add this line
	};
});

// Mocking stringSearch methods
vi.mock('./stringSearch.js', () => {
	const mock = {
		getComparator: vi.fn(() => (a, b) => a.name.localeCompare(b.name)),
	};
	return {
		...mock,
		default: mock, // <-- Add this line
	};
});

// Mocking fetch to avoid network calls
global.fetch = vi.fn();

describe('search.js Module Tests', () => {
	describe('fetchProjects', () => {
		it('should fetch project data and return it', async () => {
			const mockData = [{ name: 'Project 1' }, { name: 'Project 2' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockData),
			});

			const result = await search.fetchProjects('Project');
			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/search/project?projectName=Project');
		});

		it('should throw an error if fetch fails', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const result = await search.fetchProjects('Project');
			expect(result).toBeUndefined(); // Error is logged, no return value
		});
	});

	describe('fetchUsers', () => {
		it('should fetch user data and return it', async () => {
			const mockData = [{ name: 'User 1' }, { name: 'User 2' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockData),
			});

			const result = await search.fetchUsers('User');
			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/search/user?userName=User');
		});

		it('should throw an error if fetch fails', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const result = await search.fetchUsers('User');
			expect(result).toBeUndefined(); // Error is logged, no return value
		});
	});

	describe('markType', () => {
		it('should set the type of elements in the container', () => {
			const container = [{}, {}];
			search.markType(container, 'user');
			expect(container[0].type).toBe('user');
			expect(container[1].type).toBe('user');
		});
	});

	describe('merge', () => {
		it('should merge two sorted arrays correctly', () => {
			const fst = [{ name: 'A' }, { name: 'C' }];
			const snd = [{ name: 'B' }, { name: 'D' }];
			const result = search.merge(fst, snd, (x) => x.name, (x) => x.name, (a, b) => a.localeCompare(b));
			expect(result).toEqual([
				{ name: 'A' },
				{ name: 'B' },
				{ name: 'C' },
				{ name: 'D' },
			]);
		});

		it('should handle empty arrays', () => {
			const fst = [];
			const snd = [{ name: 'A' }];
			const result = search.merge(fst, snd, (x) => x.name, (x) => x.name, (a, b) => a.localeCompare(b));
			expect(result).toEqual([{ name: 'A' }]);
		});
	});

	describe('queryListener', () => {
		it('should fetch and filter users and projects correctly', async () => {
			// Mocking fetch responses for users and projects
			const mockUsers = [{ name: 'User A' }, { name: 'User B' }];
			const mockProjects = [{ name: 'Project A' }, { name: 'Project B' }];
			
			//changed this to mock radio setup instead of toggles
			const radioProjects = document.createElement('input');
			radioProjects.type = 'radio';
			radioProjects.name = 'visibility';
			radioProjects.value = 'Projects';
			radioProjects.checked = true;
			document.body.appendChild(radioProjects);

			const radioUser = document.createElement('input');
			radioUser.type = 'radio';
			radioUser.name = 'visibility';
			radioUser.value = 'User';
			document.body.appendChild(radioUser);

			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) });

			const input = document.createElement('input');
			input.value = 'A';
			input.id = 'search-bar';
			document.body.appendChild(input);

			const resultsDiv = document.createElement('div');
			resultsDiv.id = 'search-results';
			document.body.appendChild(resultsDiv);

			await queryListener({ target: input });

			expect(pageAdder.assignListToElement).toHaveBeenCalledWith(
				'search-results',
				[
					{ name: 'Project A', type: "project" },
				],
				expect.any(Function)
			);
		});
	});

	describe('setupForm', () => {
		beforeEach(() => {
			document.body.innerHTML = '';
		});

		it('should set up event listeners correctly', () => {
			const input = document.createElement('input');
			const radioProjects = document.createElement('input');
			const radioUser = document.createElement('input');

			input.id = 'search-bar';
			radioProjects.type = 'radio';
			radioProjects.name = 'visibility';
			radioProjects.value = 'Projects';
			radioUser.type = 'radio';
			radioUser.name = 'visibility';
			radioUser.value = 'User';

			document.body.appendChild(input);
			document.body.appendChild(radioProjects);
			document.body.appendChild(radioUser);

			input.addEventListener = vi.fn();
			radioProjects.addEventListener = vi.fn();
			radioUser.addEventListener = vi.fn();

			search.setupForm();

			expect(input.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
			expect(radioProjects.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
			expect(radioUser.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
		});
	});
});

