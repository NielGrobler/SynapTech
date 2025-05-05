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
import { fetchinfo } from './settings.js';

vi.mock('./userInfo.js', () => ({
  default: {
    fetchFromApi: vi.fn()
  }
}));

global.fetch = vi.fn();

describe('Settings Page', () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Set up JSDOM with the HTML file
    dom = await JSDOM.fromFile('./public/settings.html', {
      runScripts: 'dangerously',
      resources: 'usable'
    });
    window = dom.window;
    document = window.document;

    // Mock the confirm and alert functions
    window.confirm = vi.fn();
    window.alert = vi.fn();

    window.initialize = vi.fn();

    // Add the script to the DOM (this will execute the imported settings.js)
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
        import { fetchinfo, initialize } from './settings.js';
        window.fetchinfo = fetchinfo;
        window.initialize = initialize;
        document.addEventListener("DOMContentLoaded", initialize);
    `;
    document.body.appendChild(script);

    // Wait for DOMContentLoaded
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should populate form fields with user info', async () => {
    // Mock user info
    const mockUserInfo = {
      id: '123',
      name: 'test_user',
      bio: 'Test bio',
    };
    userInfo.fetchFromApi.mockResolvedValue(mockUserInfo);
    
    // Mock API response for university/department
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ 
        university: 'Test Uni', 
        department: 'Test Dept' }])
    });

    await window.initialize();

    // Check if fields are populated correctly
    expect(document.getElementById('username').value).toBe('test_user'); 
    expect(document.getElementById('bio').value).toBe('Test bio');
    expect(document.getElementById('university').value).toBe('Test Uni');
    expect(document.getElementById('department').value).toBe('Test Dept');
  });

  it('should set default bio when bio is not provided', async () => {
    // Mock user info with no bio
    const mockUserInfo = {
      id: '123',
      name: 'test_user',
      bio: null,
    };
    userInfo.fetchFromApi.mockResolvedValue(mockUserInfo);
    
    // Mock API response for university/department
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve([{ 
        university: 'Test Uni', 
        department: 'Test Dept' }])
    });

    // Trigger the fetchinfo function
    await fetchinfo();

    // Check if default bio is set
    expect(document.getElementById('bio').value).toBe('No bio.');
  });

  it('should cancel deletion when not confirmed', async () => {
    // Set up mocks
    window.confirm.mockReturnValue(false);
    
    // Trigger delete button click
    document.getElementById('deleteButton').click();

    // Verify behavior
    expect(window.confirm).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith('Account deletion canceled.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle API errors during deletion', async () => {
    // Set up mocks
    window.confirm.mockReturnValue(true);
    const mockUserInfo = { id: '123' };
    userInfo.fetchFromApi.mockResolvedValue(mockUserInfo);
    
    // Mock failed API response
    fetch.mockResolvedValueOnce({
      ok: false
    });

    // Trigger delete button click
    document.getElementById('deleteButton').click();
    
    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify behavior
    expect(window.alert).toHaveBeenCalledWith('An error occurred: API error');
  });

  it('should handle network errors during deletion', async () => {
    // Set up mocks
    window.confirm.mockReturnValue(true);
    const mockUserInfo = { id: '123' };
    userInfo.fetchFromApi.mockResolvedValue(mockUserInfo);
    
    // Mock network error
    fetch.mockRejectedValueOnce(new Error('Network error'));

    // Trigger delete button click
    document.getElementById('deleteButton').click();
    
    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    // Verify behavior
    expect(window.alert).toHaveBeenCalledWith('An error occurred: Network error');
  });

  it('should handle errors when fetching user info', async () => {
    // Mock failed user info fetch
    userInfo.fetchFromApi.mockRejectedValue(new Error('Fetch error'));
    console.error = vi.fn();

    // Trigger the fetchinfo function
    await fetchinfo();

    // Verify behavior
    expect(console.error).toHaveBeenCalledWith('Error loading user:', expect.any(Error));
  });
});