import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeApiCall, initThemeToggle, initDashboard } from './dashboard.js';

// Move this inside a describe block, or change to beforeEach
describe('dashboard.js', () => {
  beforeEach(() => {
    // Setup matchMedia mock (will run before each test)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Set up basic DOM structure for tests
    document.body.innerHTML = `
      <button id="theme-toggle"></button>
      <form id="project-search-form">
        <input id="project-search-input" />
      </form>
      <div id="project-list"></div>
    `;

    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  vi.mock('./pageAdder.js', () => ({
    default: {
      addProjectsToPage: vi.fn(),
      clearProjects: vi.fn(),
    },
  }));

  vi.mock('./stringSearch.js', () => ({
    default: {
      getComparator: vi.fn(() => () => 0),
    },
  }));

  describe('executeApiCall', () => {
    it('returns data when fetch is successful', async () => {
      const mockData = [{ name: 'Project X' }];
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const result = await executeApiCall();
      expect(result).toEqual(mockData);
    });

    it('returns empty array when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Fetch failed'));

      const result = await executeApiCall();
      expect(result).toEqual([]);
    });
  });

  describe('initThemeToggle', () => {
    it('applies saved theme from localStorage', () => {
      localStorage.setItem('theme', 'dark');
      initThemeToggle();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('toggles theme when button is clicked', () => {
      initThemeToggle();
      const toggle = document.getElementById('theme-toggle');
      const initialTheme = document.documentElement.getAttribute('data-theme');
      toggle.click();
      const newTheme = document.documentElement.getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });
  });

  describe('initDashboard', () => {
    it('fetches and displays projects', async () => {
      const projects = [{ name: 'Alpha' }];
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(projects),
      });

      const pageAdder = (await import('./pageAdder.js')).default;
      initDashboard();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(pageAdder.addProjectsToPage).toHaveBeenCalledWith('project-list', projects);
    });

    it('filters and displays matching projects on form submit', async () => {
      const projects = [{ name: 'Match' }, { name: 'Nope' }];
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(projects),
      });

      const pageAdder = (await import('./pageAdder.js')).default;
      const input = document.getElementById('project-search-input');
      input.value = 'Match';

      initDashboard();
      await new Promise(resolve => setTimeout(resolve, 0));

      const form = document.getElementById('project-search-form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

      expect(pageAdder.clearProjects).toHaveBeenCalled();
      expect(pageAdder.addProjectsToPage).toHaveBeenCalledWith('project-list', expect.any(Array));
    });
  });
});
