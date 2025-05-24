// messages.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import messagesModule from './messages.js';

let socketMock;

beforeEach(() => {
	global.localStorage = {
		getItem: vi.fn(() => 'mock-jwt'),
	};

	socketMock = {
		on: vi.fn(),
		emit: vi.fn(),
	};

	globalThis.io = vi.fn(() => socketMock);

	document.body.innerHTML = `
<ul id="projects"></ul>
<ul id="messages"></ul>
<div id="inputs" style="display:block"></div>
<button id="uploadBtn"></button>
<input type="file" id="file" />
<div id="attachment-name"></div>
<button id="sendBtn"></button>
<button id="scroll-to-bottom"></button>
<input type="text" id="text" />
`;
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('messages.js module', () => {
	describe('scrollToBottomIfNeeded', () => {
		it('should scroll if at bottom', async () => {
			const messages = document.createElement('div');
			messages.id = 'messages';
			document.body.appendChild(messages);

			messages.scrollTop = 100;

			Object.defineProperty(messages, 'scrollHeight', {
				configurable: true,
				get: () => 200
			});

			Object.defineProperty(messages, 'clientHeight', {
				configurable: true,
				get: () => 100
			});

			messagesModule.scrollToBottomIfNeeded();

			// Let requestAnimationFrame run
			vi.useFakeTimers();
			vi.runAllTimers();

			expect(messages.scrollTop).toBe(100);
		});
	});

	describe('fetchProjects', () => {
		it('should render project list and handle click', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve([{ id: '1', name: 'Test Project' }]),
				})
			);

			const data = await messagesModule.fetchProjects();
			expect(data).toHaveLength(1);
			expect(document.getElementById('projects').children.length).toBe(1);
		});

		it('should handle empty project list', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve([]),
				})
			);

			const data = await messagesModule.fetchProjects();
			expect(data).toEqual([]);
			expect(document.getElementById('projects').textContent).toContain('Nothing to display.');
		});

		it('should handle fetch failure', async () => {
			global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
			const data = await messagesModule.fetchProjects();
			expect(data).toEqual([]);
			expect(consoleSpy).toHaveBeenCalled();
		});
	});

	describe('addMessageToDOM', () => {
		it('should append message to DOM with text only', () => {
			const msg = { user: 'Alice', text: 'Hello' };
			messagesModule.addMessageToDOM(msg);
			expect(document.getElementById('messages').children.length).toBe(1);
		});

		it('should append message with attachment', () => {
			const msg = { user: 'Bob', name: 'file.txt', uuid: '123', text: '' };
			messagesModule.addMessageToDOM(msg);
			expect(document.getElementById('messages').querySelector('a')).toBeTruthy();
		});
	});
});

