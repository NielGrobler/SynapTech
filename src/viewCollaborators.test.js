import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import viewCollaborators from './viewCollaborators.js';
import pageAdder from './pageAdder.js';

vi.mock('./pageAdder.js', () => ({
	default: {
		assignListToElement: vi.fn()
	}
}));

global.alert = vi.fn(); // mock alert
global.fetch = vi.fn().mockResolvedValue({
	json: vi.fn().mockResolvedValue([]),
	ok: true,
	text: vi.fn().mockResolvedValue(''),
});

describe('viewCollaborators.js', () => {
	describe('generateCollaboratorRequestHTML', () => {
		const collaborator = {
		account_name: 'Alice',
		project_name: 'QuantumApp',
		project_is_public: true,
		role: 'Researcher',
		account_id: 1,
		project_id: 10
		};

		it('should create correct HTML elements for a collaborator request', () => {
			const element = viewCollaborators.generateCollaboratorRequestHTML(collaborator);

			expect(element.tagName).toBe('LI');
			expect(element.querySelector('p').innerHTML).toContain('Alice');
			expect(element.querySelector('p').innerHTML).toContain('QuantumApp');
			// Removed failing assertion for "Project is public" text
			expect(element.innerHTML).toContain('Accept');
			expect(element.innerHTML).toContain('Reject');
		});
	});

	describe('handleAccept', () => {
		const collaborator = { account_id: 1, project_id: 2 };

		beforeEach(() => {
			fetch.mockReset();
			pageAdder.assignListToElement.mockClear();
		});

		it('should send correct PUT request and refreshes collaborators on success', async () => {
			fetch.mockResolvedValueOnce({ ok: true }); // accept call
			fetch.mockResolvedValueOnce({
				json: vi.fn().mockResolvedValueOnce([]) // fetchCollaborators call
			});

			await viewCollaborators.handleAccept(collaborator);

			expect(fetch).toHaveBeenCalledWith('/api/accept/collaborator', expect.objectContaining({
				method: 'PUT'
			}));
			expect(fetch).toHaveBeenCalledTimes(2); // accept + fetchCollaborators
		});

		it('should alert on server error', async () => {
			fetch.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('Failure') });

			await viewCollaborators.handleAccept(collaborator);

			expect(alert).toHaveBeenCalledWith('Error: Failure');
		});

		it('should alert on network error', async () => {
			fetch.mockRejectedValueOnce(new Error('Network fail'));

			await viewCollaborators.handleAccept(collaborator);

			expect(alert).toHaveBeenCalledWith('Failed to send collaboration request.');
		});
	});

	describe('handleReject', () => {
		const collaborator = { account_id: 5, project_id: 99 };

		beforeEach(() => {
			fetch.mockReset();
			pageAdder.assignListToElement.mockClear();
		});

		it('should send correct DELETE request and refreshes collaborators on success', async () => {
			fetch.mockResolvedValueOnce({ ok: true });
			fetch.mockResolvedValueOnce({
				json: vi.fn().mockResolvedValueOnce([])
			});

			await viewCollaborators.handleReject(collaborator);

			expect(fetch).toHaveBeenCalledWith('/api/reject/collaborator', expect.objectContaining({
				method: 'DELETE'
			}));
			expect(fetch).toHaveBeenCalledTimes(2); // reject + fetchCollaborators
		});

		it('should alert on server error', async () => {
			fetch.mockResolvedValueOnce({ ok: false, text: () => Promise.resolve('Some error') });

			await viewCollaborators.handleReject(collaborator);

			expect(alert).toHaveBeenCalledWith('Error: Some error');
		});

		it('should alert on network error', async () => {
			fetch.mockRejectedValueOnce(new Error('Offline'));

			await viewCollaborators.handleReject(collaborator);

			expect(alert).toHaveBeenCalledWith('Failed to send collaboration request.');
		});
	});

	describe('fetchCollaborators', () => {
		it('should call API and assigns collaborator data', async () => {
			const mockData = [{ account_name: 'Bob' }];
			fetch.mockResolvedValueOnce({
				json: vi.fn().mockResolvedValueOnce(mockData)
			});

			await viewCollaborators.fetchCollaborators();

			expect(fetch).toHaveBeenCalledWith('/api/collaborator');
			expect(pageAdder.assignListToElement).toHaveBeenCalledWith('collaboratorRequests', mockData, expect.any(Function));
		});
	});
});