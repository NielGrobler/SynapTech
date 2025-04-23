document.addEventListener('DOMContentLoaded', () => {
    // Retrieve data from sessionStorage
    const responseData = JSON.parse(sessionStorage.getItem('responseData'));
    
    // Display the response
    if (responseData) {
      document.getElementById('result').textContent = responseData.message;
    } else {
      document.getElementById('result').textContent = 'No response data found.';
    }
  });