# Unilink - SynapTech University Research Platform

https://synaptech-fbc2huaabab8g6e0.southafricanorth-01.azurewebsites.net

---
## Technology Stack
- **Front-End**: HTML, CSS, JavaScript
- **Back-End**: Node.js, Express.js
- **Authentication**: Passport.js (Google & ORCID)
- **Database**: MySQL
- **Hosting**: Azure Web App
- **Version Control**: GitHub
- **Testing Tools**: Jest (Vitest)
- **Reporting**: Looker Studio

## Deployment
1. Clone the repository
2. Run 'npm install' in terminal to.
3. Set up an .env file to connect Google, ORCID and Database.
4. Run 'npm start' to run a local copy of the website. 
---
## Overview 
### Signup/Login
When first opening the app, you can either login with your pre-existing Google or Orcid account to access the site. If you do not have an account, Navigate to "Don't have an account?" and Sign-up with either of those options. At any point you want to logout, navigate top right to the button with your username and click "Logout".

### Creating New Projects
You can start either from Dashboard by clicking the + symbol, or by navigating to Create Project. Fill in details for Project Name, Description and Field of Study, set "Make project public" for either public or private, then click Create Project.

### Search & View Projects
For your own projects: under Dashboard, enter in search terms, and then Submit to get results. if you click on a specific result, you will see the details of that project. If you have the appropriate permissions, you can edit the project details.
For other projects: Similar setup, but instead under View Public Projects.

### Review Project
When viewing a project, you can click Review Project to be able to set a rating score and write a description of the review and then click Submit Review.

### Collaborator Requests (sending)
As a reviewer, when viewing a particular project you can click Request Collaboration to send a request. All outgoing requests can found under the Collaboration Requests tab.

### Collaborator Requests (accepting)
All Requests should be findable under Collaborator Invites.

### View & Edit Profile
Under the button featuring your name, a dropdown should appear with 3 options. Profile will allow you to view your profile while Settings will allow you to Save Changes as well as Delete Account.

### Viewing Other Profiles
### Messaging
