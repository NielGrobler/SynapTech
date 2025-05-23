import userInfo from './userInfo.js'
import pageAdder from './pageAdder.js'

let milestones = [];
let completed = [];
let uncompleted = [];

const milestoneToElementUncompletedUserOwner = (milestone) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = milestone.name;
	const description = document.createElement("p");
	description.textContent = milestone.description;

	const complete = document.createElement('button');
	complete.addEventListener('click', async () => {
		await completeMilestone(milestone.id, complete);
	});
	complete.textContent = "Complete";
	complete.style.color = "green";

	const edit = document.createElement('button');
	edit.addEventListener('click', () => {
        window.location.href = `/redirect/edit/milestone?id=${encodeURIComponent(milestone.id)}`;
	});
	edit.textContent = "Edit";

	li.appendChild(title);
	li.appendChild(description);
	li.appendChild(complete);
	li.appendChild(edit);

	return li;
};

const milestoneToElementUncompleted = (milestone) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = milestone.name;
	const description = document.createElement("p");
	description.textContent = milestone.description;

	li.appendChild(title);
	li.appendChild(description);

	return li;
};

const milestoneToElementCompletedUserOwner = (milestone) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = milestone.name;
	title.style.textDecoration = 'line-through';
	const description = document.createElement("p");
	description.textContent = milestone.description;

	const complete = document.createElement('button');
	complete.addEventListener('click', async () => {
		await uncompleteMilestone(milestone.id, complete);
	});
	complete.textContent = "Revert to Uncompleted";

	li.appendChild(title);
	li.appendChild(description);
	li.appendChild(complete);

	return li;
};

const milestoneToElementCompleted = (milestone) => {
	const li = document.createElement("li");
	const title = document.createElement("strong");
	title.textContent = milestone.name;
	title.style.textDecoration = 'line-through';
	const description = document.createElement("p");
	description.textContent = milestone.description;

	li.appendChild(title);
	li.appendChild(description);

	return li;
};

const addMilestoneToPage = (elementId, milestones, functionName) => {
	pageAdder.assignListToElement(
		elementId,
		milestones,
		functionName
	);
};

const viewMilestones = async (project) => {
    const listele = document.getElementById('milestoneList');
	const mileElement = document.getElementById('milestone');
	console.log("View Milestone");
	const user = await userInfo.fetchFromApi();
	const res = await fetch(`/get/milestones/by-project?id=${encodeURIComponent(project.id)}`);
	milestones = await res.json();

	uncompleted = [];
	completed = [];

    if(milestones.length > 0){
        for (const stone of milestones) {
            if (!stone.completed_at) {
                uncompleted.push(stone);
            } else {
                completed.push(stone);
            }
        }
    }

	if (user.id == project.created_by_account_id) {
        listele.innerHTML = '';
        if(milestones.length == 0){
            const temp = document.createElement('li');
            const mess = document.createElement('textarea');
            mess.innerHTML = 'There are currently no milestones for this project';
            temp.appendChild(mess);
            listele.appendChild(temp);
        }else{
            addMilestoneToPage('milestoneList', uncompleted, milestoneToElementUncompletedUserOwner);
        }

        const add = document.createElement('button');
        add.textContent = "Add Milestone";
        add.addEventListener('click', async () => {
        window.location.href = `/redirect/add/milestone?id=${encodeURIComponent(project.id)}`;
		});

		mileElement.appendChild(add);

		if (completed.length > 0) {
			const viewAll = document.createElement('button');
			viewAll.textContent = "View All Milestones";
			viewAll.addEventListener('click', () => {
				addMilestoneToPage('milestone', completed, milestoneToElementCompletedUserOwner);
			});
			mileElement.appendChild(viewAll);
		}
	} else {
        listele.innerHTML = '';
        if(milestones.length == 0){
            const temp = document.createElement('li');
            const mess = document.createElement('textarea');
            mess.innerHTML = 'There are currently no milestones for this project';
            temp.appendChild(mess);
            listele.appendChild(temp);
        }else{
		    addMilestoneToPage('milestone', uncompleted, milestoneToElementUncompleted);
        }

		if (completed.length > 0) {
			const viewAll = document.createElement('button');
			viewAll.textContent = "View All Milestones";
			viewAll.addEventListener('click', () => {
				addMilestoneToPage('milestone', completed, milestoneToElementCompleted);
			});
			mileElement.appendChild(viewAll);
		}
	}
};

const viewSingleMilestone = async () =>{
    const params = new URLSearchParams(window.location.search);
    const milestoneId = params.get('id');
	const res = await fetch(`/get/milestone/by-id?id=${encodeURIComponent(milestoneId)}`);
    const milestone = res.json();
    const milename = document.getElementById('name');
    const miledesc = document.getElementById('discription');
    milename.value = milestone.name;
    miledesc.value = milestone.description;
};

const addMilestone = async () => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id'); 
    console.log(projectId);
	console.log("Add milestone");
	const answer = document.getElementById('response');
	const form = document.getElementById('add-milestone');

	form.addEventListener("submit", async (e) => {
		e.preventDefault();
        const mileName = form.name.value;
        console.log(mileName);
        const miledescp = form.description.value;
        console.log(miledescp);

		const data = {
			project_id: parseInt(projectId),
			name: mileName,
			description: miledescp
		};

		try {
			const response = await fetch('/add/milestone', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();
			if (response.ok) {
				answer.textContent = 'Milestone added successfully';
			}
		} catch (error) {
			console.error("Milestone submission failed:", error);
			answer.textContent = "Something went wrong.";
		}
	});
};

const completeMilestone = async (id, element) => {
	console.log("Complete Milestone");

	try {
		const response = await fetch('/complete/milestone', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(id)
		});

		const result = await response.json();
		if (response.ok) {
			element.style.textDecoration = 'line-through';
		}
	} catch (error) {
		console.error("Milestone completion failed:", error);
	}
};

const uncompleteMilestone = async (id, element) => {
	console.log("Uncomplete Milestone");

	try {
		const response = await fetch('/uncomplete/milestone', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ id })
		});

		const result = await response.json();
		if (response.ok) {
			element.style.textDecoration = 'none';
		}
	} catch (error) {
		console.error("Removing milestone completion failed:", error);
	}
};

const editMilestone = async () => {
    const params = new URLSearchParams(window.location.search);
    const milestoneId = params.id;
	console.log("Edit Milestone");
	const answer = document.getElementById('response');
	const form = document.getElementById('edit-milestone');

	form.addEventListener("submit", async (e) => {
	    e.preventDefault();


		const data = {
			project_id: parseInt(milestoneId),
			name: form.name.value,
			description: form.description.value
		};

		try {
			const response = await fetch('/edit/milestone', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});

			const result = await response.json();
			if (response.ok) {
				answer.textContent = 'Milestone edited successfully';
			}
		} catch (error) {
			console.error("Milestone edit failed:", error);
			answer.textContent = "Something went wrong.";
		}
	});
};

const deleteMilestone = async () => {
    const params = new URLSearchParams(window.location.search);
    const milestoneId = params.id;
	console.log("Delete Milestone");
	const answer = document.getElementById('response');
    const delButn = document.getElementById('deleteButton');

    delButn.addEventListener('click', async()=>{
        try {
		const response = await fetch('/delete/milestone', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ milestoneId })
		});

		const result = await response.json();
		if (response.ok) {
			answer.textContent = 'Milestone deleted successfully';
		}
	} catch (error) {
		console.error("Milestone deletion failed:", error);
		answer.textContent = "Something went wrong.";
	}
    })
};

export default {
	addMilestone,
	editMilestone,
	deleteMilestone,
	viewMilestones,
    viewSingleMilestone
};
