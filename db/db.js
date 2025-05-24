import Joi from 'joi';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

import { getDirname } from './../dirname.js';

import { QuerySender, FileStorageClient } from './connectionInterfaces.js';
import { DatabaseQueryBuilder } from './query.js';
import { ValidationError } from '../errors.js';

dotenv.config();

// For convenience, as these don't exist in ES modules.
let __dirname;
try {
	const __filename = fileURLToPath(import.meta.url);
	__dirname = path.dirname(__filename);
} catch (err) {
	try {
		__dirname = getDirname(import.meta);
	} catch (e) {
		__dirname = '/'; // fallback for test/browser envs
	}
}

const ca = fs.readFileSync(path.join(__dirname, 'server.crt'));

const sender = new QuerySender();
const fileClient = new FileStorageClient();

const getUserByGUID = async (guid) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('guid', guid)
		.query(`
			SELECT
				A.account_id AS id,
				A.name,
				A.bio,
				L.uuid,
				L.source
			FROM Account A
			INNER JOIN AccountLink L ON L.account_id = A.account_id
			WHERE L.source = 'Google' AND uuid = {{guid}};
		`)
		.build()
	);

	return result.recordSet[0];
};

const createUser = async (user) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('name', user.name)
		.input('is_admin', false)
		.input('department', null)
		.input('bio', null)
		.input('university', null)
		.query(`
			INSERT INTO Account (name, is_admin, university, department, bio)
			VALUES ({{name}}, {{is_admin}}, {{university}}, {{department}}, {{bio}});
		`)
		.build()
	);

	const id = result.insertId;

	await sender.send(new DatabaseQueryBuilder()
		.input('id', id)
		.input('uuid', user.id)
		.input('source', user.source)
		.query(`
			INSERT INTO AccountLink (uuid, source, account_id)
			VALUES ({{uuid}}, {{source}}, {{id}});
		`)
		.build()
	);
};

const uploadToProject = async (projectId, fileBuffer, filename) => {
	const response = await fileClient.uploadFile(fileBuffer, filename);
	const uuid = response.uuid;

	await sender.send(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.input("filename", filename)
		.input("uuid", uuid)
		.query(`
				INSERT INTO ProjectFile (file_uuid, original_filename, project_id)
				VALUES({{uuid}}, {{filename}}, {{project_id}})
			`)
		.build()
	);
}

const mayUploadToProject = async (projectId, accountId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.input("account_id", accountId)
		.query(`
			SELECT 	Project.project_id,
				Collaborator.account_id,	
				Project.created_by_account_id
			FROM Collaborator
			RIGHT JOIN Project
				ON Collaborator.project_id = Project.project_id
			WHERE (Project.project_id = {{project_id}} AND Collaborator.account_id = {{account_id}} 
				AND Collaborator.role = 'Researcher'
				AND Collaborator.is_pending = 0
			)
				OR (Project.created_by_account_id = {{account_id}});
		`)
		.build()
	);

	return result.recordSet.length > 0;
}

const mayRequestProjectFunding = async (projectId, accountId) => {
	// same conditions
	return await mayUploadToProject(projectId, accountId);
}

const getProjectFiles = async (projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.query(`
			SELECT * 
			FROM ProjectFile
			WHERE project_id = {{project_id}};
		`)
		.build()
	);

	return result.recordSet;
}

const mayAccessProject = async (projectId, accountId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.input("account_id", accountId)
		.query(`
			SELECT 	Project.project_id,
				Collaborator.account_id,	
				Project.created_by_account_id
			FROM Collaborator
			RIGHT JOIN Project
				ON Collaborator.project_id = Project.project_id
			WHERE (Project.project_id = {{project_id}} AND Collaborator.account_id = {{account_id}}) 
				OR (Project.created_by_account_id = {{account_id}});
		`)
		.build()
	);

	return result.recordSet.length > 0;
};

const getPendingCollabInvites = async (accountId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.query(`
			SELECT DISTINCT Account.account_id,
				Project.project_id,
				role,
				Project.name AS project_name,
				Account.name AS account_name
			FROM CollaborationInvite
			INNER JOIN Project
			ON Project.project_id = CollaborationInvite.project_id
			INNER JOIN Account
			ON Account.account_id = CollaborationInvite.account_id
			WHERE CollaborationInvite.account_id = {{account_id}};
		`)
		.build()
	);

	return result.recordSet;
}

const sendCollabInvite = async (accountId, projectId, role) => {
	await sender.send(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.input("project_id", projectId)
		.input("role", role)
		.query(`
			INSERT INTO CollaborationInvite (account_id, project_id, role)
			VALUES({{account_id}}, {{project_id}}, {{role}});
		`)
		.build()
	);
};

const canInvite = async (accountId, projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.input("project_id", projectId)
		.query(`
			SELECT *
			FROM Collaborator
			RIGHT JOIN Project
			ON Collaborator.project_id = Project.project_id
			WHERE (Collaborator.account_id = {{account_id}} AND Collaborator.project_id = {{project_id}})
				OR (Project.project_id = {{project_id}} AND Project.created_by_account_id = {{account_id}});
		`)
		.build()
	);

	return result.recordSet.length === 0;
}

const alreadyInvited = async (accountId, projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.input("project_id", projectId)
		.query(`
			SELECT *
			FROM CollaborationInvite
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.build()
	);

	return result.recordSet.length === 0;
}

const replyToCollabInvite = async (isAccept, accountId, projectId, role) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.input("project_id", projectId)
		.query(`
			DELETE FROM CollaborationInvite 
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.build()
	);


	if (isNaN(result.rowsAffected) || result.rowsAffected == 0) {
		throw new Error("cannot reject a nonexistent invite");
	}

	if (!isAccept) {
		return;
	}

	await sender.send(new DatabaseQueryBuilder()
		.input("account_id", accountId)
		.input("project_id", projectId)
		.input("role", role)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES ({{account_id}}, {{project_id}}, {{role}}, 1, 0);
		`)
		.build()
	);
};

const projectSchema = Joi.object({
	name: Joi.string().trim().min(3).max(255).regex(/^[A-Za-z\s]+$/).required(),
	description: Joi.string().min(3).max(255).regex(/^[A-Za-z0-9\s,.'"!;?-]+$/).required(),
	field: Joi.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).required(),
	isPublic: Joi.boolean().required()
});

// Project names are unique up to user id
const checkProjectNameUniqueness = async (project, user) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('name', project.name)
		.input('created_by_account_id', user.id)
		.query(`
			SELECT *
			FROM Project
			WHERE Project.name = {{name}} AND Project.created_by_account_id = {{created_by_account_id}};
		`)
		.build()
	);

	return result.recordSet.length === 0;
}

const createProject = async (project, user) => {
	const { _, error } = projectSchema.validate(project);
	if (error) {
		throw new Error(error.message);
	}

	const isUnique = await checkProjectNameUniqueness(project, user);
	if (!isUnique) {
		throw new Error(`Project with name ${project.name} already exists.`);
	}

	await sender.send(new DatabaseQueryBuilder()
		.input('name', project.name)
		.input('description', project.description)
		.input('is_public', project.isPublic)
		.input('created_by_account_id', user.id)
		.query(`
			INSERT INTO Project(name, description, is_public, created_by_account_id)
			VALUES({{name}}, {{description}}, {{is_public}}, {{created_by_account_id}});
		`)
		.build()
	);
};

const fetchAssociatedProjects = async (user) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', user.id)
		.query(`
			SELECT DISTINCT 
			    Project.project_id AS id,
			    Project.created_by_account_id AS author_id,
			    Project.created_at AS created_at,
			    Project.name AS name,
			    Project.description AS description,
			    Project.is_public AS is_public
			FROM Project
			LEFT JOIN Collaborator ON Collaborator.project_id = Project.project_id
			LEFT JOIN Account ON Account.account_id = Collaborator.account_id
			WHERE Project.created_by_account_id = {{id}}
			OR (Collaborator.account_id = {{id}} AND Collaborator.is_pending = 0);
		`)
		.build()
	);

	return result.recordSet;
};

// Like fetchAssociatedProjects, except returning less information and orders projects based on the latest message
const fetchAssociatedProjectsByLatest = async (userId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			SELECT 
			    Project.project_id AS id,
			    Project.name AS name,
			    MAX(Message.created_at) AS latest_message_date
			FROM Project
			LEFT JOIN Collaborator ON Collaborator.project_id = Project.project_id
			LEFT JOIN Account ON Account.account_id = Collaborator.account_id
			LEFT JOIN Message ON Message.project_id = Project.project_id
			WHERE Project.created_by_account_id = {{id}}
			   OR (Collaborator.account_id = {{id}} AND Collaborator.is_pending = 0)
			GROUP BY Project.project_id, Project.name
			ORDER BY latest_message_date DESC;
		`)
		.build()
	);

	return result.recordSet;
};

const fetchPublicAssociatedProjects = async (userId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			SELECT DISTINCT 
			    Project.project_id AS id,
			    Project.created_by_account_id AS author_id,
			    Project.created_at AS created_at,
			    Project.name AS name,
			    Project.description AS description,
			    Project.is_public AS is_public
			FROM Project
			LEFT JOIN Collaborator ON Collaborator.project_id = Project.project_id
			WHERE (Project.created_by_account_id = {{id}} AND Project.is_public = 1)
			OR (Collaborator.account_id = {{id}} AND Collaborator.is_pending = 0);
		`)
		.build()
	);

	return result.recordSet;
};


const appendCollaborators = async (projects) => {
	for (let project of projects) {
		const result = await sender.getResult(new DatabaseQueryBuilder()
			.input('project_id', project.id)
			.query(`
				SELECT DISTINCT
					Account.account_id AS account_id,
					Collaborator.is_active AS is_active,
					Account.name AS name,
					Collaborator.role AS role
				FROM Collaborator
				INNER JOIN Account ON Account.account_id = Collaborator.account_id
				WHERE Collaborator.project_id = {{project_id}} AND Collaborator.is_pending = 0;
			`)
			.build()
		);
		project.collaborators = result.recordSet;
	}
};

const deleteUser = async (userId) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			DELETE FROM AccountLink WHERE AccountLink.account_id = {{id}};
			DELETE FROM Project WHERE Project.created_by_account_id = {{id}};
			DELETE FROM Collaborator WHERE Collaborator.account_id = {{id}};
			DELETE FROM Account WHERE Account.account_id = {{id}};
		`)
		.build()
	);
};

const isSuspended = async (userId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			SELECT is_suspended
			FROM Account
			WHERE account_id = {{id}};
		`)
		.build()
	);

	return result.recordSet;
};

const suspendUser = async (userId) => {
	const result = await isSuspended(userId);
	const negation = result[0].is_suspended == 0 ? 1 : 0;
	sender.send(new DatabaseQueryBuilder()
		.input('id', userId)
		.input('negation', negation)
		.query(`
				UPDATE Account
				SET is_suspended = {{negation}}
				WHERE account_id = {{id}};
		`)
		.build()
	);
};

const addCollaborator = async (projectId, userId, role) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('account_id', userId)
		.input('role', role)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES({{account_id}}, {{project_id}}, {{role}}, 1, 1);
		`)
		.build()
	);
};

const permittedToAcceptCollaborator = async (user, collabUserId, projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('account_id', user.id)
		.query(`
			SELECT project_id
			FROM Project
			WHERE Project.project_id = {{project_id}} AND Project.created_by_account_id = {{account_id}};
		`)
		.build()
	);

	return result.recordSet.length > 0;
}


const permittedToRejectCollaborator = async (user, collabUserId, projectId) => {
	if (collabUserId === user.id) {
		return true;
	}

	const permittedAccept = await permittedToAcceptCollaborator(user, collabUserId, projectId);
	return permittedAccept;
}

const removeCollaborator = async (userId, projectId) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			DELETE
			FROM Collaborator
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.build()
	);
}

const acceptCollaborator = async (userId, projectId) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			UPDATE Collaborator
			SET is_pending = 0 
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.build()
	);
};

const searchProjects = async (projectName) => {
	const lowerName = projectName.toLowerCase();
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('projectName', `%${lowerName}%`)
		.query(`
			SELECT *
			FROM Project
			WHERE LOWER(Project.name) LIKE {{projectName}} AND Project.is_public = 1
			ORDER BY CHAR_LENGTH(Project.name)
			LIMIT 10;
		`)
		.build()
	);

	return result.recordSet;
};

const fetchCollaborators = async (projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.query(`
			SELECT DISTINCT
			    Account.account_id AS account_id,
			    Collaborator.is_active AS is_active,
			    Account.name AS name,
			    Collaborator.role AS role
			FROM Collaborator
			INNER JOIN Account ON Account.account_id = Collaborator.account_id
			WHERE Collaborator.project_id = {{project_id}} AND Collaborator.is_pending = 0;
		`)
		.build()
	);

	return result.recordSet;
}

const fetchPendingCollaborators = async (user) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', user.id)
		.query(`
			SELECT DISTINCT
				Collaborator.account_id AS account_id,
				Collaborator.project_id AS project_id,
				Account.name AS account_name,
				Project.name AS project_name,
				Project.is_public AS project_is_public,
				Collaborator.role AS role
			FROM Collaborator
			INNER JOIN Project
			ON Project.project_id = Collaborator.project_id
			INNER JOIN Account
			ON Collaborator.account_id = Account.account_id
			WHERE Project.created_by_account_id = {{id}} AND Collaborator.is_pending = 1;
		`)
		.build()
	);

	return result.recordSet;
}

const insertPendingCollaborator = async (userId, projectId) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES({{account_id}}, {{project_id}}, 'Researcher', 1, 1);
		`)
		.build()
	);
}

const fetchProjectById = async (id) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	DISTINCT
				Project.project_id AS id,
				Project.name AS name,
				Project.created_by_account_id AS created_by_account_id,
				Account.name AS author_name,
				Project.created_at AS created_at,
				Project.description AS description,
				Project.is_public AS is_public
			FROM Project
			INNER JOIN Account
			ON Project.created_by_account_id = Account.account_id
			WHERE Project.project_id = {{id}}
			LIMIT 1;
		`)
		.build()
	);

	let project = result.recordSet[0];

	if (!project) {
		return null;
	}

	project.collaborators = await fetchCollaborators(id);

	return project;
}

// ======================================= */
/* == Here is new message stuff == */

const retrieveLatestMessages = async (projectId, limit = 64) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('limit', limit)
		.query(`
			SELECT	Message.account_id AS id,
				Account.name AS user,
				content AS text,
				file_uuid AS uuid,
				original_filename AS name
			FROM Message
			LEFT JOIN MessageAttachment
			ON MessageAttachment.message_id = Message.message_id
			INNER JOIN Account
			ON Message.account_id = Account.account_id
			WHERE Message.project_id = {{project_id}}
			ORDER BY Message.created_at
			LIMIT {{limit}};
		`)
		.build()
	);

	return result;
}

const storeMessageWithAttachment = async (userId, projectId, text, attachment) => {
	// try upload first
	const uploadResult = await fileClient.uploadFile(attachment.buffer, attachment.name);
	const uuid = uploadResult.uuid;
	const messageResult = await storeMessage(userId, projectId, text);
	const messageId = messageResult.insertId;

	await sender.send(new DatabaseQueryBuilder()
		.input("message_id", messageId)
		.input("file_uuid", uuid)
		.input("original_filename", attachment.name)
		.query(`
			INSERT INTO MessageAttachment (message_id, file_uuid, original_filename)
			VALUES({{message_id}}, {{file_uuid}}, {{original_filename}});
		`)
		.build()
	);

	return {
		uuid: uuid,
		name: attachment.name,
		text: text,
	};
}

const storeMessage = async (userId, projectId, text) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("user_id", userId)
		.input("project_id", projectId)
		.input("content", text)
		.query(`
			INSERT INTO Message (project_id, account_id, content)
			VALUES({{project_id}}, {{user_id}}, {{content}});
		`)
		.build()
	);

	return result;
}

const downloadFile = async (uuid, ext) => {
	return await fileClient.downloadFile(uuid, ext);
}

// Returns role of the user in the project, or null if the user is not part of the project
const getRoleInProject = async (userId, projectId) => {
	const ownerQuery = await sender.getResult(new DatabaseQueryBuilder()
		.input("user_id", userId)
		.input("project_id", projectId)
		.query(`
			SELECT project_id
			FROM Project
			WHERE project_id = {{project_id}} AND created_by_account_id = {{user_id}};
		`)
		.build()
	);

	const isOwner = ownerQuery.recordSet.length > 0;
	if (isOwner) {
		return "Owner";
	}

	const collaboratorQuery = await sender.getResult(new DatabaseQueryBuilder()
		.input("user_id", userId)
		.input("project_id", projectId)
		.query(`
			SELECT role
			FROM Collaborator
			WHERE project_id = {{project_id}} AND account_id = {{user_id}};
		`)
		.build()
	);

	const isCollaborator = collaboratorQuery.recordSet.length > 0;
	if (!isCollaborator) {
		return null;
	}

	return collaboratorQuery.recordSet[0].role;
}

/* functions for user/reviews, was being removed in merge for chat functions but leaving it here */
const searchUsers = async (userName) => {
	const lowerName = userName.toLowerCase();
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('userName', `%${lowerName}%`)
		.query(`
			SELECT DISTINCT *
			FROM Account
			WHERE LOWER(Account.name) LIKE {{userName}} AND Account.is_suspended = 0
			ORDER BY CHAR_LENGTH(Account.name)
			LIMIT 25;
		`)
		.build()
	);

	return result.recordSet;
};

const fetchUserById = async (id) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	DISTINCT
				Account.account_id AS id,
				Account.name AS name,
				Account.bio AS bio,
				Account.university AS university,
				Account.department AS department,
				Account.is_suspended AS is_suspended
			FROM Account
			WHERE Account.account_id = {{id}}
			LIMIT 1;
		`)
		.build()
	);

	let user = result.recordSet[0];

	if (!user) {
		return null;
	}

	return user;
}

const updateProfile = async (params) => {
	const { id, username, bio, university, department } = params;

	await sender.send(new DatabaseQueryBuilder()
		.input('username', username)
		.input('id', id)
		.input('bio', bio)
		.input('university', university)
		.input('department', department)
		.query(`
			UPDATE Account
			SET Account.name = {{username}}, 
			Account.bio = {{bio}}, 
			Account.university = {{university}}, 
			Account.department= {{department}}
			WHERE Account.account_id = {{id}};
		`)
		.build()
	);
}

const is_Admin = async (id) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	is_admin
			FROM Account
			WHERE Account.account_id = {{id}}
			LIMIT 1;
		`)
		.build()
	);

	let user = result.recordSet[0];

	if (!user) {
		return null;
	}

	return user;
}

const getProjectReviews = async (projectId, limit = 10, offset = 0) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('limit', limit)
		.input('offset', offset)
		.query(`
			SELECT 
			Review.review_id,
			Review.project_id,
			Review.reviewer_id,
			Account.name AS reviewer_name,
			Review.rating,
			Review.comment,
			Review.created_at
			FROM Review
			INNER JOIN Account ON Review.reviewer_id = Account.account_id
			WHERE Review.project_id = {{project_id}}
			ORDER BY Review.created_at DESC
			LIMIT {{limit}} OFFSET {{offset}};
	    `)
	);

	return result.recordSet;
};

const getReviewCount = async (projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.query(`
			SELECT COUNT(*) AS total
			FROM Review
			WHERE project_id = {{project_id}};
		`)
		.build()
	);

	return result.recordSet[0].total;
};

const createReview = async (review) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('project_id', review.project_id)
		.input('reviewer_id', review.reviewer_id)
		.input('rating', review.rating)
		.input('comment', review.comment)
		.query(`
			INSERT INTO Review(project_id, reviewer_id, rating, comment)
			VALUES({{project_id}}, {{reviewer_id}}, {{rating}}, {{comment}});
		`)
		.build()
	);
};

const alreadyRequestedFunding = async (opportunityId, projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('funding_opportunity_id', opportunityId)
		.input('project_id', projectId)
		.query(`SELECT project_id FROM FundingRequest WHERE project_id = {{project_id}} AND funding_opportunity_id = {{funding_opportunity_id}};
		`)
		.build()
	);

	return result.recordSet.length === 0;
}

const insertFundingRequest = async (opportunityId, projectId) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('funding_opportunity_id', opportunityId)
		.input('project_id', projectId)
		.query(`
			INSERT INTO FundingRequest (project_id, funding_opportunity_id)
			VALUES({{project_id}}, {{funding_opportunity_id}});
		`)
		.build()
	);
};

const getFundingOpportunities = async () => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.query(`
			SELECT *
			FROM FundingOpportunity;
		`)
		.build()
	);

	return result.recordSet;
}

const getMilestones = async (projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.query(`
			SELECT *
			FROM ProjectMilestone
			WHERE project_id = {{project_id}}
			ORDER BY created_at;
		`)
		.build()
	);

	return result.recordSet;
}

const insertMilestone = async (projectId, name, description) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('name', name)
		.query(`
			SELECT project_milestone_id
			FROM ProjectMilestone
			WHERE project_id = {{project_id}} AND name = {{name}};
		`)
		.build()
	);

	if (result.recordSet.length > 0) {
		throw new ValidationError("Cannot have two milestones with the same name in one project.");
	}

	await sender.send(new DatabaseQueryBuilder()
		.input("project_id", projectId)
		.input("name", name)
		.input("desc", description)
		.query(`
			INSERT INTO ProjectMilestone (project_id, name, description)
			VALUES({{project_id}}, {{name}}, {{desc}});
		`)
		.build()
	);
}

const toggleMilestone = async (milestoneId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', milestoneId)
		.query(`
			SELECT completed_at FROM ProjectMilestone WHERE project_milestone_id = {{id}};
		`)
		.build()
	);

	if (result.recordSet.length === 0) {
		throw new ValidationError('Project milestone does not exist.');
	}

	const isCompleted = result.recordSet[0].completed_at !== null;
	const query = `
		UPDATE ProjectMilestone
		SET completed_at = ${isCompleted ? 'NULL' : 'NOW()'}
		WHERE project_milestone_id = {{id}};
	`;

	await sender.send(new DatabaseQueryBuilder()
		.input('id', milestoneId)
		.query(query)
		.build()
	);
}

export default {
	getUserByGUID,
	createUser,
	createProject,
	fetchAssociatedProjects,
	appendCollaborators,
	deleteUser,
	isSuspended,
	suspendUser,
	addCollaborator,
	acceptCollaborator,
	searchProjects,
	fetchProjectById,
	fetchPendingCollaborators,
	insertPendingCollaborator,
	searchUsers,
	fetchPublicAssociatedProjects,
	fetchUserById,
	updateProfile,
	permittedToAcceptCollaborator,
	permittedToRejectCollaborator,
	removeCollaborator,
	storeMessage,
	getRoleInProject,
	storeMessageWithAttachment,
	downloadFile,
	retrieveLatestMessages,
	fetchAssociatedProjectsByLatest,
	getProjectReviews,
	getReviewCount,
	createReview,
	is_Admin,
	getPendingCollabInvites,
	replyToCollabInvite,
	sendCollabInvite,
	canInvite,
	alreadyInvited,
	getProjectFiles,
	mayAccessProject,
	mayUploadToProject,
	uploadToProject,
	insertFundingRequest,
	getFundingOpportunities,
	mayRequestProjectFunding,
	alreadyRequestedFunding,
	getMilestones,
	insertMilestone,
	toggleMilestone
};
