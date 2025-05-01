// viewProject.test.js
import { test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the fetch function to return the mock project data
vi.mock('fetch', () => ({
  fetchFromApi: vi.fn(() => ({
    ok: true,
    json: async () => mockProject
  }))
}));

const mockProject = {
  name: "Sample Project",
  collaborators: [],  // Empty collaborators list for testing "No collaborators."
};

beforeEach(() => {
  // Reset any mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  document.body.innerHTML = '';
});

test('shows "No collaborators" if project has none', async () => {
  const { initPage } = await import('./viewProject.js');
  await initPage();

  // Add a small delay to ensure the DOM is updated
  await new Promise(resolve => setTimeout(resolve, 50));

  const collabList = document.getElementById('collaboratorList');
  expect(collabList.innerHTML.includes('No collaborators.')).toBe(true);
});

test('populates project info and collaborators properly', async () => {
  const { initPage } = await import('./viewProject.js');
  
  // Simulate a project with collaborators
  mockProject.collaborators = [{ name: 'John Doe' }, { name: 'Jane Smith' }];
  await initPage();

  const collabList = document.getElementById('collaboratorList');
  expect(collabList.children.length).toBe(2); // Should have two collaborators

  const collaboratorNames = Array.from(collabList.children).map(li => li.innerText);
  expect(collaboratorNames).toEqual(['John Doe', 'Jane Smith']);
});
