import userInfo from './userInfo.js';
import { failToast, successToast } from './toast.js';

let info = {};

const setOrElse = (elementId, field, elementName) => {
	if (!field) {
		document.getElementById(elementId).value = `No ${elementName}`;
	} else {
		document.getElementById(elementId).value = field;
	}
}

const loadInfo = async () => {
	try {
		const uni = info.university;
		const department = info.department;
		console.log(info);

		document.getElementById('username').value = info.name;
		setOrElse('bio', info.bio, 'bio');
		setOrElse('university', uni, 'listed university');
		setOrElse('department', department, 'listed department');
	} catch (err) {
		console.error('Error loading user:', err);
	}
}

document.addEventListener("DOMContentLoaded", async () => {
	info = await userInfo.fetchFromApi();
	await loadInfo();
});

const changeDetails = async() => {
	const id = info.id;
	const username = document.getElementById('username').value;
	const bio = document.getElementById('bio').value;
	const university = document.getElementById('university').value;
	const department = document.getElementById('department').value;

	try {

		const res = await fetch('/update/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, username, bio, university, department })
		});

		if (res.ok) {
			successToast('Succesfully changed details!');
		} else {
			failToast('Failed updating details.');
		}
	} catch(error) {
		console.error('Error changing data users:', error);
	}

	info = await userInfo.fetchFromApi();
	await loadInfo();
}

const changeButton = document.getElementById('changeButton');

changeButton.addEventListener("click", async function(event) {
	event.preventDefault();

	changeDetails();
});

const resetButton = document.getElementById('resetButton');

resetButton.addEventListener("submit", async function(event) {
	event.preventDefault();

	document.addEventListener("DOMContentLoaded", () => {
		fetchinfo();
	});
});

const deleteButton = document.getElementById('deleteButton');

deleteButton.addEventListener('click', async function() {
	const userConfirmed = confirm("Are you sure you want to delete your account?");
	if (!userConfirmed) {
		failToast("Account deletion canceled.");
		return;
	}

	fetch('/remove/user', {
		method: 'POST',
		body: JSON.stringify({ reqToDeleteId: info.id })
	})
		.then(response => {
			if (response.ok) {
				alert('Account deleted successfully!');
				window.location.href = '/';
			} else {
				alert('Error deleting account. Please try again.');
			}
		})
		.catch(error => {
			alert('An error occurred: ' + error.message);
		});
});

document.addEventListener;
