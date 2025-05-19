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

describe('search.js functions', () => {
	describe('fetchProjects', () => {
		it('fetches project data and returns it', async () => {
			const mockData = [{ name: 'Project 1' }, { name: 'Project 2' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockData),
			});

			const result = await search.fetchProjects('Project');
			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/search/project?projectName=Project');
		});

		it('throws an error if fetch fails', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const result = await search.fetchProjects('Project');
			expect(result).toBeUndefined(); // Error is logged, no return value
		});
	});

	describe('fetchUsers', () => {
		it('fetches user data and returns it', async () => {
			const mockData = [{ name: 'User 1' }, { name: 'User 2' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockData),
			});

			const result = await search.fetchUsers('User');
			expect(result).toEqual(mockData);
			expect(fetch).toHaveBeenCalledWith('/api/search/user?userName=User');
		});

		it('throws an error if fetch fails', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const result = await search.fetchUsers('User');
			expect(result).toBeUndefined(); // Error is logged, no return value
		});
	});

	describe('markType', () => {
		it('sets the type of elements in the container', () => {
			const container = [{}, {}];
			search.markType(container, 'user');
			expect(container[0].type).toBe('user');
			expect(container[1].type).toBe('user');
		});
	});

	describe('merge', () => {
		it('merges two sorted arrays correctly', () => {
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

		it('handles empty arrays', () => {
			const fst = [];
			const snd = [{ name: 'A' }];
			const result = search.merge(fst, snd, (x) => x.name, (x) => x.name, (a, b) => a.localeCompare(b));
			expect(result).toEqual([{ name: 'A' }]);
		});
	});

	describe('queryListener', () => {
		it('fetches and filters users and projects correctly', async () => {
			// Mocking fetch responses for users and projects
			const mockUsers = [{ name: 'User A' }, { name: 'User B' }];
			const mockProjects = [{ name: 'Project A' }, { name: 'Project B' }];
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) });
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProjects) });

			const input = document.createElement('input');
			input.value = 'A';
			input.id = 'search-bar'
			document.body.appendChild(input);

			const userToggle = document.createElement('input');
			userToggle.checked = true;
			userToggle.id = 'user-toggle'; // <-- Add this line
			document.body.appendChild(userToggle);

			const projectToggle = document.createElement('input');
			projectToggle.checked = true;
			projectToggle.id = 'project-toggle'; // <-- Add this line
			document.body.appendChild(projectToggle);

			const resultsDiv = document.createElement('div');
			resultsDiv.id = 'search-results'; // <-- Add this line
			document.body.appendChild(resultsDiv);

			await queryListener({ target: input });

			// Make sure the results were merged, sorted, and assigned to the element
			expect(pageAdder.assignListToElement).toHaveBeenCalledWith(
				'search-results',
				[
					{ name: 'Project A', type: "project" },
					//{ name: 'Project B', type: "project" }
					{ name: 'User A', type: "user" },
					//{ name: 'User B', type: "user" },
				],
				expect.any(Function)
			);
		});
	});

	describe('setupForm', () => {
		beforeEach(() => {
			document.body.innerHTML = '';
		});

		it('sets up event listeners correctly', () => {
			const input = document.createElement('input');
			const userToggle = document.createElement('input');
			const projectToggle = document.createElement('input');

			input.id = 'search-bar';
			userToggle.id = 'user-toggle';
			projectToggle.id = 'project-toggle';

			document.body.appendChild(input);
			document.body.appendChild(userToggle);
			document.body.appendChild(projectToggle);

			// Mock addEventListener as a spy
			input.addEventListener = vi.fn();
			userToggle.addEventListener = vi.fn();
			projectToggle.addEventListener = vi.fn();

			search.setupForm();

			expect(input.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
			expect(userToggle.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
			expect(projectToggle.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
		});
	});
});

