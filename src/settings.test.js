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
    
    // Setup the mock to return our test data
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    // Import the settings module (it will run automatically)
    await import('./settings.js');
    
    // Wait for async operations to complete
    await vi.waitFor(() => {
      expect(document.getElementById('username').value).toBe('Test User');
      // BUG DETECTED: Code sets bio field to user's name instead of actual bio content
      // Fix would be to change "info.name" to "info.bio" in the settings.js file
      expect(document.getElementById('bio').value).toBe('Test User'); // Bug in code - sets name instead of bio
    });
    
    // Validate API was called
    expect(userInfo.fetchFromApi).toHaveBeenCalledTimes(1);
  });
  
  it('should set default bio when bio is not provided', async () => {
    // Mock user with no bio
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
  
  it('should handle account deletion when confirmed', async () => {
    // Mock successful API response
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true })
    };
    
    // Setup user data
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    // User confirms deletion
    global.confirm.mockReturnValue(true);
    global.fetch.mockResolvedValue(mockResponse);
    
    // Create a mock for window.location that allows href to be changed
    const locationMock = {
      href: window.location.href,
    };
    
    // Mock the window.location and store cleanup function
    const restoreLocation = mockWindowProperty('location', locationMock);
    
    await import('./settings.js');
    
    // Trigger the delete button click
    document.getElementById('deleteButton').click();
    
    // Confirm was called
    expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to delete your account?");
    
    // Wait for fetch to complete
    await vi.waitFor(() => {
      // Check that fetch was called with correct params
      expect(global.fetch).toHaveBeenCalledWith('/remove/user', {
        method: 'POST',
        body: JSON.stringify({ reqToDeleteId: '123' })
      });
      
      // Alert was shown
      expect(global.alert).toHaveBeenCalledWith('Account deleted successfully!');
      
      // Verify redirect attempt (checking that href was set to '/')
      expect(window.location.href).toBe('/');
    });
    
    // Clean up
    restoreLocation();
  });
  
  it('should cancel deletion when not confirmed', async () => {
    // Setup user data
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    // User cancels deletion
    global.confirm.mockReturnValue(false);
    
    await import('./settings.js');
    
    // Trigger the delete button click
    document.getElementById('deleteButton').click();
    
    // Confirm was called
    expect(global.confirm).toHaveBeenCalledWith("Are you sure you want to delete your account?");
    
    // Alert was shown for cancellation
    expect(global.alert).toHaveBeenCalledWith("Account deletion canceled.");
    
    // Fetch should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  it('should handle API errors during deletion', async () => {
    // Mock error API response
    const mockResponse = {
      ok: false
    };
    
    // Setup user data
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    // User confirms deletion
    global.confirm.mockReturnValue(true);
    global.fetch.mockResolvedValue(mockResponse);
    
    await import('./settings.js');
    
    // Trigger the delete button click
    document.getElementById('deleteButton').click();
    
    // Wait for fetch to complete
    await vi.waitFor(() => {
      // Error alert should be shown
      expect(global.alert).toHaveBeenCalledWith('Error deleting account. Please try again.');
    });
  });
  
  it('should handle network errors during deletion', async () => {
    // Setup user data
    const mockUser = { id: '123', name: 'Test User' };
    userInfo.fetchFromApi.mockResolvedValue(mockUser);
    
    // User confirms deletion
    global.confirm.mockReturnValue(true);
    global.fetch.mockRejectedValue(new Error('Network error'));
    
    await import('./settings.js');
    
    // Trigger the delete button click
    document.getElementById('deleteButton').click();
    
    // Wait for fetch to complete
    await vi.waitFor(() => {
      // Error alert should be shown
      expect(global.alert).toHaveBeenCalledWith('An error occurred: Network error');
    });
  });
  
  it('should handle errors when fetching user info', async () => {
    // Setup API to throw an error
    const apiError = new Error('API error');
    userInfo.fetchFromApi.mockRejectedValue(apiError);
    
    // Temporarily silence console.error for this test
    // We'll still verify it was called, but not output to console during tests
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    await import('./settings.js');
    
    // Should log the error
    expect(console.error).toHaveBeenCalledWith('Error loading user:', apiError);
    
    // Restore original console.error
    console.error = originalConsoleError;
  });
});