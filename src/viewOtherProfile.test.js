import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock pageAdder module
const mockPageAdder = {
  addProjectsToPage: vi.fn()
};
vi.mock('./pageAdder.js', () => ({
  default: mockPageAdder
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('viewOtherProfile.js', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Set up DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="name"></div>
          <div id="university"></div>
          <div id="department"></div>
          <div id="bio"></div>
          <div id="projects"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000/profile?id=123',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window;
    
    // Set up global objects
    global.document = document;
    global.window = window;
    global.URLSearchParams = window.URLSearchParams;
    
    // Reset mocks
    vi.clearAllMocks();
    fetch.mockClear();
    mockPageAdder.addProjectsToPage.mockClear();
    
    // Remove any existing suspend button
    const existingButton = document.getElementById('suspendButton');
    if (existingButton) {
      existingButton.remove();
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
    dom.window.close();
  });

  it('should handle missing user ID gracefully', async () => {
    // Create a new DOM with no ID parameter
    const domWithoutId = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <div id="userName"></div>
          <div id="userUni"></div>
          <div id="userDepartment"></div>
          <div id="userBio"></div>
          <div id="projects"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000/profile',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    // Update global references
    global.document = domWithoutId.window.document;
    global.window = domWithoutId.window;
    global.URLSearchParams = domWithoutId.window.URLSearchParams;

    // Mock admin API call
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(false)
    });

    // Import the module
    await import('./viewOtherProfile.js');

    // Trigger DOMContentLoaded event
    const event = new domWithoutId.window.Event('DOMContentLoaded');
    domWithoutId.window.document.dispatchEvent(event);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 100));

    // Should only call admin check
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/admin');

    // Clean up
    domWithoutId.window.close();
  });

  it('should handle fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock admin API call
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(false)
    });

    // Mock isSuspended API call
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue(false)
    });

    // Mock user API call
    fetch.mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue([{
        name: 'Test User',
        university: 'Test University',
        department: 'Test Department',
        bio: 'Test Bio'
      }])
    });

    // Mock projects API call with a rejected promise to trigger error handling
    fetch.mockRejectedValueOnce(new Error('Network error'));

    // Import the module
    await import('./viewOtherProfile.js');

    // Trigger DOMContentLoaded event
    const event = new window.Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Wait longer for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Debug: Check what console.error was called with
    console.log('Console error calls:', consoleSpy.mock.calls);

    // Check if any error was logged (could be different message)
    expect(consoleSpy).toHaveBeenCalled();
    
    // If the specific message format is different, you can adjust this assertion
    // based on what gets logged above
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});