import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as ToastModule from './toast.js'; // Import the entire module for spying
import { JSDOM } from 'jsdom';

let container;

beforeEach(() => {
	const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="toast-container"></div></body></html>`);
	global.document = dom.window.document;
	global.window = dom.window;
	container = document.getElementById('toast-container');
});

describe('Toast Notifications', () => {
	it('showToast creates and appends a success toast', () => {
		ToastModule.showToast('Success message');

		const toast = container.querySelector('.toast.toast-success');
		expect(toast).toBeTruthy();
		expect(toast.textContent).toContain('Success message');
		expect(toast.querySelector('i').className).toBe('bx bx-check-circle');
	});

	it('showToast creates and appends a fail toast', () => {
		ToastModule.showToast('Error message', 'fail');

		const toast = container.querySelector('.toast.toast-fail');
		expect(toast).toBeTruthy();
		expect(toast.textContent).toContain('Error message');
		expect(toast.querySelector('i').className).toBe('bx bx-error-circle');
	});

	it('toast is removed when clicked', () => {
		ToastModule.showToast('Clickable toast');
		const toast = container.querySelector('.toast');
		toast.click();
		expect(container.contains(toast)).toBe(false);
	});

	it('toast is removed after fadeOut animation ends', () => {
		ToastModule.showToast('Animated toast');
		const toast = container.querySelector('.toast');

		const event = new window.Event('animationend');
		Object.defineProperty(event, 'animationName', { value: 'fadeOut' });

		toast.dispatchEvent(event);
		expect(container.contains(toast)).toBe(false);
	});

	it('successToast calls showToast with type success', () => {
		const spy = vi.fn();
		ToastModule.successToast('Test success', spy);
		expect(spy).toHaveBeenCalledWith('Test success', 'success');
		spy.mockRestore();
	});

	it('failToast calls showToast with type fail', () => {
		const spy = vi.fn();
		ToastModule.failToast('Test fail', spy);
		expect(spy).toHaveBeenCalledWith('Test fail', 'fail');
		spy.mockRestore();
	});
});

