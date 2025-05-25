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
- **Reporting**: Chart.js

## Deployment
1. Clone the repository.
2. Run 'npm install' in the terminal to install dependencies.
3. Set up .env file to set up Session Secret, Google and ORCID OAuth, and Database/File Storage Hosts.
4. Run 'npm start' to run a local copy of the website. 
5. (optional) Run 'npm test' to run tests.
---
## Overview 
### Signup/Login
When first opening the app, you can login with either your pre-existing Google or ORCID account to access the site. If you do not have an account, navigate to "Don't have an account?" and Sign-up with either of those options. At any point you want to logout, navigate top right to the button with your username and click "Logout".

### Search & View Your Projects
On your dashboard, you should see a list of your projects. If you click on a particular project, you can view the associated information with a project. Using the search bar, you can narrow down the results.

### Creating New Projects
From the Dashboard, click Create Project. Fill in details for Project Name, Description and Field of Study, set the visibility to either public or private. If successful, the project should appear on your dashboard.

### Edit Projects
When viewing a project, you can add Milestones, upload Project Files and request funding

### See Reports
Navigate to Analytics. On that page, you should see multiple reports for Funding, Project Completion and the ability to make custom reports which can be downloaded.

### Messaging
Navigate to Messages. From there, there should be a list of all projects you are involved with. Select one and then send messages in its appropriate chat.

### Search Other Projects and Users
Navigate to Search and make sure Projects is toggled. After looking for terms, you can view any project info from the results by clicking on it. Toggling it to User gives results for users, where you can view their profiles.

### Review Project
When viewing a project, you can click Review Project to be able to set a rating score and write a description of the review and then click Submit Review.

### Collaborator Requests (sending)
When viewing a particular project you can click Request Collaboration to send a request. All outgoing requests can be found by going to Dashboard, navigating to Collaboration, and then selecting Requests to view it.

### Collaborator Requests (accepting)
Under Collaboration, select Invites. A list of invites will be shown, which can be accepted or rejected.

### Profile
Under the button featuring your username, a dropdown should appear. Profile will allow you to view your profile, and Settings will direct you to a page to set your details. In settings, you can also delete your account if needed.
