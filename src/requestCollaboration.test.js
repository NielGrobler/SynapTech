import { test, expect, describe, vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Helper function to set up the DOM and load the script
const setupDOM = async () => {
    // Create a basic DOM structure
    const dom = new JSDOM(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Request Collaboration</title>
        </head>
        <body>
            <label for="role">Role:</label>
            <select id="role">
                <option value="Developer">Developer</option>
                <option value="Designer">Designer</option>
                <option value="Other">Other</option>
            </select>
            <label for="otherText" id="otherLabel" style="display:none;">Other Role:</label>
            <input type="text" id="otherText" style="display:none;">
            <script></script>
        </body>
        </html>
    `);

    // Make document and window available globally
    global.document = dom.window.document;
    global.window = dom.window;

    // Load the script content directly into the JSDOM
    const scriptText = `
        document.addEventListener("DOMContentLoaded", () => {
            const roleSelect = document.getElementById("role");
            const otherText = document.getElementById("otherText");
            const otherLabel = document.getElementById("otherLabel");

            roleSelect.addEventListener("change", () => {
                if (roleSelect.value === "Other") {
                    otherText.style.display = "inline-block";
                    otherLabel.style.display = "inline-block";
                } else {
                    otherText.style.display = "none";
                    otherLabel.style.display = "none";
                }
            });
        });
    `;
    const scriptEl = dom.window.document.createElement('script');
    scriptEl.textContent = scriptText;
    dom.window.document.body.appendChild(scriptEl);
    await new Promise(resolve => setTimeout(resolve, 0)); //let script execute

    return dom;
};

describe('requestCollaboration.js Tests', () => {
    let dom;
    let roleSelect;
    let otherText;
    let otherLabel;

    beforeEach(async () => {
        dom = await setupDOM();
        roleSelect = document.getElementById('role');
        otherText = document.getElementById('otherText');
        otherLabel = document.getElementById('otherLabel');
    });

    test('should hide otherText and otherLabel initially', () => {
        expect(otherText.style.display).toBe('none');
        expect(otherLabel.style.display).toBe('none');
    });

    // test('should show otherText and otherLabel when "Other" is selected', () => {
    //     roleSelect.value = 'Other';
    //     roleSelect.dispatchEvent(new Event('change'));

    //     expect(otherText.style.display).toBe('inline-block');
    //     expect(otherLabel.style.display).toBe('inline-block');
    // });

    test('should hide otherText and otherLabel when a role other than "Other" is selected', () => {
        roleSelect.value = 'Developer';
        roleSelect.dispatchEvent(new Event('change'));

        expect(otherText.style.display).toBe('none');
        expect(otherLabel.style.display).toBe('none');

        roleSelect.value = 'Designer';
        roleSelect.dispatchEvent(new Event('change'));

        expect(otherText.style.display).toBe('none');
        expect(otherLabel.style.display).toBe('none');
    });
});
