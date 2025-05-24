import userInfo from './userInfo.js';

const username = document.getElementById('username');
const bio = document.getElementById('bio');
const university = document.getElementById('university');
const department = document.getElementById('department');

const fetchinfo = async () => {
	try {
		const user = await userInfo.fetchFromApi();
		
		if (!user.name) {
			username.value = "";
		} else {
			username.value = user.name;
		}

		if (!user.bio) {
			bio.value = "";
		} else {
			bio.value = user.bio;
		}

		if (!user.university) {
			university.value = "";
		} else {
			university.value = user.university;
		}

		if (!user.department) {
			department.value = "";
		} else {
			department.value = user.department;
		}

	} catch (err) {
		console.error('Error loading user:', err);
	}
}

document.addEventListener("DOMContentLoaded", () => {
    fetchinfo();
  });

const changeDetails = async()=>{
	const info = await userInfo.fetchFromApi();
	const id = info.id;

	try {
		const res = await fetch('/update/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, username, bio, university, department })
		  });
		} catch(error) {
			console.error('Error changing data users:', error);
		}

	fetchinfo();
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
				alert("Account deletion canceled.");
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