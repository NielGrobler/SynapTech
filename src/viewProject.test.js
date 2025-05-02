// viewProject.test.js
import { test, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock project data
const mockProject = {
  name: "Sample Project",
  collaborators: [],
};

// Mock fetchFromApi (if used inside your modules)
vi.mock('fetch', () => ({
  fetchFromApi: vi.fn(() => ({
    ok: true,
    json: async () => mockProject,
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  document.body.innerHTML = '';
});

test('shows "No collaborators" if project has none', async () => {
  document.body.innerHTML = '<ul id="collaboratorList"></ul>';

  // Set up the global project object
  global.project = mockProject;

  const { initPage } = await import('./viewProject.js');
  await initPage();

  // Optional delay for DOM update (could be removed if unnecessary)
  await new Promise(resolve => setTimeout(resolve, 10));

  const collabList = document.getElementById('collaboratorList');
  expect(collabList.innerHTML.includes('No collaborators.')).toBe(true);
});

test('populates project info and collaborators properly', async () => {
  document.body.innerHTML = '<ul id="collaboratorList"></ul>';

  // Update mock project with collaborators
  mockProject.collaborators = [{ name: 'John Doe' }, { name: 'Jane Smith' }];
  global.project = mockProject;

  const { initPage } = await import('./viewProject.js');
  await initPage();

  const collabList = document.getElementById('collaboratorList');
  expect(collabList.children.length).toBe(2);

  const collaboratorNames = Array.from(collabList.children).map(li => li.innerText);
  expect(collaboratorNames).toEqual(['John Doe', 'Jane Smith']);
});
