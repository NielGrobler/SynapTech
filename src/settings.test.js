import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks
let userInfoMock;

beforeEach(() => {
	// Only include elements needed for the delete test
	document.body.innerHTML = `
		<button id="deleteButton">Delete</button>
		<!-- Add minimal required elements to prevent null errors -->
		<button id="changeButton"></button>
		<form id="resetButton"></form>
	`;

	// Mock userInfo
	userInfoMock = {
		fetchFromApi: vi.fn().mockResolvedValue({ id: "123" }),
	};
	vi.mock("./userInfo.js", () => ({ default: userInfoMock }));

	// Mock window methods
	vi.spyOn(window, "confirm").mockReturnValue(false);
	vi.spyOn(window, "alert").mockImplementation(() => {});
	
	// Mock window.location
	delete window.location;
	window.location = { href: '' };

	// Mock fetch
	global.fetch = vi.fn();
});

afterEach(() => {
	vi.clearAllMocks();
	// Restore window.location
	window.location = location;
});

describe("settings.js  Module Tests", () => {
	it("should not delete account if user cancels", async () => {
		await import("./settings.js");
		
		// Trigger the delete button click
		document.getElementById("deleteButton").click();
		
		// Verify behavior
		expect(window.confirm).toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(window.location.href).toBe("");
	});
});