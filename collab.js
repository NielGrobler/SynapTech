document.addEventListener("DOMContentLoaded", () => {
    console.log("Collab page loaded!");
  
    const section = document.getElementById("collab-list");
    section.innerHTML = `
      <article>
        <h3>🔬 Seeking ML Collaboration</h3>
        <p>Dr. Ndlovu is looking for partners on a Machine Learning project in healthcare.</p>
        <p><strong>Contact:</strong> ndlovu@example.com</p>
      </article>
      <hr>
      <article>
        <h3>🌍 Climate Data Analysis</h3>
        <p>Prof. Mensah is open to collaborate on climate-related data modeling.</p>
        <p><strong>Contact:</strong> mensah@example.com</p>
      </article>
    `;
  });
  