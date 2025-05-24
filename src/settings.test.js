import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock userInfo module *before* importing settings.js
vi.mock("./userInfo.js", () => ({
  default: {
    fetchFromApi: vi.fn().mockResolvedValue({ id: "123" }),
  },
}));

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

