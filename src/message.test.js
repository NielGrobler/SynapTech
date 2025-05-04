import {
	constructMessage,
	pushRemaining,
	mergeConstruct,
	groupByCategory,
	addClasses,
	toHTML,
	unactivateActiveUser,
	userToHTML,
	insertUsersIntoDocument,
	insertMessagesIntoDocument,
	fetchMessages,
	fetchMessagedUsers,
	setConversation,
	sendHandler,
	initMessagedUsers,
} from './message.js';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Message Module', () => {
	let dom;

	beforeEach(() => {
		dom = new JSDOM(`
			<!DOCTYPE html>
			<body>
				<ul id="messagedUsers"></ul>
				<section id="conversation"></section>
				<form id="sendForm">
					<input name="message" value="Test Message"/>
					<button id="sendButton">Submit</button>
				</form>
			</body>
		`);

		global.document = dom.window.document;
		global.window = dom.window;
		global.FormData = dom.window.FormData;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructMessage', () => {
		it('should return a constructed message object', () => {
			const raw = { you_sent: 'hi', they_sent: 'hello', created_at: '2023-01-01' };
			const msg = constructMessage(raw, true);
			expect(msg).toEqual({ fromFst: true, content: 'hi', createdAt: '2023-01-01' });
		});
	});

	describe('mergeConstruct', () => {
		it('merges and constructs sorted messages', () => {
			const fst = [{ created_at: 1, you_sent: 'A' }];
			const snd = [{ created_at: 2, they_sent: 'B' }];
			const merged = mergeConstruct(fst, snd, constructMessage, (a, b) => a.created_at < b.created_at);
			expect(merged.length).toBe(2);
			expect(merged[0].content).toBe('A');
			expect(merged[1].content).toBe('B');
		});
	});

	describe('groupByCategory', () => {
		it('groups contiguous items by a category', () => {
			const items = [
				{ fromFst: true },
				{ fromFst: true },
				{ fromFst: false },
				{ fromFst: false },
				{ fromFst: true },
			];
			const groups = groupByCategory(items, (x) => x.fromFst ? 'A' : 'B');
			expect(groups.length).toBe(3);
		});
	});

	describe('toHTML', () => {
		it('creates a valid article element from message object', () => {
			const msg = { content: 'Hello', createdAt: new Date().toISOString(), fromFst: true };
			const el = toHTML(msg, 0, 1);
			expect(el.tagName).toBe('ARTICLE');
			expect(el.querySelector('p').textContent).toBe('Hello');
			expect(el.querySelector('time')).toBeTruthy();
		});
	});

	describe('insertUsersIntoDocument', () => {
		it('inserts users into the DOM', () => {
			const users = [
				{ name: 'Alice', account_id: '1' },
				{ name: 'Bob', account_id: '2' },
			];
			insertUsersIntoDocument(users);
			const lis = document.querySelectorAll('#messagedUsers li');
			expect(lis.length).toBe(2);
		});
	});

	describe('insertMessagesIntoDocument', () => {
		it('inserts merged messages into the DOM', () => {
			const rawMessages = [
				[{ you_sent: 'A', created_at: 1 }],
				[{ they_sent: 'B', created_at: 2 }]
			];
			insertMessagesIntoDocument(rawMessages);
			const articles = document.querySelectorAll('#conversation article');
			expect(articles.length).toBe(2);
		});
	});

	describe('sendHandler', () => {
		it('sends a message and resets form', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ success: true }),
			});

			global.activeUserId = '123'; // mock global from the module

			const e = { preventDefault: vi.fn() };
			await sendHandler(e);

			const button = document.getElementById('sendButton');
			expect(button.disabled).toBe(false);
			expect(button.textContent).toContain('Submit');
		});
	});

	describe('initMessagedUsers', () => {
		it('fetches and inserts users into the DOM', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => [{ name: 'John', account_id: '1' }],
			});
			const topId = await initMessagedUsers();
			expect(topId).toBe('1');
		});
	});

	describe('fetchMessages', () => {
		it('returns parsed messages on success', async () => {
			const mockMessages = [[], []];
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => mockMessages,
			});
			const res = await fetchMessages('1');
			expect(res).toEqual(mockMessages);
		});
	});
});

