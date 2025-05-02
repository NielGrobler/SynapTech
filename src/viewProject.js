export async function initPage() {
	// Create or select the elements we want to manipulate in the DOM
	const collabList = document.getElementById('collaboratorList');
	
	// Ensure the element exists before modifying it
	if (!collabList) {
	  console.error('collaboratorList element not found');
	  return;
	}
  
	// Populate collaborators list
	populateCollaborators(collabList);
  }
  
  function populateCollaborators(list) {
	// Clear the list first, so the test can check the newly added content
	list.innerHTML = '';
  
	if (!project.collaborators || project.collaborators.length === 0) {
	  list.innerHTML = 'No collaborators.';
	  return;
	}
  
	project.collaborators.forEach(collaborator => {
	  const li = document.createElement('li');
	  li.innerText = collaborator.name;
	  list.appendChild(li);
	});
  }
  