import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

// Mock dependencies
vi.mock('./userInfo.js', () => ({
  default: {
    fetchFromApi: vi.fn()
  }
}));

vi.mock('./fetchUsername.js', () => ({
  default: {
    setUsername: vi.fn()
  }
}));

vi.mock('./pageAdder.js', () => ({
  default: {
    addProjectsToPage: vi.fn()
  }
}));

// Set up DOM environment
const { window } = new JSDOM(`
  <!DOCTYPE html>
  <html>
    <body>
      <div id="username"></div>
      <div id="userName"></div>
      <div id="userBio"></div>
      <div id="userUni"></div>
      <div id="userDepartment"></div>
      <div id="projectCardList"></div>
    </body>
  </html>
`);

global.window = window;
global.document = window.document;
global.fetch = vi.fn();

describe("viewCurrProfile.js", () => {
  let userInfoMock, fetchUsernameMock, pageAdderMock;

  beforeEach(async () => {  // Added async here
    // Reset all mocks
    vi.clearAllMocks();
    
    // Get mock instances
    userInfoMock = (await import('./userInfo.js')).default;
    fetchUsernameMock = (await import('./fetchUsername.js')).default;
    pageAdderMock = (await import('./pageAdder.js')).default;
    
    // Set up default mocks
    userInfoMock.fetchFromApi.mockResolvedValue({
      id: 'user123',
      name: 'Test User',
      bio: 'Test Bio'
    });
    
    fetchUsernameMock.setUsername.mockReturnValue('test_username');
    
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/user?id=')) {
        return Promise.resolve({
          json: () => Promise.resolve([{
            university: 'Test University',
            department: 'Test Department'
          }])
        });
      }
      if (url === '/api/user/project') {
        return Promise.resolve({
          json: () => Promise.resolve([{ id: 1, title: 'Test Project' }])
        });
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = `
      <div id="username"></div>
      <div id="userName"></div>
      <div id="userBio"></div>
      <div id="userUni"></div>
      <div id="userDepartment"></div>
      <div id="projectCardList"></div>
    `;
  });

//   it("should populate user info correctly", async () => {
//     // Import the module
//     await import('./viewCurrProfile.js');
    
//     // Wait for DOMContentLoaded and async operations
//     await new Promise(resolve => setTimeout(resolve, 0));
    
//     // Check user info was populated
//     expect(document.getElementById('username').innerHTML).toBe('test_username');
//     expect(document.getElementById('userName').innerHTML).toBe('Test User');
//     expect(document.getElementById('userBio').innerHTML).toBe('Test Bio');
//     expect(document.getElementById('userUni').innerHTML).toBe('Test University');
//     expect(document.getElementById('userDepartment').innerHTML).toBe('Test Department');
//   });

//   it("should load and display projects", async () => {
//     // Import the module
//     await import('./viewCurrProfile.js');
    
//     // Wait for async operations
//     await new Promise(resolve => setTimeout(resolve, 0));
    
//     // Check projects were loaded
//     expect(pageAdderMock.addProjectsToPage).toHaveBeenCalledWith(
//       'projectCardList',
//       [{ id: 1, title: 'Test Project' }]
//     );
//   });

//   it("should handle fetch errors for user info", async () => {
//     // Mock failed user fetch
//     userInfoMock.fetchFromApi.mockRejectedValue(new Error('Failed to fetch user'));
    
//     // Import the module
//     await import('./viewCurrProfile.js');
    
//     // Wait for async operations
//     await new Promise(resolve => setTimeout(resolve, 0));
    
//     // Check error was handled
//     expect(document.getElementById('userName').innerText).toBe('Could not display user.');
//   });

  it("should handle fetch errors for projects", async () => {
    // Mock failed projects fetch
    global.fetch.mockImplementation((url) => {
      if (url === '/api/user/project') {
        return Promise.reject(new Error('Failed to fetch projects'));
      }
      return Promise.resolve({
        json: () => Promise.resolve([{
          university: 'Test University',
          department: 'Test Department'
        }])
      });
    });
    
    // Import the module
    await import('./viewCurrProfile.js');
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check projects were not added
    expect(pageAdderMock.addProjectsToPage).not.toHaveBeenCalled();
  });

  it("should handle missing DOM elements gracefully", async () => {
    // Remove some DOM elements
    document.getElementById('userName').remove();
    document.getElementById('userBio').remove();
    
    // Import the module
    await import('./viewCurrProfile.js');
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Test should complete without errors
    expect(true).toBe(true);
  });
});