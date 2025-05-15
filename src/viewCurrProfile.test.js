/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import userInfoModule from './userInfo.js';

// Mock the modules with proper implementations
vi.mock('./fetchUsername.js', () => ({
  default: {
    setUsername: vi.fn().mockResolvedValue('mockUsername')
  }
}));

vi.mock('./pageAdder.js', () => ({
  default: {
    addProjectsToPage: vi.fn(),
    clearProjects: vi.fn(),
    assignListToElement: vi.fn(),
    addUsersToPage: vi.fn()
  }
}));

// Import the mocked modules
import fetchUsername from './fetchUsername.js';
import pageAdder from './pageAdder.js';

beforeEach(() => {
  document.body.innerHTML = `
    <div id="username"></div>
    <div id="userName"></div>
    <div id="userBio"></div>
    <div id="userUni"></div>
    <div id="userDepartment"></div>
    <div id="projectCardList"></div>
  `;
  
  global.fetch = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('viewCurrProfile.js', () => {
  it('populates DOM elements with user data on load', async () => {
    const mockUser = { id: 'u123', name: 'Alice', bio: 'Student' };
    const mockNewInfo = [{ university: 'Wits', department: 'CS' }];
    const mockProjects = [{ title: 'Proj1' }];

    // Set up mocks
    vi.spyOn(userInfoModule, 'fetchFromApi').mockResolvedValue(mockUser);
    fetchUsername.setUsername.mockResolvedValue('Alice123');
    
    global.fetch
      .mockImplementationOnce(() => Promise.resolve({ 
        ok: true,
        json: () => Promise.resolve(mockNewInfo)
      }))
      .mockImplementationOnce(() => Promise.resolve({ 
        ok: true,
        json: () => Promise.resolve(mockProjects)
      }));

    // Import the module after setting up mocks
    await import('./viewCurrProfile.js');
    
    // Wait for all promises to resolve
    await new Promise(setImmediate);

    // Verify DOM updates
    expect(document.getElementById('username').textContent).toBe('Alice123');
    expect(document.getElementById('userName').textContent).toBe('Alice');
    expect(document.getElementById('userBio').textContent).toBe('Student');
    expect(document.getElementById('userUni').textContent).toBe('Wits');
    expect(document.getElementById('userDepartment').textContent).toBe('CS');
    expect(pageAdder.addProjectsToPage).toHaveBeenCalledWith('projectCardList', mockProjects);
  });

  it('shows fallback message on userInfo fetch failure', async () => {
    vi.spyOn(userInfoModule, 'fetchFromApi').mockRejectedValue(new Error('Auth error'));
    fetchUsername.setUsername.mockRejectedValue(new Error('Failed to set username'));
    
    await import('./viewCurrProfile.js');
    await new Promise(setImmediate);

    expect(document.getElementById('userName').textContent).toBe('Could not display user.');
    expect(document.getElementById('userBio').textContent).toBe('');
    expect(document.getElementById('userUni').textContent).toBe('');
    expect(document.getElementById('userDepartment').textContent).toBe('');
  });
});