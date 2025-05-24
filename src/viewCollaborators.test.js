import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as toast from './toast.js';
import viewCollaborators from './viewCollaborators.js';
import pageAdder from './pageAdder.js';

vi.mock('./pageAdder.js', () => ({
	default: {
		assignListToElement: vi.fn()
	}
}));

vi.mock('./toast.js', async () => {
  const actual = await vi.importActual('./toast.js');
  return {
    ...actual,
    failToast: vi.fn(),
    successToast: vi.fn(),
  };
});

global.fetch = vi.fn();

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
    expect(element.innerHTML).toContain('Accept');
    expect(element.innerHTML).toContain('Reject');
  });
});

	describe('handleAccept', () => {
		const collaborator = { account_id: 1, project_id: 2 };

  beforeEach(() => {
    fetch.mockReset();
    toast.failToast.mockClear();
    toast.successToast.mockClear();
    pageAdder.assignListToElement.mockClear();
  });

  it('sends correct PUT request and refreshes collaborators on success', async () => {
    fetch.mockResolvedValueOnce({ ok: true }); // PUT
    fetch.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue([]) }); // fetch updated list

			await viewCollaborators.handleAccept(collaborator);

    expect(fetch).toHaveBeenCalledWith('/api/accept/collaborator', expect.objectContaining({
      method: 'PUT'
    }));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows toast on server error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Failure')
    });

			await viewCollaborators.handleAccept(collaborator);

    expect(toast.failToast).toHaveBeenCalledWith('Error: Failure');
  });

  it('shows toast on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network fail'));

			await viewCollaborators.handleAccept(collaborator);

    expect(toast.failToast).toHaveBeenCalledWith('Failed to send collaboration request.');
  });
});

	describe('handleReject', () => {
		const collaborator = { account_id: 5, project_id: 99 };

  beforeEach(() => {
    fetch.mockReset();
    toast.failToast.mockClear();
    toast.successToast.mockClear();
    pageAdder.assignListToElement.mockClear();
  });

  it('sends correct DELETE request and refreshes collaborators on success', async () => {
    fetch.mockResolvedValueOnce({ ok: true });
    fetch.mockResolvedValueOnce({ json: vi.fn().mockResolvedValue([]) });

			await viewCollaborators.handleReject(collaborator);

    expect(fetch).toHaveBeenCalledWith('/api/reject/collaborator', expect.objectContaining({
      method: 'DELETE'
    }));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('shows toast on server error', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      text: () => Promise.resolve('Some error')
    });

			await viewCollaborators.handleReject(collaborator);

    expect(toast.failToast).toHaveBeenCalledWith('Error: Some error');
  });

  it('shows toast on network error', async () => {
    fetch.mockRejectedValueOnce(new Error('Offline'));

			await viewCollaborators.handleReject(collaborator);

    expect(toast.failToast).toHaveBeenCalledWith('Failed to send collaboration request.');
  });
});

  describe('fetchCollaborators', () => {
    beforeEach(() => {
      fetch.mockReset();
      toast.failToast.mockClear();
      toast.successToast.mockClear();
      pageAdder.assignListToElement.mockClear();
    });

    it('calls API and assigns collaborator data', async () => {
      const mockData = [{ account_name: 'Bob' }];
      fetch.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue(mockData),
        ok: true
      });

        await viewCollaborators.fetchCollaborators();

      expect(fetch).toHaveBeenCalledWith('/api/collaborator');
      expect(pageAdder.assignListToElement).toHaveBeenCalledWith(
        'collaboratorRequests',
        mockData,
        viewCollaborators.generateCollaboratorRequestHTML
      );
    });

    it('shows toast on fetch failure', async () => {
      fetch.mockRejectedValueOnce(new Error('Boom'));

      await viewCollaborators.fetchCollaborators();

      expect(toast.failToast).toHaveBeenCalledWith('Failed to fetch collaborators.');
    });
  });

});
