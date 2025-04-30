
(async () => {
	let res = await fetch('/api/collaborator');
	let data = await res.json();

	console.log(data);
})();
