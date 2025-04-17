document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("search-form");
    const resultsSection = document.getElementById("results");
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const query = document.getElementById("query").value.trim();
  
      // Simulate search results
      const fakeResults = [
        {
          name: "Dr. Zanele Moyo",
          orcid: "0000-1111-2222-3333",
          interest: "Data Science",
          affiliation: "University of Johannesburg"
        },
        {
          name: "Prof. T. van der Merwe",
          orcid: "0000-4444-5555-6666",
          interest: "AI Ethics",
          affiliation: "University of Cape Town"
        }
      ];
  
      const filtered = fakeResults.filter(
        researcher =>
          researcher.name.toLowerCase().includes(query.toLowerCase()) ||
          researcher.interest.toLowerCase().includes(query.toLowerCase()) ||
          researcher.orcid.includes(query)
      );
  
      resultsSection.innerHTML = "<h2>Results:</h2>";
  
      if (filtered.length === 0) {
        resultsSection.innerHTML += "<p>No researchers found.</p>";
      } else {
        filtered.forEach(r => {
          resultsSection.innerHTML += `
            <article>
              <h3>${r.name}</h3>
              <p><strong>ORCID:</strong> ${r.orcid}</p>
              <p><strong>Field:</strong> ${r.interest}</p>
              <p><strong>Affiliation:</strong> ${r.affiliation}</p>
            </article>
            <hr>
          `;
        });
      }
    });
  });
  