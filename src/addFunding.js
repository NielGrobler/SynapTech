document.getElementById('fundingForm').addEventListener("submit", async (e) => {
	e.preventDefault();
	
	const form = document.getElementById('fundingForm');
	const responseElem = document.getElementById('response');
	const params = new URLSearchParams(window.location.search);
	const projectId = params.get('id');

	const data = {
		project_id: parseInt(projectId),
		currency: form.currency.value,
		funding_type: form.fundingType.value,
		total_funding: parseFloat(form.totalFunding.value),
	};

	try {
		const response = await fetch('/add/funding', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		const result = await response.json();
		if (response.ok) {
			responseElem.textContent = "Funding added successfully!";
			location.reload();
		} else {
			alert("Error: " + result.message);
		}
	} catch (error) {
	    console.error("Funding submission failed:", error);
		responseElem.textContent = "Something went wrong.";
	}
});
