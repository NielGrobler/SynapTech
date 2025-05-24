document.getElementById('addExpenditure').addEventListener("submit", async (e) => {
	e.preventDefault();
	
	const form = document.getElementById('fundingForm');
	const responseElem = document.getElementById('response');
	const params = new URLSearchParams(window.location.search);
	const fundingId = params.get('id');

	const data = {
		project_id: parseInt(fundingId),
		amount: form.amount.value,
		description: form.description.value,
	};

	try {
		const response = await fetch('/add/expenditure', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		const result = await response.json();
		if (response.ok) {
			responseElem.textContent = "Expenditure added successfully!";
			location.reload();
		} else {
			alert("Error: " + result.message);
		}
	} catch (error) {
	    console.error("Expenditure submission failed:", error);
		responseElem.textContent = "Something went wrong.";
	}
});