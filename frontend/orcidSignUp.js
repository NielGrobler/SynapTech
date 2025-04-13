window.onload = () => {
	const orcidButton = document.getElementById("orcidButton");

	const ORCID_CLIENT_ID = "APP-3I8F4OWN73DJB46C";
	const REDIRECT_URI = "http://127.0.0.1:5500/SynapTech/frontend/signedUp.html";

	const authURL = `https://orcid.org/oauth/authorize?client_id=${ORCID_CLIENT_ID}&response_type=code&scope=/authenticate&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

	if (!orcidButton) {
		// do stuff
		return;
	}

	orcidButton.addEventListener("click", () => {
		window.location.href = authURL;
	});
};

//Function to get info from the Orcid Response
function handleOrcidResponse(response) {
	const params = new URLSearchParams(response);
	const name = params.get("name");
	const email = params.get("email");

	const payload = { name, email };

	window.location.href = "signedUp.html";

	return payload;
}

module.exports = { handleOrcidResponse };

