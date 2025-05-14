import pageAdder from './pageAdder.js';
let projects = [];
let pubProjs = [];

let suspend;

const checkAdmin = async (isSus) => {
	const res = await fetch('/admin');
	const admin = await res.json();

	if (admin) {
		suspend = document.createElement('button');
		console.log(isSus)

		if (isSus){
			suspend.innerText = 'Unuspend User';
		} else{
			suspend.innerText = 'Suspend User';
		}
		suspend.id = 'suspendButton';
		document.body.appendChild(suspend);

		suspend.addEventListener('click', async () => {
			const params = new URLSearchParams(window.location.search);
			const userId = params.get('id');
			if(isSus){
				await fetch('/suspend/user?id=${encodeURIComponent(userId)}', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: userId })
			});}else{
				await fetch('/unsuspend/user?id=${encodeURIComponent(userId)}', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ id: userId })
			});}
			
			const newStatus = await fetch(`/isSuspended?id=${encodeURIComponent(userId)}`);
			const newisSus = await newStatus.json();
	
			if (newisSus){
				suspend.innerText = 'Unuspend User';
			} else{
				suspend.innerText = 'Suspend User';
			}
			console.log(newisSus)
		});

	}
};

const populateElements = async () => {
	
	const params = new URLSearchParams(window.location.search);
	const userId = params.get('id');
	if (!userId) {
		return null;
	}
	const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
	const user = await res.json();
	if (!user) {
		document.getElementById('userName').innerText = "Could not display user.";
		return;
	}
	await checkAdmin(user.is_suspended);

	document.getElementById('userName').innerText = user.name;
	document.getElementById('userUni').innerHTML = user.university;
	document.getElementById('userDepartment').innerHTML = user.department;
	document.getElementById('userBio').innerHTML = user.bio;
};

document.addEventListener("DOMContentLoaded", () => {
	populateElements();
});


(async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects);
	} catch (err) {
		console.error('Error loading Projects:', err);
	}
})();
