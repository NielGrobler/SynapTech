document.addEventListener("DOMContentLoaded", () => {
  console.log("Homepage loaded! 🧠");

  document.getElementById("profile-link").addEventListener("click", () => {
    window.location.href = '/profile'; // Redirects to the profile page
  });

  document.getElementById("search-link").addEventListener("click", () => {
    window.location.href = '/search';
  });

  document.getElementById("projects-link").addEventListener("click", () => {
    window.location.href = '/projects';
  });

  document.getElementById("collab-link").addEventListener("click", () => {
    window.location.href = '/collab';
  });

  document.getElementById("settings-link").addEventListener("click", () => {
    window.location.href = '/settings';
  });

  document.getElementById("logout-link").addEventListener("click", () => {
    alert("You have successfully logged out!");
    window.location.href = "/homepage";
  } )
});




