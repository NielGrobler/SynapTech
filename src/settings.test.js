import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("settings.js Module Tests", () => {
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
  });

  describe("Initialization", () => {
    it("should fetch and populate user info on DOMContentLoaded", () => {
      expect(document.getElementById("username").value).toBe("Test User");
      expect(document.getElementById("bio").value).toBe("Test bio");
    });

    /*it("should handle empty user info fields", async () => {
      userInfoMock.fetchFromApi.mockResolvedValueOnce({ id: "123" });
      await import("./settings.js");
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await new Promise(process.nextTick);
      
      expect(document.getElementById("username").value).toBe("");
    });*/
  });
});