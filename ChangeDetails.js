/*On  first commit this is using a mock api in next sprint will try to make an api to actually put in*/
/*Guid not the actual id so have to fix that*/
// API URL for testing
const apiUrl = 'https://jsonplaceholder.typicode.com/posts';
//Button from HTML page
const nameButton = document.getElementById('detailsButton');
const GUid = 1;

//fetch current details
function fetchCurrentData(GUid) {
  fetch(`/${GUid}`)
      .then(response => response.json())
      .then(data => {
        const user = data[0];
        const initName = user.name;
        const initSurname = user.surname;
        const initDetails = user.details;
      })
}

document.getElementById('nameInput').value = 'initName';
document.getElementById('surnameInput').value = 'initSurname';
document.getElementById('descriptionInput').value = 'initDetails';

nameButton.addEventListener('click', () => {
    // Displaying the input values
    document.getElementById('nameInput').innerHTML =inputName;
    document.getElementById('surnameInput').innerHTML =inputSurname;
    document.getElementById('descriptionInput').innetHTML = inputSurname;
    document.getElementById('testParagraph').innerHTML = `Name: ${inputName}, Surname: ${inputSurname}, Details: ${inputDescription}`;
    
    // Data to send
    const data = {
        name: inputName,
        surname: inputSurname,
        description: inputDescription,
    };

    // Request options
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    };
    
    // Send the POST request to the mock API
    fetch(apiUrl, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Assuming you have an element with id "outputElement" to display the response
            document.getElementById('testParagraph') = JSON.stringify(data, null, 2);
        })
        .catch(error => {
            console.error('Error:', error);
        });
});
