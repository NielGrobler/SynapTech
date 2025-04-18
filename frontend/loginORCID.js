window.onload = () => {
    const orcidLoginButton = document.getElementById("orcidLoginButton");
  
    const ORCID_CLIENT_ID = "APP-3I8F4OWN73DJB46C";
    const REDIRECT_URI = "http://127.0.0.1:5500/SynapTech/frontend/signedUp.html";
    const authURL = `https://orcid.org/oauth/authorize?client_id=${ORCID_CLIENT_ID}&response_type=code&scope=/authenticate&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  
    if (orcidLoginButton) {
        orcidLoginButton.href = authURL;
    }
  };
  
  //Function to get info from the Orcid Response, modify it as you want, use what yoy get here to write jest tests
  function handleOrcidResponse(response) {
    const params = new URLSearchParams(response);
    const name = params.get("name");
    const email = params.get("email");
  
    const payload = { name, email };
  
    window.location.href = "signedUp.html";
  
    return payload;
  }
  
  module.exports = { handleOrcidResponse };
