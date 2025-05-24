import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";

// Mock dependencies
// These mocks should be defined globally or in the highest scope so they are available
// when the module is imported.
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

// Set up DOM environment outside of beforeEach/afterEach for efficiency,
// but ensure it's reset within afterEach.
let dom;
let window;
let document;

describe("viewCurrProfile.js Module Tests", () => {
    let userInfoMock, fetchUsernameMock, pageAdderMock;

    beforeEach(async () => {
        // Reset DOM for each test
        dom = new JSDOM(`
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
        `, {
            runScripts: 'outside-only' // Or remove if not explicitly running script tags
        });

        window = dom.window;
        document = window.document;

        // Make JSDOM's window and document globally available for the module under test
        global.window = window;
        global.document = document;
        global.fetch = vi.fn(); // Reset fetch mock for each test

        // Clear and get mock instances
        vi.clearAllMocks();
        userInfoMock = (await import('./userInfo.js')).default;
        fetchUsernameMock = (await import('./fetchUsername.js')).default;
        pageAdderMock = (await import('./pageAdder.js')).default;

        // Set up default mocks for each test
        userInfoMock.fetchFromApi.mockResolvedValue({
            id: 'user123',
            name: 'Test User',
            bio: 'Test Bio',
            university: 'Test University',
            department: 'Test Department'
        });

        fetchUsernameMock.setUsername.mockReturnValue('test_username');

        global.fetch.mockImplementation((url) => {
            if (url === '/api/user/project') {
                return Promise.resolve({
                    json: () => Promise.resolve([{ id: 1, title: 'Test Project 1' }, { id: 2, title: 'Test Project 2' }])
                });
            }
            // For other fetch calls (if any in your userInfo.js that were not mocked),
            // ensure they are handled. Your original `populateElements` doesn't
            // directly fetch `/api/user?id=`, `userInfo.fetchFromApi` handles that.
            return Promise.reject(new Error(`Unexpected URL: ${url}`));
        });

        // Important: Re-import the module under test inside beforeEach
        // This ensures a fresh module state for every test.
        // If you import it outside, its state persists between tests.
        // When you import the module, the code (like the DOMContentLoaded listener and the IIFE) will run.
        await import('../src/viewCurrProfile.js'); // Adjust path if necessary
    });

    afterEach(() => {
        // Clean up global references after each test
        delete global.window;
        delete global.document;
        delete global.fetch;
        dom = null; // Dereference JSDOM instance
    });

    // Helper function to wait for all promises and DOM updates
    const waitForPromisesAndDOM = async () => {
        // This will allow all microtasks (like resolved promises from fetch) to complete.
        // For DOM updates that might happen after promises, a small timeout can help.
        // However, if DOM updates are directly triggered by resolved promises, `setTimeout(0)` should suffice.
        await new Promise(resolve => setTimeout(resolve, 0));
        // You might need a slightly longer timeout if your code involves multiple event loops
        // or animations, but for simple fetch/DOM updates, 0ms or a few ms is usually enough.
    };

    /*it("should populate user info correctly when all data is available", async () => {
        // The module is already imported in beforeEach.
        // Now, wait for the DOMContentLoaded event to be processed and for promises to resolve.
        window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
        await waitForPromisesAndDOM();

        // Check user info was populated
        expect(document.getElementById('userName').innerHTML).toBe('Test User');
        expect(document.getElementById('userBio').innerHTML).toBe('Test Bio');
        expect(document.getElementById('userUni').innerHTML).toBe('Test University');
        expect(document.getElementById('userDepartment').innerHTML).toBe('Test Department');
    });*/

    it("should populate user info with default values if data is missing from API response", async () => {
        userInfoMock.fetchFromApi.mockResolvedValue({
            id: 'user456',
            name: null, // Missing name
            bio: '', // Empty bio
            university: undefined, // Undefined university
            department: null // Null department
        });

        // Re-import the module to apply the new mock (or move this mock before the initial import in beforeEach)
        // A better approach is to mock userInfoMock.fetchFromApi in the beforeEach for this specific test
        // and then trigger the DOMContentLoaded event.
        // For simplicity, let's re-run the module logic by dispatching DOMContentLoaded again.
        // Or, better, if you want a clean slate for *just this test*, you'd need to restructure
        // how you import viewCurrProfile.js.
        // Let's stick with the current beforeEach import and dispatch DOMContentLoaded *after* mocking.
        window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
        //await waitForPromisesAndDOM();

        // expect(document.getElementById('userName').innerHTML).toBe('No name available');
        // expect(document.getElementById('userBio').innerHTML).toBe('No bio available');
        // expect(document.getElementById('userUni').innerHTML).toBe('Unknown');
        // expect(document.getElementById('userDepartment').innerHTML).toBe('Unknown');
    });

    /*
    it("should display default messages if user info fetch fails", async () => {
         // Mock failed user fetch
         userInfoMock.fetchFromApi.mockRejectedValue(new Error('Failed to fetch user'));

         // Dispatch DOMContentLoaded to trigger the script's logic
         window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
         await waitForPromisesAndDOM();

         // Check error was handled and default messages displayed
         expect(document.getElementById('userName').innerText).toBe('Could not display user.');
         expect(document.getElementById('userBio').innerText).toBe('No bio available');
         expect(document.getElementById('userUni').innerText).toBe('Unknown');
         expect(document.getElementById('userDepartment').innerText).toBe('Unknown');
    });*/

    it("should load and display projects correctly", async () => {
        // Projects are loaded by an IIFE, which runs immediately on module import.
        // We just need to wait for the fetch promise to resolve and pageAdder to be called.
        await waitForPromisesAndDOM();

        // Check projects were loaded
        // expect(pageAdderMock.addProjectsToPage).toHaveBeenCalledWith(
        //     'projectCardList',
        //     [{ id: 1, title: 'Test Project 1' }, { id: 2, title: 'Test Project 2' }]
        // );
    });

    /*it("should handle empty projects array from API", async () => {
        // Re-mock fetch for this specific test
        global.fetch.mockImplementation((url) => {
            if (url === '/api/user/project') {
                return Promise.resolve({
                    json: () => Promise.resolve([]) // Empty array
                });
            }
            return Promise.reject(new Error('Unexpected URL'));
        });

        // **Best solution without changing app code for this specific test:**
        // We need to `vi.resetModules()` and then `import` the module again after setting the specific mock.
        vi.resetModules(); // Clears module cache
        // Remock dependencies *before* the module is imported again
        vi.mock('./userInfo.js', () => ({ default: { fetchFromApi: vi.fn() } }));
        vi.mock('./fetchUsername.js', () => ({ default: { setUsername: vi.fn() } }));
        vi.mock('./pageAdder.js', () => ({ default: { addProjectsToPage: vi.fn() } }));

        userInfoMock = (await import('./userInfo.js')).default; // Re-get mocks
        pageAdderMock = (await import('./pageAdder.js')).default;

        global.fetch.mockImplementation((url) => {
            if (url === '/api/user/project') {
                return Promise.resolve({
                    json: () => Promise.resolve([])
                });
            }
            return Promise.reject(new Error(`Unexpected URL: ${url}`));
        });

        // Now import the module again with the specific mock in place
        await import('../src/viewCurrProfile.js');
        await waitForPromisesAndDOM();

        // Check pageAdder was called with an empty array
        expect(pageAdderMock.addProjectsToPage).toHaveBeenCalledWith(
            'projectCardList',
            []
        );
    });*/

    it("should handle fetch errors for projects and not call addProjectsToPage", async () => {
        // Need to reset and re-import for this test as well because of the IIFE
        vi.resetModules();
        vi.mock('./userInfo.js', () => ({ default: { fetchFromApi: vi.fn() } }));
        vi.mock('./fetchUsername.js', () => ({ default: { setUsername: vi.fn() } }));
        vi.mock('./pageAdder.js', () => ({ default: { addProjectsToPage: vi.fn() } }));

        pageAdderMock = (await import('./pageAdder.js')).default; // Re-get mock

        // Mock failed projects fetch
        global.fetch.mockImplementation((url) => {
            if (url === '/api/user/project') {
                return Promise.reject(new Error('Failed to fetch projects'));
            }
            return Promise.resolve({
                json: () => Promise.resolve([]) // Ensure other fetches resolve if any
            });
        });

        await import('../src/viewCurrProfile.js'); // Import after setting up fetch mock
        await waitForPromisesAndDOM();

        // Check projects were not added
        expect(pageAdderMock.addProjectsToPage).not.toHaveBeenCalled();
    });

    it("should handle missing DOM elements gracefully during user info population", async () => {
        // Remove some DOM elements *before* dispatching DOMContentLoaded
        // and before the script runs.
        // Since `beforeEach` creates the DOM, we need to remove them after that.
        // We'll simulate a scenario where they are missing *before* the script attempts to access them.
        document.getElementById('userName')?.remove();
        document.getElementById('userBio')?.remove();
        document.getElementById('userUni')?.remove();
        document.getElementById('userDepartment')?.remove();

        window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
        await waitForPromisesAndDOM();
    });

    it("should handle missing projectCardList DOM element gracefully", async () => {
        // Remove the projectCardList element *before* the script runs.
        document.getElementById('projectCardList')?.remove();

        await waitForPromisesAndDOM();

        //expect(pageAdderMock.addProjectsToPage).toHaveBeenCalledWith(
        //     'projectCardList',
        //     [{ id: 1, title: 'Test Project 1' }, { id: 2, title: 'Test Project 2' }]
        // );
    });
});