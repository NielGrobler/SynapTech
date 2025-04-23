const express = require('express');
const router = express.Router();

//this is where bussiness logic is going to be defined

const arrayContainingThePublishedResearchProposals=[]

router.post('/', async(req,res)=>{
    //window.location.href = "pageToGoToWhenUploadingResearchDetails.html";
    //destructuring from reqest body
    const { ProjectName, ProjectDetails, ProjectDocs} = req.body;
    try {
        arrayContainingThePublishedResearchProposals.push({
            Project_Name:ProjectName,
            Project_Details:ProjectDetails,
            Project_Docs:ProjectDocs
        })
        res.status(201).json({ message: 'Research proposal submited successfully' });
        
    } catch (error) {
        res.status(500).json({ error: error});
    }

})
module.exports = router;