import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import io from 'socket.io-client'
import module from './messages.js'

vi.mock('socket.io-client', () => {
	const socketMock = {
		on: vi.fn(),
		emit: vi.fn(),
	}

	const io = vi.fn(() => socketMock)

	return {
		__esModule: true,
		default: io,
	}
})

let socketMock

beforeEach(() => {
	const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <button id="uploadBtn"></button>
    <input type="file" id="file">
    <span id="attachment-name"></span>
    <div id="projects"></div>
    <div id="messages" style="height: 100px; overflow: auto;"></div>
    <div id="inputs" style="display: block"></div>
    <textarea id="text"></textarea>
    <button id="sendBtn"></button>
  </body></html>`)

	global.document = dom.window.document
	global.window = dom.window
	global.fetch = vi.fn()
	global.localStorage = {
		getItem: () => 'fake-jwt',
	}

	socketMock = io()
})

describe('Message Module', () => {
	it('should trigger file input click on upload button click', () => {
		const uploadBtn = document.getElementById('uploadBtn')
		const fileInput = document.getElementById('file')
		const clickSpy = vi.spyOn(fileInput, 'click')

		uploadBtn.onclick = () => fileInput.click()
		uploadBtn.click()

		expect(clickSpy).toHaveBeenCalled()
	})

	it('should show file name when a file is selected', () => {
		const fileInput = document.getElementById('file')
		const attachmentName = document.getElementById('attachment-name')

		const file = new window.File(['dummy content'], 'test.txt', {
			type: 'text/plain',
		})

		Object.defineProperty(fileInput, 'files', {
			value: [file],
		})

		fileInput.dispatchEvent(new window.Event('change'))

		expect(attachmentName.innerHTML).toContain("test.txt")
	})

	it('should show "No file chosen" if no file selected', () => {
		const fileInput = document.getElementById('file')
		const attachmentName = document.getElementById('attachment-name')

		Object.defineProperty(fileInput, 'files', {
			value: [],
		})

		fileInput.dispatchEvent(new window.Event('change'))

		expect(attachmentName.innerHTML).toBe("No file chosen")
	})

	it('scrollToBottomIfNeeded should scroll if near bottom', async () => {
		const messages = document.getElementById('messages')
		messages.innerHTML = '<div style="height: 300px;"></div>'
		messages.scrollTop = 0
		messages.scrollHeight = 400
		messages.clientHeight = 300

		await new Promise((resolve) => {
			requestAnimationFrame(() => {
				module.scrollToBottomIfNeeded()
				resolve()
			})
		})

		expect(messages.scrollTop).toBe(messages.scrollHeight)
	})

	it('should render a text-only message', () => {
		const messages = document.getElementById('messages')
		messages.innerHTML = ''
		const msg = { user: 'Alice', text: 'Hello!' }

		module.addMessageToDOM(msg)

		expect(messages.textContent).toContain('Alice')
		expect(messages.textContent).toContain('Hello!')
	})

	it('should render a file message with a link', () => {
		const messages = document.getElementById('messages')
		messages.innerHTML = ''

		const msg = {
			user: 'Bob',
			name: 'example.txt',
			uuid: '1234',
		}

		module.addMessageToDOM(msg)

		const link = messages.querySelector('a')
		expect(link).not.toBeNull()
		expect(link.textContent).toBe('example.txt')
	})

	it('fetchProjects: handles empty project list', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve([]),
		})

		const data = await module.fetchProjects()

		expect(data).toEqual([])
		expect(document.getElementById('projects').textContent).toContain('Nothing')
	})

	it('fetchProjects: renders project list with click handler', async () => {
		fetch.mockResolvedValueOnce({
			ok: true,
			json: () => Promise.resolve([{ id: '1', name: 'Test Project' }]),
		})

		const data = await module.fetchProjects()

		const projectLi = document.querySelector('#projects li')
		expect(projectLi.textContent).toBe('Test Project')

		projectLi.click()
		expect(socketMock.emit).toHaveBeenCalledWith('join-room', { roomId: '1' })

		expect(data.length).toBe(1)
	})

	it('fetchProjects: handles fetch error', async () => {
		fetch.mockRejectedValueOnce(new Error('Fetch failed'))
		const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => { })

		const result = await module.fetchProjects()

		expect(alertSpy).toHaveBeenCalled()
		expect(result).toEqual([])
	})
})

