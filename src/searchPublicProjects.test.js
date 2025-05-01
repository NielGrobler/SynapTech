import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as searchModule from './searchPublicProjects.js';

describe('searchPublicProjects.js', () => {
  let container;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="searchForm">
        <input type="text" id="searchInput" />
        <button type="submit">Search</button>
      </form>
      <div id="searchResultsContainer"></div>
    `;
    container = document.getElementById("searchResultsContainer");

    // Call the setupSearchForm to ensure the event listener is added
    searchModule.setupSearchForm();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchProjects makes a correct API call and updates DOM', async () => {
    const mockProjects = [
      { name: "Project 1", description: "Description 1" },
      { name: "Project 2", description: "Description 2" }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjects)
    });

    container.innerHTML = "<p>Old Content</p>";

    await searchModule.fetchProjects("test");

    expect(global.fetch).toHaveBeenCalledWith("/api/search/project?projectName=test");
    expect(container.innerHTML).toContain("Project 1");
    expect(container.innerHTML).toContain("Project 2");
  });

  it('fetchProjects logs error on failed fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await searchModule.fetchProjects("fail");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching projects:'), expect.any(Error));
  });

  it('fetchProjects logs error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await searchModule.fetchProjects("fail");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error fetching projects:'), expect.any(Error));
  });

  it('submitting the form triggers fetchProjects', async () => {
    // Create a spy on fetchProjects to ensure it's called
    const fetchSpy = vi.spyOn(searchModule, 'fetchProjects').mockImplementation(() => {});

    // Fill the input value
    document.getElementById("searchInput").value = "hello";

    // Submit the form
    const form = document.getElementById("searchForm");
    const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    // Wait for the async call to resolve
    await new Promise(setImmediate);

    // Now check if the fetchProjects was called with the correct argument
    expect(fetchSpy).toHaveBeenCalledWith("hello");
  });
});
