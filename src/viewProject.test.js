import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as viewProject from './viewProject.js'

beforeEach(() => {
	global.window = { location: { search: '' } };
	global.console = {
		error: vi.fn(),
		log: vi.fn()
	};
	
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
		querySelectorAll: vi.fn(() => []),
		classList: {
			add: vi.fn(),
			remove: vi.fn()
		}
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
		classList: {
			add: vi.fn(),
			remove: vi.fn()
		}
		})),
		body: {
		appendChild: vi.fn(),
		removeChild: vi.fn(),
		},
	};

	//set up only really for createInviteForm tests. might need further refactoring
	viewProject.inviteFormCreated = false;
	viewProject.count = 0;
});

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

	describe('downloadProjectFile', () => {
		/*it('should download a file successfully', async () => {
			const mockBlob = new Blob(['test content']);
			const mockResponse = {
				ok: true,
				blob: () => Promise.resolve(mockBlob),
				headers: { get: () => 'application/pdf' },
			};
			fetch.mockResolvedValueOnce(mockResponse);

			//this hopefully resolves the anchor related issues
			const mockAnchor = {
				href: '',
				download: '',
				click: vi.fn(),
				remove: vi.fn()
			};
			document.createElement.mockReturnValueOnce(mockAnchor);

			await viewProject.downloadProjectFile('123', 'uuid1', 'test.pdf', 'pdf');
			
			expect(fetch).toHaveBeenCalledWith('/api/project/123/file/uuid1/pdf');
			expect(document.createElement).toHaveBeenCalledWith('a');
		});*/
		
		it('should handle download errors', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Not found',
			});

			await viewProject.downloadProjectFile('123', 'uuid1', 'test.pdf', 'pdf');
			expect(console.error).toHaveBeenCalled();
		});
	});

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

			await viewProject.initPage(); //this throws an unhandled error
			expect(document.getElementById).toHaveBeenCalledWith('collaboratorList');
		});

		
		it('should handle missing collaboratorList element', async () => {
			document.getElementById.mockReturnValueOnce(null);
			await viewProject.initPage();
			expect(console.error).toHaveBeenCalledWith('collaboratorList element not found');
		});
		
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
	});*/
	
	describe('getFileExt', () => {
		it('should return the file extension from a filename', () => {
			expect(viewProject.getFileExt('document.pdf')).toBe('pdf');
			expect(viewProject.getFileExt('image.png')).toBe('png');
			expect(viewProject.getFileExt('archive.tar.gz')).toBe('gz');
		});

		it('should return empty string for filenames without extension', () => {
			expect(viewProject.getFileExt('README')).toBe('');
			expect(viewProject.getFileExt('noext.')).toBe('');
		});
	});

	/*describe('projectFileToHTML', () => {
		it('should create a list item with download link for a file', () => {
			const mockFile = {
				original_filename: 'test.pdf',
				project_id: '123',
				file_uuid: 'uuid1'
			};

			const mockLink = {
				textContent: '',
				dataset: {},
				addEventListener: vi.fn()
			};
			document.createElement.mockImplementationOnce(() => ({})) // li
								.mockImplementationOnce(() => mockLink); // a

			const result = viewProject.projectFileToHTML(mockFile);
			expect(result.tagName).toBe('LI');
			//expect(result.firstChild.tagName).toBe('A');
			expect(result.firstChild.textContent).toBe('test.pdf');
		});

		it('should set correct dataset attributes on the link', () => {
			const mockFile = {
			original_filename: 'test.pdf',
			project_id: '123',
			file_uuid: 'uuid1'
			};
			const result = viewProject.projectFileToHTML(mockFile);
			const link = result.firstChild;
			expect(link.dataset.projectId).toBe('123');
			expect(link.dataset.uuid).toBe('uuid1');
			expect(link.dataset.name).toBe('test.pdf');
			expect(link.dataset.ext).toBe('pdf');
		});
	});*/

	describe('addRequestCollaboration', () => {
		it('should not add button if user is already a participant', async () => {
			const userDetails = { id: 'user123' };
			const project = { 
			created_by_account_id: 'user123',
			collaborators: [] 
			};
			const result = await viewProject.addRequestCollaboration(userDetails, project);
			expect(result).toBe(false);
		});

		it('should add request button for non-participants', async () => {
			const userDetails = { id: 'user123' };
			const project = { 
			created_by_account_id: 'other123',
			collaborators: [] 
			};
			const mockElement = { appendChild: vi.fn() };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			const result = await viewProject.addRequestCollaboration(userDetails, project);
			expect(result).toBe(true);
			expect(mockElement.appendChild).toHaveBeenCalled();
		});

		/*it('should send collaboration request when clicked', async () => {
			const userDetails = { id: 'user123' };
			const project = { id: '123', created_by_account_id: 'other123' };
			const mockButton = { addEventListener: vi.fn() };
			document.createElement.mockReturnValueOnce(mockButton);
			document.getElementById.mockReturnValueOnce({ appendChild: vi.fn() });
			
			await viewProject.addRequestCollaboration(userDetails, project);
			
			const clickHandler = mockButton.addEventListener.mock.calls[0][1];
			fetch.mockResolvedValueOnce({ ok: true });
			await clickHandler();
			
			expect(fetch).toHaveBeenCalledWith('/api/collaboration/request', expect.any(Object));
		});*/
	});

	describe('createUserList', () => {
		it('should create an empty unordered list with id "users"', () => {
			const mockUl = {
				id: '',
				innerHTML: ''
			};
			document.createElement.mockReturnValueOnce(mockUl);
			
			const result = viewProject.createUserList();
			expect(result).toBe(mockUl);
			expect(result.id).toBe('users');
		});
	});

	describe('inviteCollaborator', () => {
		it('should send invitation with correct parameters', async () => {
			fetch.mockResolvedValueOnce({ ok: true });
			await viewProject.inviteCollaborator('user123', 'proj456', 'Researcher');
			
			expect(fetch).toHaveBeenCalledWith('/api/collaboration/invite', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				accountId: 'user123',
				projectId: 'proj456',
				role: 'Researcher'
			})
			});
		});

		it('should handle invitation errors', async () => {
			fetch.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('Error') });
			await viewProject.inviteCollaborator('user123', 'proj456', 'Researcher');
			expect(fetch).toHaveBeenCalled();
		});
	});

	/*describe('createInviteForm', () => {
		it('should create a search form for users', () => {
			const project = { id: '123' };
			const mockForm = {
				appendChild: vi.fn(),
				addEventListener: vi.fn()
			};
			document.createElement.mockReturnValueOnce(mockForm);
			
			const result = viewProject.createInviteForm(project);
			expect(result).toBe(mockForm);
		});

		it('should prevent multiple form creation', () => {
			const project = { id: '123' };
			viewProject.inviteFormCreated = true;
			const result = viewProject.createInviteForm(project);
			expect(result).toBeUndefined();
			expect(viewProject.count).toBe(1);
		});

		it('should search for users on input', async () => {
			const project = { id: '123', collaborators: [] };
			const mockUsers = [{ account_id: 'user1', name: 'User 1', bio: 'Bio 1' }];
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockUsers) });
			
			const form = viewProject.createInviteForm(project);
			const inputEvent = { preventDefault: vi.fn() };
			const inputHandler = form.addEventListener.mock.calls[0][1];
			
			await inputHandler(inputEvent);
			
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/search/user'));
		});
	});*/

	/*describe('loadProjectFiles', () => {
		it('should fetch and display project files', async () => {
			const mockFiles = [{ original_filename: 'test.pdf' }];
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockFiles) });
			const mockProject = { id: '123' };
			const mockElement = { innerHTML: '' };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			await viewProject.loadProjectFiles(mockProject);
			
			expect(fetch).toHaveBeenCalledWith('/api/project/123/files');
			expect(viewProject.pageAdder.assignListToElement).toHaveBeenCalled();
		});

		it('should handle file loading errors', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const mockProject = { id: '123' };
			
			await viewProject.loadProjectFiles(mockProject);
			expect(console.error).toHaveBeenCalled();
		});
	});*/

	describe('addUploadButton', () => {
		it('should not add button if user is not project creator', () => {
			const userDetails = { id: 'user123' };
			const project = { created_by_account_id: 'other123' };
			const result = viewProject.addUploadButton(userDetails, project);
			expect(result).toBe(false);
		});

		it('should handle file upload process', async () => {
			const userDetails = { id: 'user123' };
			const project = { id: '123', created_by_account_id: 'user123' };
			const mockButton = { 
			style: { display: '' },
			addEventListener: vi.fn() 
			};
			document.getElementById.mockReturnValueOnce(mockButton);
			document.getElementById.mockReturnValueOnce({ appendChild: vi.fn() });
			
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
			
			const result = viewProject.addUploadButton(userDetails, project);
			expect(result).toBe(true);
			
			const clickHandler = mockButton.addEventListener.mock.calls[0][1];
			const mockEvent = { preventDefault: vi.fn() };
			await clickHandler(mockEvent);
			
			expect(document.createElement).toHaveBeenCalledWith('input');
		});

		/*it('should handle upload errors', async () => {
			const userDetails = { id: 'user123' };
			const project = { id: '123', created_by_account_id: 'user123' };
			document.getElementById.mockReturnValueOnce({ 
			style: { display: '' },
			addEventListener: vi.fn((_, handler) => {
				const fileInput = {
				addEventListener: vi.fn((_, fileHandler) => {
					fetch.mockResolvedValueOnce({ ok: false });
					fileHandler({ target: { files: [{}] } });
				})
				};
				document.createElement.mockReturnValueOnce(fileInput);
				handler({ preventDefault: vi.fn() });
			})
			});
			
			await viewProject.addUploadButton(userDetails, project);
			expect(fetch).toHaveBeenCalled();
		});*/
	});

	describe('populateElements', () => {
		/*it('should populate project information in the DOM', async () => {
			const mockProject = {
			id: '123',
			name: 'Test Project',
			is_public: true,
			author_name: 'Author',
			description: 'Description',
			collaborators: []
			};
			
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockProject) });
			document.getElementById.mockImplementation(id => ({ innerHTML: '' }));
			
			await viewProject.populateElements();
			
			expect(document.getElementById).toHaveBeenCalledWith('projectName');
			expect(document.getElementById).toHaveBeenCalledWith('projectIsPublic');
			expect(document.getElementById).toHaveBeenCalledWith('projectCreatedBy');
			expect(document.getElementById).toHaveBeenCalledWith('projectDescription');
		});
		*/

		it('should handle missing project', async () => {
			fetch.mockResolvedValueOnce(null);
			const mockElement = { innerText: '' };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			await viewProject.populateElements();
			expect(mockElement.innerText).toBe('Could not display project.');
		});
	});

	describe('fetchReviews', () => {
		/*it('should fetch reviews with pagination', async () => {
			const mockReviews = { reviews: [], totalCount: 0 };
			fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockReviews) });
			
			const result = await viewProject.fetchReviews('123', 2, 15);
			expect(fetch).toHaveBeenCalledWith('/api/reviews?projectId=123&page=2&limit=15');
			expect(result).toEqual(mockReviews);
		});
		*/

		it('should handle review fetch errors', async () => {
			fetch.mockResolvedValueOnce({ ok: false });
			const result = await viewProject.fetchReviews('123');
			expect(result).toEqual({ reviews: [], totalCount: 0 });
		});
	});

	/*describe('formatDate', () => { //include if needed but like whay
		it('should format date string correctly', () => {
			const dateStr = '2023-01-15T00:00:00Z';
			const formatted = viewProject.formatDate(dateStr);
			expect(formatted).toMatch(/Jan/);
			expect(formatted).toMatch(/2023/);
		});
	});
	*/

	/*describe('createStarRating', () => {
		it('should create correct number of filled stars', () => {
			const rating = 3;
			const result = viewProject.createStarRating(rating);
			const filledStars = result.querySelectorAll('.star.filled').length;
			expect(filledStars).toBe(rating);
		});

		it('should create correct number of empty stars', () => {
			const rating = 2;
			const result = viewProject.createStarRating(rating);
			const emptyStars = result.querySelectorAll('.star:not(.filled)').length;
			expect(emptyStars).toBe(5 - rating);
		});
	});
	*/

	describe('displayReviews', () => {
		it('should display reviews in the DOM', () => {
			const mockReviews = [{
			rating: 4,
			comment: 'Great!',
			reviewer_name: 'Tester',
			created_at: '2023-01-01'
			}];
			const mockElement = { innerHTML: '', appendChild: vi.fn() };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			viewProject.displayReviews(mockReviews);
			expect(mockElement.innerHTML).toBe('');
			expect(document.createElement).toHaveBeenCalledWith('li');
		});

		it('should handle empty reviews list', () => {
			const mockElement = { innerHTML: '', appendChild: vi.fn() };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			viewProject.displayReviews([]);
			expect(mockElement.appendChild).toHaveBeenCalled();
		});

		it('should append reviews when append flag is true', () => {
			const mockReviews = [{
			rating: 4,
			comment: 'Great!',
			reviewer_name: 'Tester',
			created_at: '2023-01-01'
			}];
			const mockElement = { innerHTML: 'existing', appendChild: vi.fn() };
			document.getElementById.mockReturnValueOnce(mockElement);
			
			viewProject.displayReviews(mockReviews, true);
			expect(mockElement.innerHTML).toBe('existing');
		});
	});
});