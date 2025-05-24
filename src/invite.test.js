import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendReply, genInviteReqHTML, fetchInvites } from './invite.js';
import { screen } from '@testing-library/dom';

vi.mock('./pageAdder.js', () => ({
  default: {
    assignListToElement: vi.fn()
  }
}));

const pageAdder = (await import('./pageAdder.js')).default;

describe('invite.js Module Tests', () =>{
	/*describe('sendReply', () => {
		beforeEach(() => {
			global.fetch = vi.fn();
			global.alert = vi.fn();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should call fetch with correct arguments on success', async () => {
			fetch.mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ success: true })
			});

			await sendReply(true, 123, 'Developer');

			expect(fetch).toHaveBeenCalledWith('/api/collaboration/invite/reply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ projectId: 123, role: 'Developer', isAccept: true })
			});

			expect(alert).toHaveBeenCalledWith('Success!');
		});
	});*/

	describe('genInviteReqHTML', () => {
		it('should return a DOM element with correct structure', () => {
			const mockInvite = {
				account_name: 'Alice',
				project_name: 'AI Project',
				role: 'Researcher',
				project_id: 1
			};

			const element = genInviteReqHTML(mockInvite);
			document.body.appendChild(element);

			expect(element.tagName).toBe('LI');
			expect(element.querySelector('p').innerHTML).toContain('Alice');
			expect(element.querySelectorAll('button').length).toBe(2);
		});
	});

	describe('fetchInvites', () => {
		beforeEach(() => {
			global.fetch = vi.fn();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should call fetch and assignListToElement', async () => {
			const invites = [{ account_name: 'Bob', project_name: 'X', role: 'Dev', project_id: 2 }];
			fetch.mockResolvedValueOnce({
				json: () => Promise.resolve(invites)
			});

			await fetchInvites();

			expect(fetch).toHaveBeenCalledWith('/api/collaboration/invites');
			expect(pageAdder.assignListToElement).toHaveBeenCalledWith('invite-list', invites, expect.any(Function));
		});
	});
});
