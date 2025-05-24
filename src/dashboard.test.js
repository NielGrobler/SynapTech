
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation(query => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});


import { describe, it, expect, vi, beforeEach, beforeAll, afterEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn(() =>
	Promise.resolve({
		json: () => Promise.resolve([
			{ name: 'Test Project A' },
			{ name: 'Test Project B' }
		])
	})
));

// Mock pageAdder
vi.mock('./pageAdder.js', () => {
	return {
		default: {
			addProjectsToPage: vi.fn(),
			clearProjects: vi.fn()
		}
	};
});

// Mock stringSearch
vi.mock('./stringSearch.js', () => {
	return {
		default: {
			getComparator: vi.fn(() => (a, b) => a.name.localeCompare(b.name))
		}
	};
});

import { initDashboard } from './dashboard.js';
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

vi.useFakeTimers();

describe('dashboard.js', () => {
	let projectSearchInput, projectSearchForm;

	beforeEach(() => {
		document.body.innerHTML = `
      <form id="project-search-form">
        <input type="text" id="project-search-input" />
        <button type="submit">Search</button>
      </form>
	<button id="theme-toggle"></button>
    `;

		projectSearchInput = document.getElementById('project-search-input');
		projectSearchForm = document.getElementById('project-search-form');

		pageAdder.addProjectsToPage.mockClear();
		pageAdder.clearProjects.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('loads and displays projects on load', async () => {
		initDashboard();

		await vi.runAllTimersAsync();
		await Promise.resolve();

		expect(fetch).toHaveBeenCalledTimes(1);
		expect(pageAdder.addProjectsToPage).toHaveBeenCalledWith("project-list", [
			{ name: 'Test Project A' },
			{ name: 'Test Project B' }
		]);
	}, 10000);

	it('searches and displays filtered projects on form submit', async () => {
		initDashboard();

		await vi.runAllTimersAsync();
		await Promise.resolve();

		projectSearchInput.value = 'Project A';

		const comparator = stringSearch.getComparator();
		const filteredProjects = [{ name: 'Test Project A' }];
		stringSearch.getComparator.mockReturnValue(() => true);

		projectSearchForm.dispatchEvent(new Event('input', { bubbles: true }));

		await vi.runAllTimersAsync();
		await Promise.resolve();

		expect(pageAdder.clearProjects).toHaveBeenCalled();
		expect(pageAdder.addProjectsToPage).toHaveBeenCalled();
	}, 10000);
});
