import userInfo from './userInfo.js';

export const fetchinfo = async () => {
	try {
		const info = await userInfo.fetchFromApi();
		const res = await fetch(`/api/user?id=${encodeURIComponent(info.id)}`);
        if (!res.ok) throw new Error('Failed to fetch user data');
		
		const newinfo = await res.json()
        const uni = newinfo[0].university || "No listed university";
        const department = newinfo[0].department  || "No listed department";

		//there are different generic values loaded in here
		document.getElementById('username').value = info.name || "";
		document.getElementById('bio').value = info.bio || "No bio.";
		document.getElementById('university').value = uni || "No listed university";
		document.getElementById('department').value = department || "No listed department";
	} catch (err) {
		console.error('Error loading user:', err);
	}
}

const changeDetails = async()=>{
	event.preventDefault();

	try {
		const info = await userInfo.fetchFromApi();
		const id = info.id;
		const username = document.getElementById('username').value;
		const bio = document.getElementById('bio').value;
		const university = document.getElementById('university').value;
		const department = document.getElementById('department').value;
		
		await fetch('/update/profile', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, username, bio, university, department })
		  });
		  await fetchinfo();
		} catch(error) {
			console.error('Error changing data:', error);
		}
};

const initialize = () => {
    const changeButton = document.getElementById('changeButton');
	const resetButton = document.getElementById('resetButton');
	const deleteButton = document.getElementById('deleteButton');

	if (changeButton) {
		changeButton.addEventListener("click", changeDetails);
	}

	if (resetButton) {
		resetButton.addEventListener("click", (event) => {
			event.preventDefault();
			fetchinfo();
		});
	} 

	if (deleteButton) {
		deleteButton.addEventListener('click', async (event) => {
			event.preventDefault();
			if(!confirm("Are you sure you want to delete your account?")){
				alert("Account deletion canceled.");
				return;
			}

			try {
                const info = await userInfo.fetchFromApi();  // Added missing userInfo fetch
                const response = await fetch('/remove/user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reqToDeleteId: info.id })
                });
                
                if (!response.ok) throw new Error('API error');
				alert('Account deleted successfully!');
				window.location.href = '/';
            } catch (error) {
                alert('An error occurred: ' + error.message);
            }
		});
	}

	fetchinfo();
};


document.addEventListener("DOMContentLoaded", initialize);
window.initialize = initialize;
window.fetchinfo = fetchinfo;