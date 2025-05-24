import { describe, it, expect, vi, beforeEach } from "vitest";

// Declare placeholders
let searchUsers;
let pageAdder;

beforeEach(async () => {
	vi.resetModules();

	// Setup basic DOM structure
	document.body.innerHTML = `
		<form id="searchForm">
		<input type="text" id="searchInput" />
		</form>
		<ul id="users"></ul>
	`;

	// Mock fetch globally
	global.fetch = vi.fn();

	// Import and mock the correct method from the default export
	pageAdder = await import("./pageAdder.js");
	vi.spyOn(pageAdder.default, "addUsersToPage").mockImplementation(() => {});

	// Import module under test after mocking dependencies
	searchUsers = await import("./searchUsers.js");
});

describe("searchUsers.js Module Tests", () => {
	describe('fetchUsers', () => {
		it("should fetch users and updates the DOM", async () => {
			const mockUsers = [
			{ name: "Alice", bio: "Developer", account_id: "1" },
			{ name: "Bob", bio: "Designer", account_id: "2" },
			];

			fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockUsers,
			});

			await searchUsers.default.fetchUsers("Alice");

			expect(fetch).toHaveBeenCalledWith("/api/search/user?userName=Alice");
			expect(pageAdder.default.addUsersToPage).toHaveBeenCalledWith("users", mockUsers);
		});

		it("should handle fetch errors gracefully", async () => {
			fetch.mockResolvedValueOnce({
			ok: false,
			});

			const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			await searchUsers.default.fetchUsers("ErrorTest");

			expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Error fetching users:"),
			expect.any(Error)
			);

			consoleErrorSpy.mockRestore();
		});
	});
});
