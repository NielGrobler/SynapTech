export const showToast = (message, type = 'success') => {
	const container = document.getElementById('toast-container');

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.setAttribute('role', 'status');
	toast.setAttribute('aria-live', 'polite');

	const icon = document.createElement('i');
	icon.className = type === 'success' ? 'bx bx-check-circle' : 'bx bx-error-circle';

	toast.appendChild(icon);
	toast.appendChild(document.createTextNode(message));

	toast.addEventListener('click', () => {
		container.removeChild(toast);
	});

	toast.addEventListener('animationend', (e) => {
		if (e.animationName === 'fadeOut') {
			container.removeChild(toast);
		}
	});

	container.appendChild(toast);
}

export const successToast = (message) => {
	showToast(message, 'success');
}

export const failToast = (message) => {
	showToast(message, 'fail');
}
