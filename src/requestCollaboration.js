// Wait for the DOM to load
document.addEventListener("DOMContentLoaded", () => {
    const roleSelect = document.getElementById("role");
    const otherText = document.getElementById("otherText");
    const otherLabel = document.getElementById("otherLabel");

    roleSelect.addEventListener("change", () => {
        if (roleSelect.value === "Other") {
            otherText.style.display = "inline-block";
            otherLabel.style.display = "inline-block";
        } else {
            otherText.style.display = "none";
            otherLabel.style.display = "none";
        }
    });
});
