import pageAdder from "./pageAdder.js";

const purchaseToElement = (purchase) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = purchase.price;
	const description = document.createElement("p");
	description.textContent = purchase.name;
    const time = document.createElement("p");
    time.textContent = purchase.date_created;


	li.appendChild(title);
	li.appendChild(description);
    li.appendChild(time);

	return li;
}


const orgToElement = (org) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = org.funding_type;
	const description = document.createElement("p");
	description.textContent = org.currency + " " + org.total_funding;
	const id = org.funding_id;
    const time = document.createElement("p");
    time.textContent = org.date_created;

    const addSpending = document.createElement('button');
    addSpending.innerHTML = "Add Spending Record";

    addSpending.addEventListener("click", () => {
        window.location.href = `/add/spending?org=${encodeURIComponent(org.id)}`;
    });

	addSpending.add("highlight-hover");


	li.appendChild(title);
	li.appendChild(description);
    li.appendChild(time);
    li.appendChild(addSpending);

	return li;
}

const addTimelineToPage = (elementId, purchase) => {
	pageAdder.assignListToElement(
		elementId,
		purchase,
		purchaseToElement
	);
}

const addOrganizationToPage = (elementId, orgs) => {

	pageAdder.assignListToElement(
		elementId,
		orgs,
		orgToElement
	);
}

export default {
	addOrganizationToPage,
	addTimelineToPage,
};