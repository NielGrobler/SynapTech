import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

  let userInfoMock;

  beforeEach(async () => {
    // Set up the DOM elements needed for all tests
    document.body.innerHTML = `
      <input id="username" />
      <textarea id="bio"></textarea>
      <input id="university" />
      <input id="department" />
      <button id="changeButton">Change</button>
      <form id="resetButton"></form>
      <button id="deleteButton">Delete</button>
    `;
  });
// Mock userInfo module *before* importing settings.js
vi.mock("./userInfo.js", () => ({
  default: {
    fetchFromApi: vi.fn().mockResolvedValue({ id: "123" }),
  },
}));

describe("settings.js Module Tests", () => {
  describe("settings.js", () => {
    let originalLocation;

    beforeEach(async () => {
      // Set up DOM elements required for the test
      document.body.innerHTML = `
        <button id="deleteButton">Delete</button>
        <button id="changeButton"></button>
        <form id="resetButton"></form>
      `;

      // Mock window.confirm and window.alert
      vi.spyOn(window, "confirm").mockReturnValue(false);
      vi.spyOn(window, "alert").mockImplementation(() => {});

      // Save original location and replace it with mock
      originalLocation = window.location;
      delete window.location;
      window.location = { href: "" };

      // Mock fetch globally
      global.fetch = vi.fn();

      // Import settings.js after mocks are ready
      await import("./settings.js");

      // Mock userInfo
      userInfoMock = {
        fetchFromApi: vi.fn().mockResolvedValue({
          id: "123",
          name: "Test User",
          bio: "Test bio",
          university: "Test University",
          department: "Test Department"
        }),
      };
      vi.doMock("./userInfo.js", () => ({ default: userInfoMock }));

      // Import the module after all mocks are set up
      await import("./settings.js");
      
      // Manually trigger DOMContentLoaded and wait for initial fetch
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(process.nextTick);
    });

    afterEach(() => {
      vi.clearAllMocks();

      // Restore window.location to original
      window.location = originalLocation;
    });

    it("does not delete account if user cancels", () => {
      // Trigger the delete button click
      document.getElementById("deleteButton").click();

      // Assert confirm was called
      expect(window.confirm).toHaveBeenCalled();

      // Assert fetch was NOT called (cancelled)
      expect(fetch).not.toHaveBeenCalled();

      // Assert location.href did NOT change
      expect(window.location.href).toBe("");
    });
  });
});
