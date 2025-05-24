import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { failToast, successToast } from './toast.js';
import {
	populateCollaborators,
	fetchProject,
	fetchProjectFiles,
	downloadProjectFile,
	fetchMilestones,
	postMilestone,
	toggleMilestone,
	toggleMilestoneForm,
	setMilestoneIcon,
	milestoneToHTML,
	getFileExt,
	projectFileToHTML,
	isParticipant,
	postFundingRequest,
	fundingOpportunityToHTML,
	addFundingButton,
	addRequestCollaboration,
	createUserList,
	inviteCollaborator,
	milestoneFormListener,
	createInviteForm,
	addCollaboratorButton,
	loadProjectFiles,
	addUploadButton,
	populateMilestones,
	populateElements,
	fetchReviews,
	formatDate,
	createStarRating,
	displayReviews,
	loadProjectReviews
} from './viewProject.js';

// Mock global objects
global.fetch = vi.fn();
global.URL = {
	createObjectURL: vi.fn(),
	revokeObjectURL: vi.fn()
};
global.document = {
	getElementById: vi.fn(),
	createElement: vi.fn(),
	body: {
		appendChild: vi.fn(),
		removeChild: vi.fn()
	}
};

// Mock imported modules
vi.mock('./userInfo.js', () => ({
	default: {
		fetchFromApi: vi.fn()
	}
}));

vi.mock('./pageAdder.js', () => ({
	default: {
		assignListToElement: vi.fn()
	}
}));

vi.mock('./toast.js', () => ({
	failToast: vi.fn(),
	successToast: vi.fn()
}));

describe('viewProject.js', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mocks
		document.getElementById.mockImplementation((id) => {
			const elements = {
				'collaboratorList': { innerHTML: '' },
				'projectName': { innerText: '' },
				'projectIsPublic': { innerHTML: '' },
				'projectCreatedBy': { innerHTML: '' },
				'projectDescription': { innerHTML: '' },
				'milestone-form': { addEventListener: vi.fn() },
				'milestone-list': { innerHTML: '' },
				'add-milestone-btn': { addEventListener: vi.fn() },
				'review-list-drop-btn': { addEventListener: vi.fn() },
				'review-drop-icon': { classList: { remove: vi.fn(), add: vi.fn() } },
				'reviewsList': {
					classList: { add: vi.fn(), remove: vi.fn() },
					style: {},
					scrollHeight: 100,
					innerHTML: ''
				},
				'filesList': { innerHTML: '' },
				'uploadButton': { style: {}, addEventListener: vi.fn() },
				'opportunity-section': { appendChild: vi.fn() },
				'collaborators': { appendChild: vi.fn(), removeChild: vi.fn() },
				'milestone-form-section': { classList: { contains: vi.fn(), add: vi.fn(), remove: vi.fn() } },
				'milestone-list-icon': { classList: { remove: vi.fn(), add: vi.fn() } },
				'milestoneName': { value: '', trim: vi.fn() },
				'milestoneDescription': { value: '', trim: vi.fn() },
				'user-search-input': { value: '' },
				'files': { appendChild: vi.fn() }
			};
			return elements[id] || { innerHTML: '', addEventListener: vi.fn(), appendChild: vi.fn() };
		});

		document.createElement.mockImplementation((tag) => {
			const element = {
				innerHTML: '',
				innerText: '',
				textContent: '',
				classList: {
					add: vi.fn(),
					remove: vi.fn(),
					contains: vi.fn()
				},
				style: {},
				dataset: {},
				appendChild: vi.fn(),
				addEventListener: vi.fn(),
				click: vi.fn(),
				remove: vi.fn()
			};

			if (tag === 'a') {
				element.href = '';
				element.download = '';
			}

			return element;
		});

		global.window = {
			location: {
				search: '?id=123'
			}
		};
	});

	describe('fetchProject', () => {
		it('should return null when no projectId', async () => {
			window.location.search = '';
			const result = await fetchProject();
			expect(result).toBeNull();
		});

		it('should fetch project data', async () => {
			const mockProject = { id: 123, name: 'Test Project' };
			fetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValueOnce(mockProject)
			});

			const result = await fetchProject();
			expect(result).toEqual(mockProject);
			expect(fetch).toHaveBeenCalledWith('/api/project?id=123');
		});
	});

	describe('fetchProjectFiles', () => {
		it('should fetch project files', async () => {
			const mockFiles = [{ id: 1, name: 'file1.txt' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValueOnce(mockFiles)
			});

			const result = await fetchProjectFiles({ id: 123 });
			expect(result).toEqual(mockFiles);
		});

		it('should handle fetch error', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				status: 404
			});

			const result = await fetchProjectFiles({ id: 123 });
			expect(result.error).toBeDefined();
		});
	});

	describe('downloadProjectFile', () => {
		it('should download file successfully', async () => {
			const mockBlob = new Blob(['test']);
			fetch.mockResolvedValueOnce({
				ok: true,
				blob: vi.fn().mockResolvedValueOnce(mockBlob),
				headers: { get: vi.fn().mockReturnValueOnce('text/plain') }
			});

			await downloadProjectFile(123, 'uuid-123', 'test.txt', 'txt');

			expect(fetch).toHaveBeenCalledWith('/api/project/123/file/uuid-123/txt');
			expect(document.createElement).toHaveBeenCalledWith('a');
		});

		it('should handle download error', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Not Found'
			});

			await downloadProjectFile(123, 'uuid-123', 'test.txt', 'txt');
			expect(failToast).toHaveBeenCalled();
		});
	});

	describe('fetchMilestones', () => {
		it('should fetch milestones', async () => {
			const mockMilestones = [{ id: 1, name: 'Milestone 1' }];
			fetch.mockResolvedValueOnce({
				ok: true,
				json: vi.fn().mockResolvedValueOnce(mockMilestones)
			});

			const result = await fetchMilestones(123);
			expect(result).toEqual(mockMilestones);
		});

		it('should handle fetch error', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				statusText: 'Error'
			});

			await fetchMilestones(123);
			expect(failToast).toHaveBeenCalled();
		});
	});

	describe('postMilestone', () => {
		it('should post milestone successfully', async () => {
			fetch.mockResolvedValueOnce({
				ok: true
			});

			await postMilestone(123, 'Test', 'Description');
			expect(successToast).toHaveBeenCalled();
		});

		it('should handle post error', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				json: vi.fn().mockResolvedValueOnce({ error: 'Failed' })
			});

			await postMilestone(123, 'Test', 'Description');
			expect(failToast).toHaveBeenCalledWith('Error: Failed');
		});
	});

	describe('toggleMilestone', () => {
		it('should toggle milestone', async () => {
			fetch.mockResolvedValueOnce({
				ok: true
			});

			await toggleMilestone(123, 456);
			expect(fetch).toHaveBeenCalled();
		});

		it('should handle toggle error', async () => {
			fetch.mockResolvedValueOnce({
				ok: false,
				json: vi.fn().mockResolvedValueOnce({ error: 'Failed' })
			});

			await toggleMilestone(123, 456);
			expect(failToast).toHaveBeenCalled();
		});
	});

	describe('setMilestoneIcon', () => {
		it('should set checked icon', () => {
			const mockIcon = { classList: { remove: vi.fn(), add: vi.fn() } };
			setMilestoneIcon(mockIcon, true);
			expect(mockIcon.classList.add).toHaveBeenCalledWith('bx-checkbox-checked');
		});

		it('should set unchecked icon', () => {
			const mockIcon = { classList: { remove: vi.fn(), add: vi.fn() } };
			setMilestoneIcon(mockIcon, false);
			expect(mockIcon.classList.add).toHaveBeenCalledWith('bx-checkbox');
		});
	});

	describe('getFileExt', () => {
		it('should return file extension', () => {
			expect(getFileExt('test.txt')).toBe('txt');
			expect(getFileExt('test')).toBe('');
		});
	});

	describe('isParticipant', () => {
		it('should return true for creator', () => {
			const project = {
				created_by_account_id: 123,
				collaborators: []
			};
			expect(isParticipant(123, project)).toBe(true);
		});

		it('should return true for collaborator', () => {
			const project = {
				created_by_account_id: 1,
				collaborators: [{ account_id: 123 }]
			};
			expect(isParticipant(123, project)).toBe(true);
		});

		it('should return false for non-participant', () => {
			const project = {
				created_by_account_id: 1,
				collaborators: []
			};
			expect(isParticipant(123, project)).toBe(false);
		});
	});

	describe('postFundingRequest', () => {
		it('should post funding request', async () => {
			fetch.mockResolvedValueOnce({
				ok: true
			});

			await postFundingRequest(123, 456);
			expect(successToast).toHaveBeenCalled();
		});
	});

	describe('addFundingButton', () => {
		it('should add button for participant', () => {
			const mockProject = {
				id: 123,
				created_by_account_id: 123,
				collaborators: []
			};

			addFundingButton(123, mockProject);
			expect(document.getElementById).toHaveBeenCalledWith('opportunity-section');
		});

		it('should not add button for non-participant', () => {
			const mockProject = {
				id: 123,
				created_by_account_id: 1,
				collaborators: []
			};

			addFundingButton(123, mockProject);
			expect(document.getElementById).not.toHaveBeenCalledWith('opportunity-section');
		});
	});

	describe('addRequestCollaboration', () => {
		it('should add button for non-participant', async () => {
			const mockProject = {
				id: 123,
				created_by_account_id: 1,
				collaborators: []
			};

			const result = await addRequestCollaboration({ id: 123 }, mockProject);
			expect(result).toBe(true);
		});
	});

	describe('inviteCollaborator', () => {
		it('should send invite', async () => {
			fetch.mockResolvedValueOnce({
				ok: true
			});

			await inviteCollaborator(123, 456, 'Researcher');
			expect(successToast).toHaveBeenCalled();
		});
	});

	describe('addUploadButton', () => {
		it('should add upload button for creator', () => {
			const mockProject = {
				id: 123,
				created_by_account_id: 123
			};

			const result = addUploadButton({ id: 123 }, mockProject);
			expect(result).toBe(true);
		});
	});

	describe('formatDate', () => {
		it('should format date string', () => {
			const dateStr = '2023-01-01T00:00:00Z';
			const formatted = formatDate(dateStr);
			expect(formatted).toMatch(/\w{3} \d{1,2}, \d{4}/);
		});
	});

});
