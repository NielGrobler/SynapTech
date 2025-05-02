export async function fetchProjects(projectName) {
	try {
	  const response = await fetch(`/api/search/project?projectName=${projectName}`);
	  if (!response.ok) throw new Error('Network response was not ok');
  
	  const projects = await response.json();
	  const container = document.getElementById("searchResultsContainer");
	  container.innerHTML = "";
  
	  if (projects.length === 0) {
		container.innerHTML = "<p>No projects found</p>";
	  } else {
		projects.forEach(project => {
		  const projectElement = document.createElement("div");
		  projectElement.innerHTML = `<h3>${project.name}</h3><p>${project.description}</p>`;
		  container.appendChild(projectElement);
		});
	  }
	} catch (error) {
	  console.error("Error fetching projects:", error);
	}
  }
  
  export function setupSearchForm() {
	const form = document.getElementById("searchForm");
	form.addEventListener("submit", async (e) => {
	  e.preventDefault();
	  const input = document.getElementById("searchInput").value;
	  await fetchProjects(input);
	});
  }
  