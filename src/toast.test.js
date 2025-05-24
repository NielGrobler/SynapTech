import { describe, it, beforeEach, expect, vi } from 'vitest';
import toastModule from './toast';

describe('showToast', () => {
	beforeEach(() => {
		document.body.innerHTML = '<section id="toast-container"></section>';
	});

	it('should create a success toast with correct icon and message', () => {
		toastModule.showToast('Success message', 'success');

		const toast = document.querySelector('.toast-success');
		expect(toast).toBeTruthy();
		expect(toast.textContent).toContain('Success message');
		expect(toast.querySelector('i').className).toContain('bx-check-circle');
	});

	it('should create an error toast with correct icon and message', () => {
		toastModule.showToast('Error occurred', 'error');

		const toast = document.querySelector('.toast-error');
		expect(toast).toBeTruthy();
		expect(toast.textContent).toContain('Error occurred');
		expect(toast.querySelector('i').className).toContain('bx-error-circle');
	});

	it('should remove the toast on click', () => {
		toastModule.showToast('Click to dismiss', 'success');

		const toast = document.querySelector('.toast');
		toast.click();

		expect(document.querySelector('.toast')).toBeNull();
	});
	it('should remove the toast on fadeOut animation end', () => {
		toastModule.showToast('Auto dismiss', 'success');

		const toast = document.querySelector('.toast');

		// Simulate animationend with a fake animationName
		const event = new Event('animationend');
		Object.defineProperty(event, 'animationName', { value: 'fadeOut' });

		toast.dispatchEvent(event);

		expect(document.querySelector('.toast')).toBeNull();
	});
});

