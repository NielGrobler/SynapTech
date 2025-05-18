import { vi, test, expect, describe, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the fetch function
global.fetch = vi.fn();

// Helper function to set up the DOM and load the script
const setupDOM = async (urlParams = {}) => {
    // Create a basic DOM structure
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Review Project</title>
        </head>
        <body>
            <input type="text" id="rating" value=""/>
            <textarea id="comment"></textarea>
            <button id="submitReviewBtn">Submit Review</button>
            <div id="error-message"></div>
            <div id="success-message"></div>
            <script></script>
        </body>
        </html>
    `, {
        url: `http://localhost/?${new URLSearchParams(urlParams).toString()}`, // Mock URL
        runScripts: 'dangerously', // Allow scripts to run
        resources: 'usable'       //load linked resources
    });

    // Make document and window available globally
    global.document = dom.window.document;
    global.window = dom.window;

    // Load the script content directly into the JSDOM
    const scriptText = `
        document.addEventListener('DOMContentLoaded', function () {
            function getProjectId() {
                const urlParams = new URLSearchParams(window.location.search);
                return urlParams.get('id') || '12345';
            }
            window.getProjectId = getProjectId; // Make getProjectId globally available.

            document.getElementById('submitReviewBtn').addEventListener('click', function () {
                const review = {
                    projectId: getProjectId(),
                    rating: document.getElementById('rating').value,
                    comment: document.getElementById('comment').value
                };

                if (!review.rating || !review.comment) {
                    alert('Please fill all required fields');
                    return;
                }

                fetch('/api/review', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(review),
                })
                    .then(res => res.json())
                    .then(data => {
                        console.log('Server response:', data);
                        if (data.message === 'Review submitted!') {
                            window.location.href = data.redirect || '/successfulReviewPost';
                        } else if (data.error) {
                            alert('Error: ' + data.error);
                        }
                    })
                    .catch(err => {
                        console.error('Error:', err);
                        alert('Failed to submit review. Please try again.');
                    });
            });
        });
    `;
    const scriptEl = dom.window.document.createElement('script');
    scriptEl.textContent = scriptText;
    dom.window.document.body.appendChild(scriptEl);
    await new Promise(resolve => setTimeout(resolve, 0)); //let script execute
    return dom;
};

describe('reviewProject.js Tests', () => {
    // Reset DOM and mocks before each test
    beforeEach(async () => { // Make beforeEach async to handle setupDOM
        vi.clearAllMocks();
        // Reset the DOM to a fresh state before each test.  Important for isolation.
        const dom = await setupDOM();
        global.document = dom.window.document;
        global.window = dom.window;

    });

    test('getProjectId function returns default ID if no parameter is present', async () => {
        // Arrange
        const getProjectId = global.window.getProjectId;

        // Act
        const projectId = getProjectId();

        // Assert
        expect(projectId).toBe('12345');
    });

    test('submitReviewBtn click handler prevents submission with missing fields', async () => {
        // Arrange
        const submitButton = document.getElementById('submitReviewBtn');
        const alertSpy = vi.spyOn(global.window, 'alert').mockImplementation(() => { }); // prevent actual alert

        // Act
        document.getElementById('rating').value = ''; // Missing rating
        document.getElementById('comment').value = 'Test comment';
        submitButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        // Assert
        expect(alertSpy).toHaveBeenCalledWith('Please fill all required fields');
        expect(fetch).not.toHaveBeenCalled(); // Ensure fetch was not called
    });
});
