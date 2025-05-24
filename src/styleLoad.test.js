// src/styleLoad.test.js
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

describe('styleLoad.js', () => {
	let originalReadyState;

	beforeEach(() => {
		// Save original readyState
		originalReadyState = Object.getOwnPropertyDescriptor(document, 'readyState');

		// Reset body styles and innerHTML
		document.body.style.opacity = '0';
		document.body.style.visibility = 'hidden';
		document.body.innerHTML = '';
		vi.useFakeTimers();
	});

	afterEach(() => {
		// Restore original readyState
		if (originalReadyState) {
			Object.defineProperty(document, 'readyState', originalReadyState);
		}
		vi.useRealTimers();
	});

	// test('sets body opacity and visibility on window load', async () => {
	// 	Object.defineProperty(document, 'readyState', {
	// 		get: () => 'loading',
	// 		configurable: true,
	// 	});

	// 	await import('./styleLoad.js');

	// 	window.dispatchEvent(new Event('load'));
	// 	await vi.runAllTimersAsync();

	// 	expect(document.body.style.opacity).toBe('1');
	// 	expect(document.body.style.visibility).toBe('visible');
	// });

	// test('removes critical-css element if present', async () => {
	// 	Object.defineProperty(document, 'readyState', {
	// 		get: () => 'loading',
	// 		configurable: true,
	// 	});

	// 	const cssEl = document.createElement('style');
	// 	cssEl.id = 'critical-css';
	// 	document.body.appendChild(cssEl);

	// 	await import('./styleLoad.js');

	// 	window.dispatchEvent(new Event('load'));
	// 	await vi.runAllTimersAsync();

	// 	expect(document.getElementById('critical-css')).toBeNull();
	// });

	test('timeout fallback also triggers showContent()', async () => {
		Object.defineProperty(document, 'readyState', {
			get: () => 'loading',
			configurable: true,
		});

		await import('./styleLoad.js');

		document.dispatchEvent(new Event('DOMContentLoaded'));
		await vi.advanceTimersByTimeAsync(3000);

		expect(document.body.style.opacity).toBe('1');
		expect(document.body.style.visibility).toBe('visible');
	});
});
