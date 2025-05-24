import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'

const dom = new JSDOM(`
	<!DOCTYPE html>
	<html>
	<body>
		<ul id="projects"></ul>
		<ul id="messages"></ul>
		<section id="inputs"></section>
		<input type="file" id="file">
		<input id="text">
		<p id="attachment-name"></p>
		<button id="sendBtn"></button>
		<button id="uploadBtn"></button>
	</body>
	</html>
`);

global.document = dom.window.document;
global.window = dom.window;

global.Blob = class {
  constructor(content, options) {
    this.content = content
    this.type = options.type
  }
}
global.URL.createObjectURL = vi.fn(() => 'blob://test')
global.URL.revokeObjectURL = vi.fn()

const socketMock = {
	on: vi.fn(),
	emit: vi.fn(),
};

vi.mock('socket.io-client', () => ({
	io: vi.fn(() => socketMock)
}));

global.fetch = vi.fn()

describe('Message Module', () => {
	
	let messagesModule;
	let fileInput;

	beforeEach(async () => {
		vi.resetAllMocks();
		messagesModule = await import('./messages.js');
		fileInput = document.getElementById('file');

		//to mock it before each test instead
		fileInput.value = '';
		/*if (fileInput.files) {
			Object.defineProperty(fileInput, 'files', {
				value: [],
				writable: true,
			});
		}*/
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('should trigger file input click on upload button click', () => {
		const clickSpy = vi.spyOn(document.getElementById('file'), 'click')
		document.getElementById('uploadBtn').click()
		expect(clickSpy).toHaveBeenCalled()
	})

	it('should display selected file name on file change', () => {
		//const fileInput = document.getElementById('file')
		const txtElem = document.getElementById('attachment-name')
		const mockFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
		Object.defineProperty(fileInput, 'files', {
			value: [mockFile],
			writable: false,
		})

		const changeEvent = new window.Event('change')
		fileInput.dispatchEvent(changeEvent)

		expect(txtElem.innerHTML).toContain("Selected file 'test.txt'")
 	 })

	it('should handle fetchProjects with no data', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => [],
		})

		//const { fetchProjects } = await import('./messages.js');
		const data = await messagesModule.fetchProjects()

		expect(data).toEqual([])
		expect(document.getElementById('projects').innerHTML).toContain('Nothing to display.')
 	})

	it('should add messages to DOM', async () => {
		//const { addMessageToDOM } = await import('./messages.js');

		const testMsg = {
			user: 'Neil',
			text: 'Houston, we have a problem',
		}

		messagesModule.addMessageToDOM(testMsg)

		const messages = document.getElementById('messages').children
		expect(messages.length).toBe(1)
		expect(messages[0].innerHTML).toContain('Neil')
		expect(messages[0].innerHTML).toContain('Houston, we have a problem')
	})

	/*it('should emit socket message on send without file', async () => {
		messagesModule.socket = socketMock;

		messagesModule.selectedRoomId = '123';
		messagesModule.hasJoinedRoom = true;
		

		document.getElementById('text').value = 'Test message'
		//const fileInput = document.getElementById('file')
		//Object.defineProperty(fileInput, 'files', { value: [] })

		//const { selectedRoomId, hasJoinedRoom } = await import('./messages.js');
		//selectedRoomId = '123'
		//hasJoinedRoom = true

		document.getElementById('sendBtn').click()

		expect(socketMock.emit).toHaveBeenCalledWith('message', {
			roomId: '123',
			content: 'Test message',
		})
	})*/
})

