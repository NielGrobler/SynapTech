// projectPage.test.js
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest';
import { initPage } from './viewProject.js';
import userInfo from './userInfo.js';

global.fetch = vi.fn();

describe('initPage', () => {
	let container;

	beforeEach(() => {
		// Setup DOM elements
		container = document.createElement('div');
		container.innerHTML = `
			<div id="projectName"></div>
			<div id="projectIsPublic"></div>
			<div id="projectCreatedBy"></div>
			<div id="projectDescription"></div>
			<ul id="collaboratorList"></ul>
			<div id="collaborators"></div>
			<button id="uploadButton" style="display:none"></button>
        	<div id="files"></div>
		`;
		document.body.appendChild(container);

		// Mock window.location.search
		delete window.location;
		window.location = {
			search: '?id=123'
		};

		// Mock userInfo module
		vi.spyOn(userInfo, 'fetchFromApi').mockResolvedValue({
			id: 'user1'
		});
	});

	afterEach(() => {
		document.body.removeChild(container);
		vi.restoreAllMocks();
	});

	it('renders project details and buttons', async () => {
		const mockProject = {
			id: '123',
			name: 'Test Project',
			is_public: true,
			author_name: 'Alice',
			description: 'A sample project.',
			created_by_account_id: 'user1',
			collaborators: [{ name: 'Bob', account_id: 'user2' }]
		};

		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockProject
		});

		await initPage();

		expect(document.getElementById('projectName').innerHTML).toBe('Test Project');
		expect(document.getElementById('projectIsPublic').innerHTML).toBe('Public');
		expect(document.getElementById('projectCreatedBy').innerHTML).toBe('Alice');
		expect(document.getElementById('projectDescription').innerHTML).toBe('A sample project.');
	});

	it('shows message if no collaborators', async () => {
		const mockProject = {
			id: '123',
			name: 'No Collab Project',
			is_public: false,
			author_name: 'Alice',
			description: 'No one here.',
			created_by_account_id: 'user1',
			collaborators: []
		};

		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => mockProject
		});

		await initPage();

		expect(document.getElementById('collaboratorList').innerHTML).toBe('No collaborators.');
	});
});

