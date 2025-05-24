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


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockProjects = [
    { name: 'Alpha Project' },
    { name: 'Beta Project' },
    { name: 'Gamma Project' },
    { name: 'Delta Project' },
];

vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
        json: () => Promise.resolve(mockProjects)
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

import { initDashboard, executeApiCall, initThemeToggle, storeJWT } from './dashboard.js';
import pageAdder from './pageAdder.js';
import stringSearch from './stringSearch.js';

vi.useFakeTimers();

describe('dashboard.js Module Tests', () => {
    let projectSearchInput, projectSearchForm, themeToggle;

    beforeEach(() => {
        document.body.innerHTML = `
      <form id="project-search-form">
        <input type="text" id="project-search-input" />
        <button type="submit">Search</button>
      </form>
    <button id="theme-toggle"></button>
    <div id="project-list"></div>
    `;

        projectSearchInput = document.getElementById('project-search-input');
        projectSearchForm = document.getElementById('project-search-form');
        themeToggle = document.getElementById('theme-toggle');

        pageAdder.addProjectsToPage.mockClear();
        pageAdder.clearProjects.mockClear();
        localStorage.clear();
        vi.clearAllMocks(); // Clear mocks for fetch, matchMedia, etc.
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // --- initDashboard Tests ---

    it('should load and display projects on initDashboard call', async () => {
        initDashboard();

        await vi.runAllTimersAsync();
        await Promise.resolve();

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith('/api/user/project');
        expect(pageAdder.addProjectsToPage).toHaveBeenCalledTimes(1);
        expect(pageAdder.addProjectsToPage).toHaveBeenCalledWith("project-list", mockProjects);
    }, 10000);

    it('should search and display filtered projects on form submit', async () => {
        initDashboard();

        await vi.runAllTimersAsync();
        await Promise.resolve(); // Ensure initial project loading is complete

        projectSearchInput.value = 'beta';
        projectSearchForm.dispatchEvent(new Event('submit', { bubbles: true }));

        await vi.runAllTimersAsync();
        await Promise.resolve();

        expect(stringSearch.getComparator).toHaveBeenCalledWith('beta');
        expect(pageAdder.clearProjects).toHaveBeenCalledTimes(1);
        expect(pageAdder.addProjectsToPage).toHaveBeenCalledTimes(2); // Once for initial load, once for search
        expect(pageAdder.addProjectsToPage).toHaveBeenLastCalledWith("project-list", [{ name: 'Beta Project' }]);
    }, 10000);

    it('should display all projects if search input is empty', async () => {
        initDashboard();

        await vi.runAllTimersAsync();
        await Promise.resolve(); // Ensure initial project loading is complete

        projectSearchInput.value = '';
        projectSearchForm.dispatchEvent(new Event('submit', { bubbles: true }));

        await vi.runAllTimersAsync();
        await Promise.resolve();

        expect(stringSearch.getComparator).toHaveBeenCalledWith('');
        expect(pageAdder.clearProjects).toHaveBeenCalledTimes(1);
        expect(pageAdder.addProjectsToPage).toHaveBeenCalledTimes(2);
        expect(pageAdder.addProjectsToPage).toHaveBeenLastCalledWith("project-list", mockProjects);
    }, 10000);

    it('should handle no search results gracefully', async () => {
        initDashboard();

        await vi.runAllTimersAsync();
        await Promise.resolve(); // Ensure initial project loading is complete

        projectSearchInput.value = 'NonExistent';
        projectSearchForm.dispatchEvent(new Event('submit', { bubbles: true }));

        await vi.runAllTimersAsync();
        await Promise.resolve();

        expect(stringSearch.getComparator).toHaveBeenCalledWith('NonExistent');
        expect(pageAdder.clearProjects).toHaveBeenCalledTimes(1);
        expect(pageAdder.addProjectsToPage).toHaveBeenCalledTimes(2);
        expect(pageAdder.addProjectsToPage).toHaveBeenLastCalledWith("project-list", []);
    }, 10000);

    // it('should log an error if required DOM elements are missing', () => {
    //     document.body.innerHTML = ``; // Clear the body to simulate missing elements
    //     const consoleSpy = vi.spyOn(console, 'error');
    //     initDashboard();
    //     expect(consoleSpy).toHaveBeenCalledWith('Required DOM elements not found');
    //     consoleSpy.mockRestore();
    // });

    // --- executeApiCall Tests ---

    it('executeApiCall should return data on successful fetch', async () => {
        const data = await executeApiCall();
        expect(data).toEqual(mockProjects);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('executeApiCall should handle API call errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { });

        fetch.mockImplementationOnce(() =>
            Promise.reject(new Error('Network error'))
        );

        const data = await executeApiCall();
        expect(data).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Error loading user:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Failed to load projects. Please try again later.');

        consoleSpy.mockRestore();
        alertSpy.mockRestore();
    });

    // --- initThemeToggle Tests ---

    it('initThemeToggle should set theme to light by default if no preference and no saved theme', () => {
        window.matchMedia.mockImplementation(query => ({
            matches: false, // Simulate no dark preference
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        initThemeToggle();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(themeToggle.innerText).toBe('☀️Light');
    });

    it('initThemeToggle should set theme to dark if prefers-color-scheme is dark', () => {
        window.matchMedia.mockImplementation(query => ({
            matches: true, // Simulate dark preference
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        initThemeToggle();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(themeToggle.innerText).toBe('🌕Dark');
    });

    it('initThemeToggle should load saved theme from localStorage', () => {
        localStorage.setItem('theme', 'dark');
        initThemeToggle();
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(themeToggle.innerText).toBe('🌕Dark');

        localStorage.setItem('theme', 'light');
        initThemeToggle();
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(themeToggle.innerText).toBe('☀️Light');
    });

    // it('initThemeToggle should toggle theme on button click and save to localStorage', () => {
    //     initThemeToggle(); // Initial state (e.g., light)
    //     expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    //     expect(localStorage.getItem('theme')).toBe('light');
    //     expect(themeToggle.innerText).toBe('☀️Light');

    //     themeToggle.click(); // Toggle to dark
    //     expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    //     expect(localStorage.getItem('theme')).toBe('dark');
    //     expect(themeToggle.innerText).toBe('🌕Dark');

    //     themeToggle.click(); // Toggle to light
    //     expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    //     expect(localStorage.getItem('theme')).toBe('light');
    //     expect(themeToggle.innerText).toBe('☀️Light');
    // });

    // --- storeJWT Tests ---

    it('storeJWT should store JWT token from URL parameters', () => {
        const mockToken = 'mock-jwt-token-123';
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                search: `?token=${mockToken}`
            }
        });
        storeJWT();
        expect(localStorage.getItem('jwt')).toBe(mockToken);
    });

    it('storeJWT should not store anything if no token in URL parameters', () => {
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                search: ''
            }
        });
        storeJWT();
        expect(localStorage.getItem('jwt')).toBeNull();
    });
});