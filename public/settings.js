import fetchUsername from './fetchUsername.js';

(async () => {
	try {
		const userInfo = await fetchUsername.fetchUserInfo();
		document.getElementById('username').value = userInfo.name;

		if (!userInfo.bio) {
			document.getElementById('bio').value = "No bio.";
		} else {
			document.getElementById('bio').value = userInfo.name;
		}

		const deleteButton = document.getElementById('deleteButton');

		deleteButton.addEventListener('click', function() {
			const userConfirmed = confirm("Are you sure you want to delete your account?");
			if (!userConfirmed) {
				alert("Account deletion canceled.");
				return;
			}

			fetch('/remove/user', {
				method: 'POST',
				body: JSON.stringify({ reqToDeleteId: userInfo.id })
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
			alert("Account deletion initiated!");
		});
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();


