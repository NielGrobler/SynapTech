document.addEventListener('DOMContentLoaded', () => {
	console.log("HELLO????");
	const root = document.documentElement;

	const saved = localStorage.getItem('theme');
	if (saved) {
		root.setAttribute('data-theme', saved);
	} else {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
	}
});
