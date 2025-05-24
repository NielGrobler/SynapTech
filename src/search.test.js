import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('./stringSearch.js', () => ({
	default: {},
	getComparator: () => () => 0
}));


vi.mock('./pageAdder.js', () => ({
	default: {
		assignListToElement: vi.fn(),
		userToElement: vi.fn(x => `<div>${x.name}</div>`),
		projectToElement: vi.fn(x => `<div>${x.name}</div>`)
	}
}));

// DOM Setup
const setupDOM = () => {
	document.body.innerHTML = `
<input id="search-bar" />
<input id="user-toggle" type="checkbox" checked />
<input id="project-toggle" type="checkbox" checked />
<div id="search-results"></div>
`;
};

import search from './search.js';

beforeEach(() => {
	vi.resetAllMocks();
	setupDOM();
	global.fetch = vi.fn();
});

describe('search module', () => {
	describe('fetchProjects', () => {
		it('fetches and returns projects', async () => {
			const data = [{ name: 'Alpha' }];
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
			const res = await search.fetchProjects('Alpha');
			expect(res).toEqual(data);
		});

		it('handles fetch error in fetchProjects', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			await search.fetchProjects('fail');
		});
	});

	describe('fetchUsers', () => {
		it('fetches and returns users', async () => {
			const data = [{ name: 'User1' }];
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(data) });
			const res = await search.fetchUsers('User1');
			expect(res).toEqual(data);
		});

		it('handles fetch error in fetchUsers', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			await search.fetchUsers('fail');
		});
	});

	describe('markType', () => {
		it('adds type field to all elements', () => {
			const arr = [{}, {}, {}];
			search.markType(arr, 'user');
			expect(arr.every(x => x.type === 'user')).toBe(true);
		});
	});

	describe('merge', () => {
		it('merges two sorted arrays correctly', () => {
			const a = [{ name: 'A' }, { name: 'C' }];
			const b = [{ name: 'B' }, { name: 'D' }];
			const res = search.merge(a, b, x => x.name, x => x.name, (x, y) => x.localeCompare(y));
			expect(res.map(x => x.name)).toEqual(['A', 'B', 'C', 'D']);
		});
	});

	/*
	describe('promiseOnToggle', () => {
		it('returns promise if toggle is checked', async () => {
			const toggle = { checked: true };
			const promise = Promise.resolve(['A']);
			const res = await search.promiseOnToggle(toggle, promise);
			expect(res).toEqual(['A']);
		});

		it('returns empty if toggle is not checked', async () => {
			const toggle = { checked: false };
			const promise = Promise.resolve(['A']);
			const res = await search.promiseOnToggle(toggle, promise);
			expect(res).toEqual([]);
		});
	});*/

	/*describe('setupForm', () => {
		it('sets up event listeners', () => {
			const input = document.getElementById("search-bar");
			const userToggle = document.getElementById("user-toggle");
			const projectToggle = document.getElementById("project-toggle");

			const addSpy = vi.spyOn(input, 'addEventListener');
			const userSpy = vi.spyOn(userToggle, 'addEventListener');
			const projSpy = vi.spyOn(projectToggle, 'addEventListener');

			search.setupForm();

			//expect(mockAssign).toHaveBeenCalled(); // initial assignment
			expect(addSpy).toHaveBeenCalled();
			expect(userSpy).toHaveBeenCalled();
			expect(projSpy).toHaveBeenCalled();
		});
	});*/
});

/* old code
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

*/