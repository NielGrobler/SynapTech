

const project = {
	name: 'New Cool Project',
	description: 'This is something amazing',
	isPublic: true,
};

fetch('http://localhost:3000/api/project', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
	},
	body: JSON.stringify(project),
})
	.then(res => res.json())
	.then(data => {
		console.log('Server response:', data);
	})
	.catch(err => {
		console.error('Error:', err);
	});

