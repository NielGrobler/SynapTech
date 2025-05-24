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
	});

	describe('setupForm', () => {
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
	});
});

