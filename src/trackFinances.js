import pageAdder from "./financePageAdder.js";

const fetchFunding = async () => {
	try {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');
		const res = await fetch(`/fetch/funding?id=${encodeURIComponent(projectId)}`);

		if (!res.ok) {
			throw new Error('Failed to fetch users');
		}

		const orgs = await res.json();
		document.getElementById("organizationList").innerHTML = "";
		pageAdder.addOrganizationToPage('organizationList', orgs);
	} catch (error) {
		console.error('Error fetching funding:', error);
	}
}

const fetchTimeline = async () => {
	try {
        const params = new URLSearchParams(window.location.search);
        const projectId = params.get('id');
		const res = await fetch(`/fetch/spending?id=${encodeURIComponent(projectId)}`);

		if (!res.ok) {
			throw new Error('Failed to fetch spending');
		}

		const purchases = await res.json();
		document.getElementById("spendingList").innerHTML = "";
		pageAdder.addUsersToPage('spendingList', purchases);
	} catch (error) {
		console.error('Error fetching users:', error);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	fetchFunding();
    fetchTimeline();
});