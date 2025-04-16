// frontend/formHandler.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('researchForm');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent the default form submission

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(form.action, {
                    method: form.method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (response.ok) {
                    const responseData = await response.json();
                    // Store the response data in sessionStorage
                    sessionStorage.setItem('responseData', JSON.stringify(responseData));
                    // Redirect to the display page
                    window.location.href = '/pageToGoToWhenUploadingResearchDetail';
                } else {
                    console.error('Form submission failed:', response.status);
                    // Optionally display an error message to the user
                }
            } catch (error) {
                console.error('There was an error submitting the form:', error);
                // Optionally display an error message to the user
            }
        });
    } else {
        console.error('Form element with ID "researchForm" not found.');
    }
});