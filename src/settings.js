import userInfo from './userInfo.js';

const fetchinfo = async () => {
	try {
		const info = await userInfo.fetchFromApi();

		const res = await fetch(`/api/user?id=${encodeURIComponent(info.id)}`);
        const newinfo = await res.json()
        const uni = newinfo[0].university;
        const department = newinfo[0].department;

		document.getElementById('username').value = info.name;

		if (!info.bio) {
			document.getElementById('bio').value = "No bio.";
		} else {
			document.getElementById('bio').value = info.bio;
		}

		if (!uni){
			document.getElementById('university').value = "No listed university";
		}else{
			document.getElementById('university').value = uni;
		}

		if (!department){
			document.getElementById('department').value = "No listed department";
		}else{
			document.getElementById('department').value = department;
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