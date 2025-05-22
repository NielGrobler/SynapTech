import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as viewProject from './viewProject.js'

// Mock global objects
global.window = { location: { search: '' } };
global.document = {
	getElementById: vi.fn().mockImplementation((id) => ({
		id,
		innerHTML: '',
		innerText: '',
		style: { display: '' },
		appendChild: vi.fn(),
		removeChild: vi.fn(),
		addEventListener: vi.fn(),
		click: vi.fn(),
		remove: vi.fn(),
	})),
	createElement: vi.fn().mockImplementation((tagName) => ({
		tagName,
		innerHTML: '',
		innerText: '',
		style: {},
		dataset: {},
		appendChild: vi.fn(),
		addEventListener: vi.fn(),
		click: vi.fn(),
	})),
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn(),
	},
};

// Mock dependencies
vi.mock('./userInfo.js', () => ({
	default: {
		fetchFromApi: vi.fn().mockResolvedValue({ id: 'user123', name: 'Test User' }),
	},
}));

vi.mock('./pageAdder.js', () => ({
	default: {
		assignListToElement: vi.fn(),
	},
}));

// Mock fetch
global.fetch = vi.fn();

describe('viewProject.js Module Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchProject', () => {
		it('should return null when no project ID is provided', async () => {
			window.location.search = '';
			const result = await viewProject.fetchProject();
			expect(result).toBeNull();
		});

		it('should fetch project data when ID is provided', async () => {
			window.location.search = '?id=123';
			const mockProject = { id: '123', name: 'Test Project' };
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockProject),
			});

			const result = await viewProject.fetchProject();
			expect(result).toEqual(mockProject);
			expect(fetch).toHaveBeenCalledWith('/api/project?id=123');
		});

		it('should handle fetch errors', async () => {
			window.location.search = '?id=123';
			fetch.mockRejectedValueOnce(new Error('Network error'));
			
			await expect(viewProject.fetchProject()).rejects.toThrow('Network error');
		});
	});

	describe('fetchProjectFiles', () => {
		it('should fetch project files successfully', async () => {
			const mockFiles = [{ id: 'file1', name: 'document.pdf' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockFiles),
			});

			const project = { id: '123' };
			const result = await viewProject.fetchProjectFiles(project);
			expect(result).toEqual(mockFiles);
			expect(fetch).toHaveBeenCalledWith('/api/project/123/files');
		});

		it('should handle fetch errors gracefully', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				status: 404,
			});

			const project = { id: '123' };
			const result = await viewProject.fetchProjectFiles(project);
			expect(result.error).toBeDefined();
		});
	});

	/*describe('downloadProjectFile', () => {
		
		it('should download a file successfully', async () => {
			const mockBlob = new Blob(['test content']);
			fetch.mockResolvedValueOnce({
				ok: true,
				blob: () => Promise.resolve(mockBlob),
				headers: { get: () => 'application/pdf' },
			});

			await viewProject.downloadProjectFile('123', 'uuid1', 'test.pdf', 'pdf');
			
			expect(fetch).toHaveBeenCalledWith('/api/project/123/file/uuid1/pdf');
			expect(document.createElement).toHaveBeenCalledWith('a');
		});
		

		it('should handle download errors', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Not found',
			});

			await viewProject.downloadProjectFile('123', 'uuid1', 'test.pdf', 'pdf');
			expect(console.error).toHaveBeenCalled();
		});
	});
	*/

	describe('isParticipant', () => {
		const project = {
		created_by_account_id: 'creator123',
		collaborators: [
			{ account_id: 'collab1' },
			{ account_id: 'collab2' },
		],
		};

		it('should return true for project creator', () => {
			expect(viewProject.isParticipant('creator123', project)).toBe(true);
		});

		it('should return true for collaborators', () => {
			expect(viewProject.isParticipant('collab1', project)).toBe(true);
			expect(viewProject.isParticipant('collab2', project)).toBe(true);
		});

		it('should return false for non-participants', () => {
			expect(viewProject.isParticipant('other123', project)).toBe(false);
		});
	});

	describe('populateCollaborators', () => {
		it('should display "No collaborators" when none exist', () => {
			const project = { collaborators: [] };
			const mockElement = { innerHTML: '' };
			document.getElementById.mockReturnValueOnce(mockElement);

			viewProject.populateCollaborators(project);
			expect(mockElement.innerHTML).toBe('No collaborators.');
		});

		it('should list collaborators when they exist', () => {
			const project = {
				collaborators: [
				{ name: 'Alice' },
				{ name: 'Bob' },
				],
			};
			const mockElement = { innerHTML: '', appendChild: vi.fn() };
			document.getElementById.mockReturnValueOnce(mockElement);
			document.createElement.mockImplementation(() => ({ innerText: '' }));

			viewProject.populateCollaborators(project);
			expect(mockElement.innerHTML).toBe('');
			expect(document.createElement).toHaveBeenCalledWith('li');
		});
	});

	describe('initPage', () => {
		it('should initialize the page successfully', async () => {
			const mockProject = {
				id: '123',
				name: 'Test Project',
				is_public: true,
				author_name: 'Author',
				description: 'Test description',
				collaborators: [],
			};

			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockProject),
			});

			await viewProject.initPage();
			expect(document.getElementById).toHaveBeenCalledWith('collaboratorList');
		});

		/*
		it('should handle missing collaboratorList element', async () => {
			document.getElementById.mockReturnValueOnce(null);
			await viewProject.initPage();
			expect(console.error).toHaveBeenCalledWith('collaboratorList element not found');
		});
		*/
	});

	describe('addCollaboratorButton', () => {
		it('should not add button if user is not project creator', async () => {
			const userDetails = { id: 'user123' };
			const project = { created_by_account_id: 'other123' };
			
			const result = await viewProject.addCollaboratorButton(userDetails, project);
			expect(result).toBe(false);
		});

		// Additional tests for other functions can be added here
	});

	/*describe('loadProjectReviews', () => {
		it('should load and display reviews', async () => {
			const mockReviews = {
				reviews: [
				{
					rating: 4,
					comment: 'Great project!',
					reviewer_name: 'Reviewer1',
					created_at: '2023-01-01',
				},
				],
				totalCount: 1,
			};

			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(mockReviews),
			});

			const project = { id: '123' };
			await viewProject.loadProjectReviews(project);
			
			expect(fetch).toHaveBeenCalledWith('/api/reviews?projectId=123&page=1&limit=10');
			expect(document.createElement).toHaveBeenCalledWith('figure');
		});
	});
	*/
});