import userInfo from './userInfo.js';

(async () => {
	try {
		const info = await userInfo.fetchFromApi();
		document.getElementById('username').value = info.name;

		if (!info.bio) {
			document.getElementById('bio').value = "No bio.";
		} else {
			document.getElementById('bio').value = info.name;
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
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();


