// settings.js
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("settings-form");
    const message = document.getElementById("message");
  
    form.addEventListener("submit", (e) => {
      e.preventDefault();
  
      // Get values
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const affiliation = document.getElementById("affiliation").value.trim();
  
      // Fake save simulation
      console.log("Settings saved:", { name, email, affiliation });
  
      message.textContent = "✅ Settings saved successfully!";
      message.style.color = "green";
    });
  });
  