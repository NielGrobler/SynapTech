import { describe, it, expect, beforeEach } from 'vitest';

// Import the file to trigger the DOMContentLoaded listener
import './requestCollaboration.js';

describe('requestCollaboration.js', () => {
  beforeEach(() => {
    // Set up the DOM structure required for the script
    document.body.innerHTML = `
      <select id="role">
        <option value="Developer">Developer</option>
        <option value="Other">Other</option>
      </select>
      <label id="otherLabel" style="display: none;">Please specify</label>
      <input id="otherText" style="display: none;" />
    `;

    // Re-dispatch DOMContentLoaded to trigger the script logic
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('shows input and label when "Other" is selected', () => {
    const roleSelect = document.getElementById('role');
    const otherText = document.getElementById('otherText');
    const otherLabel = document.getElementById('otherLabel');

    roleSelect.value = 'Other';
    roleSelect.dispatchEvent(new Event('change'));

    expect(otherText.style.display).toBe('inline-block');
    expect(otherLabel.style.display).toBe('inline-block');
  });

  it('hides input and label when a non-"Other" value is selected', () => {
    const roleSelect = document.getElementById('role');
    const otherText = document.getElementById('otherText');
    const otherLabel = document.getElementById('otherLabel');

    // First set to "Other" to make sure they are visible
    roleSelect.value = 'Other';
    roleSelect.dispatchEvent(new Event('change'));

    // Then switch to "Developer"
    roleSelect.value = 'Developer';
    roleSelect.dispatchEvent(new Event('change'));

    expect(otherText.style.display).toBe('none');
    expect(otherLabel.style.display).toBe('none');
  });
});
