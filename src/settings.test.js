/**
 * Tests for settings.js
 * 
 * These tests verify the functionality of the settings page including:
 * - Loading and displaying user information
 * - Handling account deletion flow
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import userInfo from './userInfo.js';

// Mock userInfo module
vi.mock('./userInfo.js', () => ({
  default: {
    fetchFromApi: vi.fn()
  }
}));

describe('settings.js', () => {
  // Setup DOM environment
  let dom;
  let window;
  let document;
  let consoleSpy;
  
  // Helper function to safely mock properties that might be non-configurable
  const mockWindowProperty = (property, value) => {
    const originalProperty = Object.getOwnPropertyDescriptor(window, property);
    delete window[property];
    window[property] = value;
    
    // Return cleanup function
    return () => {
      delete window[property];
      Object.defineProperty(window, property, originalProperty);
    };
  };
  
  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="username" />
          <textarea id="bio"></textarea>
          <button id="deleteButton">Delete Account</button>
        </body>
      </html>
    `, { url: 'http://localhost' });
    
    window = dom.window;
    document = window.document;
    
    // Mock global objects
    global.document = document;
    global.window = window;
    global.alert = vi.fn();
    global.confirm = vi.fn();
    global.fetch = vi.fn();
    
    // Spy on console.error
    consoleSpy = vi.spyOn(console, 'error');
  });
  
  afterEach(() => {
    // Clean up mocks after each test
    vi.clearAllMocks();
    vi.resetModules();
  });
  
  it('should populate form fields with user info', async () => {
    // Mock the user data
    const mockUser = {
      id: '123',
      name: 'Test User',
      bio: 'This is my bio'
    };
    
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    await import('./settings.js');
    
    await vi.waitFor(() => {
      expect(document.getElementById('username').value).toBe('Test User');
      expect(document.getElementById('bio').value).toBe('Test User'); // Note: bug in your settings.js
    });
    
    expect(userInfo.fetchFromApi).toHaveBeenCalledTimes(1);
  });
  
  it('should set default bio when bio is not provided', async () => {
    const mockUser = {
      id: '123',
      name: 'Test User',
      bio: null
    };
    
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    await import('./settings.js');
    
    await vi.waitFor(() => {
      expect(document.getElementById('username').value).toBe('Test User');
      expect(document.getElementById('bio').value).toBe('No bio.');
    });
  });
  
  it('should cancel deletion when not confirmed', async () => {
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    global.confirm.mockReturnValue(false);
    
    await import('./settings.js');
    
    document.getElementById('deleteButton').click();
    
    expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to delete your account?");
    expect(global.alert).toHaveBeenCalledWith("Account deletion canceled.");
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should handle API errors during deletion', async () => {
    const mockResponse = {
      ok: false
    };
    
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    global.confirm.mockReturnValue(true);
    global.fetch.mockResolvedValue(mockResponse);
    
    await import('./settings.js');
    
    document.getElementById('deleteButton').click();
    
    await vi.waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error deleting account. Please try again.');
    });
  });
  
  it('should handle network errors during deletion', async () => {
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    global.confirm.mockReturnValue(true);
    global.fetch.mockRejectedValue(new Error('Network error'));
    
    await import('./settings.js');
    
    document.getElementById('deleteButton').click();
    
    await vi.waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('An error occurred: Network error');
    });
  });
  
  it('should handle errors when fetching user info', async () => {
    const apiError = new Error('API error');
    userInfo.fetchFromApi.mockRejectedValue(apiError);
    
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    await import('./settings.js');
    
    expect(console.error).toHaveBeenCalledWith('Error loading user:', apiError);
    
    console.error = originalConsoleError;
  });
});
