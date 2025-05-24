import Joi from 'joi';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import { fileURLToPath } from 'url';

import { getDirname } from './../dirname.js';

import { QuerySender, FileStorageClient } from './connectionInterfaces.js';
import { DatabaseQueryBuilder } from './query.js';

dotenv.config();

// For convenience, as these don't exist in ES modules.
let __dirname;
try {
	const __filename = fileURLToPath(import.meta.url);
	__dirname = path.dirname(__filename);
} catch (err) {
<<<<<<< Updated upstream
	try {
		__dirname = getDirname(import.meta);
	} catch (e) {
		__dirname = '/'; // fallback for test/browser envs
	}
=======
	__dirname = '/'; // fallback for test/browser envs
>>>>>>> Stashed changes
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
				AND Collaborator.role = 'Researcher')
				OR (Project.created_by_account_id = {{account_id}});
		`)
		.build()
	);

	return result.recordSet.length > 0;
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

	console.log(isAccept);
	console.log(result);

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
const fetchAssociatedProjectsByLatest = async (user) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', user.id)
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

const fetchPublicAssociatedProjects = async (user) => {
	const result = await new DatabaseQueryBuilder()
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
			WHERE Project.created_by_account_id = {{id}} AND Project.isPublic = 1
			OR (Collaborator.account_id = {{id}} AND Collaborator.is_pending = 0);
		`)
		.getResultUsing(agent);

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
				UPDATE [dbo].[Account]
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
	const messageResult = await storeMessage(userId, projectId, text);
	const uploadResult = await fileClient.uploadFile(attachment.buffer, attachment.name);
	const uuid = uploadResult.uuid;
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
				Account.acount_id AS id,
				Account.name AS name,
				Account.bio AS bio,
				Account.university AS university,
				Account.department AS department,
				Account.is_suspended AS is_suspended
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
			SET Account.name = @username, 
			Account.bio = {{bio}}, 
			Account.university = {{university}}, 
			Account.department= {{department}}
			WHERE Account.account_id = {{id}}
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

// Add this function to your db.js file
const getFundingReportData = async (projectIds) => {
	try {
		// Start with a simple version to test
		console.log("Getting funding data for projects:", projectIds);

		// For initial testing, return mock data
		return {
			totalFunding: 100000,
			amountUsed: 50000,
			amountLeft: 50000,
			usageCategories: [
				{ category: "Research", amount: 30000 },
				{ category: "Equipment", amount: 20000 }
			],
			grants: [
				{ organization: "Sample Grant", amount: 100000 }
			],
			projectFunding: projectIds.map(id => ({
				id: id,
				name: "Project " + id,
				allocated: 100000,
				used: 50000
			})),
			reportDate: new Date()
		};
	} catch (err) {
		console.error("Database error in getFundingReportData:", err);
		throw err;
	}
};

<<<<<<< Updated upstream
=======
export const fetchUserProjectsWithResources = async (userId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('userId', userId)
		.query(`
      SELECT 
        Project.project_id AS id, 
        Project.name,
        0 AS used_resources, 
        100 AS available_resources
      FROM 
        Project
      WHERE 
        Project.created_by_account_id = {{userId}} OR 
        Project.project_id IN (
          SELECT project_id 
          FROM Collaborator 
          WHERE account_id = {{userId}} AND is_pending = 0
        )
    `)
		.build()
	);

	return result.recordSet;
};

export const fetchUserProjectsWithCompletionStatus = async (userId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('userId', userId)
		.query(`
      SELECT 
        Project.project_id AS id, 
        Project.name,
        'In Progress' AS status,
        50 AS completion_percentage
      FROM 
        Project
      WHERE 
        Project.created_by_account_id = {{userId}} OR 
        Project.project_id IN (
          SELECT project_id 
          FROM Collaborator 
          WHERE account_id = {{userId}} AND is_pending = 0
        )
    `)
		.build()
	);

	return result.recordSet;
};

export const generateCustomReport = async (options) => {
	const { userId, metrics, projectIds, timeframe, groupBy } = options;

	// Build a dynamic query based on requested metrics
	let selectClauses = ['Project.project_id AS id', 'Project.name'];
	let joinClauses = [];
	let whereClauses = [`(Project.created_by_account_id = {{userId}} OR Project.project_id IN (SELECT project_id FROM Collaborator WHERE account_id = {{userId}} AND is_pending = 0))`];
	let params = { userId };

	// For custom reports, we'll add computed columns since they don't exist in the database
	if (metrics.includes('completion')) {
		selectClauses.push('50 AS completion_percentage');
	}

	if (metrics.includes('resources')) {
		selectClauses.push('0 AS used_resources');
		selectClauses.push('100 AS available_resources');
	}

	if (metrics.includes('collaborators')) {
		selectClauses.push('(SELECT COUNT(*) FROM Collaborator WHERE Collaborator.project_id = Project.project_id AND Collaborator.is_pending = 0) AS collaborator_count');
	}

	if (metrics.includes('reviews')) {
		selectClauses.push('(SELECT COUNT(*) FROM Review WHERE Review.project_id = Project.project_id) AS review_count');
		selectClauses.push('(SELECT AVG(rating) FROM Review WHERE Review.project_id = Project.project_id) AS average_rating');
	}

	if (metrics.includes('uploads')) {
		selectClauses.push('(SELECT COUNT(*) FROM ProjectFile WHERE ProjectFile.project_id = Project.project_id) AS file_count');
	}

	// Add project filter if specified
	if (projectIds && projectIds.length > 0) {
		let placeholders = [];
		projectIds.forEach((id, index) => {
			const paramName = `projectId${index}`;
			placeholders.push(`{{${paramName}}}`);
			params[paramName] = id;
		});
		whereClauses.push(`Project.project_id IN (${placeholders.join(',')})`);
	}

	// Add timeframe filter if specified
	if (timeframe && timeframe !== 'all') {
		let timeConstraint;

		switch (timeframe) {
			case 'week':
				timeConstraint = "DATE_SUB(NOW(), INTERVAL 1 WEEK)";
				break;
			case 'month':
				timeConstraint = "DATE_SUB(NOW(), INTERVAL 1 MONTH)";
				break;
			case 'quarter':
				timeConstraint = "DATE_SUB(NOW(), INTERVAL 3 MONTH)";
				break;
			case 'year':
				timeConstraint = "DATE_SUB(NOW(), INTERVAL 1 YEAR)";
				break;
			default:
				timeConstraint = null;
		}

		if (timeConstraint) {
			whereClauses.push(`Project.created_at >= ${timeConstraint}`);
		}
	}

	// Build the complete query
	const queryString = `
    SELECT ${selectClauses.join(', ')}
    FROM Project
    ${joinClauses.join(' ')}
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY Project.project_id, Project.name
    ${groupBy === 'creation_date' ? 'ORDER BY Project.created_at' : 'ORDER BY Project.name'}
  `;

	// Build the query using DatabaseQueryBuilder
	let queryBuilder = new DatabaseQueryBuilder().query(queryString);

	// Add all parameters
	for (const [key, value] of Object.entries(params)) {
		queryBuilder = queryBuilder.input(key, value);
	}

	// Execute the query
	const result = await sender.getResult(queryBuilder.build());

	// Process and format the results based on groupBy
	if (groupBy === 'creation_date') {
		// Group by month/year of creation
		const groupedResults = {};
		result.recordSet.forEach(row => {
			const date = new Date(row.created_at || new Date());
			const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;

			if (!groupedResults[monthYear]) {
				groupedResults[monthYear] = [];
			}
			groupedResults[monthYear].push(row);
		});

		return {
			groupBy: 'creation_date',
			data: groupedResults
		};
	}

	// Default grouping by project
	return {
		groupBy: 'project',
		data: result.recordSet
	};
};

const getMilestones = async (id) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT * 
			FROM ProjectMilestone
			WHERE project_id = {{id}};
		`)
		.build()
	);

	const milestones = result.recordSet

	if (!milestones) {
		return null;
	}

	console.log(milestones);
	return milestones;
};

const getMilestone = async (id) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT * 
			FROM ProjectMilestone
			WHERE project_milestone_id = {{id}};
		`)
		.build()
	);

	const milestone = result.recordSet

	if (!milestone) {
		return null;
	}

	return milestone;
};

const addMilestone = async (project_id, milestoneName, description) => {
	console.log(milestoneName);
	await sender.send(new DatabaseQueryBuilder()
		.input('project_id', project_id)
		.input('name', milestoneName)
		.input('description', description)
		.query(`
			INSERT INTO ProjectMilestone(project_id, name, description)
			VALUES({{project_id}}, {{name}}, {{description}});
		`)
		.build()
	);
};

const editMilestone = async (milestoneId, milestoneName, description) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('milestone_id', milestoneId)
		.input('name', milestoneName)
		.input('description', description)
		.query(`
			UPDATE ProjectMilestone
			SET name = {{name}}, description = {{description}}
			WHERE project_milestone_id = {{milestone_id}};
		`)
		.build()
	);
};

const completeMilestone = async (id) => {
	const date = new Date();
	await sender.send(new DatabaseQueryBuilder()
		.input('id', id)
		.input('date', date)
		.query(`
			UPDATE ProjectMilestone
			SET completed_at = {{date}}
			WHERE project_milestone_id = {{id}};
		`)
		.build()
	);
};

const uncompleteMilestone = async (id) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			UPDATE ProjectMilestone
			SET completed_at = NULL
			WHERE project_milestone_id = {{id}};
		`)
		.build()
	);
};

const deleteMilestone = async (id) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			DELETE FROM ProjectMilestone
			WHERE project_milestone_id = {{id}};
		`)
		.build()
	);
};

const addFunding = async (project_id, currency, funding_type, total_funding) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('project_id', project_id)
		.input('currency', currency)
		.input('type', funding_type)
		.input('total', total_funding)
		.query(`
			INSERT INTO Funding(project_id, currency_code, funding_type, total_funding)
			VALUES({{project_id}}, {{currency}}, {{type}}, {{total}});
		`)
		.build()
	);
};

const addExpenditure = async (project_id, currency, funding_type, total_funding) => {
	await sender.send(new DatabaseQueryBuilder()
		.input('funding_id', project_id)
		.input('amount', currency)
		.input('description', funding_type)
		.query(`
			INSERT INTO FundingExpenditure(funding_id, name, amount)
			VALUES({{project_id}}, {{description}}, {{amount}});
		`)
		.build()
	);
};

const getFunding = async (projectId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', projectId)
		.query(`
			SELECT * 
			FROM Funding
			WHERE funding_id = {{id}};
		`)
		.build()
	);

	const funding = result.recordSet

	if (!funding) {
		return null;
	}

	return funding;
};

const getExpenditure = async (fundingId) => {
	const result = await sender.getResult(new DatabaseQueryBuilder()
		.input('id', fundingId)
		.query(`
			SELECT * 
			FROM FundingExpenditure
			WHERE funding_id = {{id}};
		`)
		.build()
	);

	const spending = result.recordSet

	if (!spending) {
		return null;
	}

	return spending;
};

async function getCompletionStatusData(projectIds) {
	try {
		if (!projectIds || projectIds.length === 0) {
			return {
				totalContributors: 0,
				avgDaysToComplete: 0,
				projectProgress: 0,
				contributorsTrend: [],
				progressComparison: [],
				milestones: []
			};
		}

		const contributorsResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('projectIds', projectIds.join(','))
			.query(`
                SELECT COUNT(DISTINCT account_id) as total_contributors
                FROM Collaborator
                WHERE project_id IN ({{projectIds}})
                AND is_active = 1
            `)
			.build()
		);
		const totalContributors = contributorsResult.recordSet[0]?.total_contributors || 0;

		const milestonesResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('projectIds', projectIds.join(','))
			.query(`
                SELECT 
                    p.name as project_name,
                    COUNT(pm.project_milestone_id) as total_milestones,
                    SUM(CASE WHEN pm.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completed_milestones,
                    AVG(CASE WHEN pm.completed_at IS NOT NULL 
                        THEN DATEDIFF(pm.completed_at, pm.created_at) 
                        ELSE NULL END) as avg_days_to_complete
                FROM Project p
                LEFT JOIN ProjectMilestone pm ON p.project_id = pm.project_id
                WHERE p.project_id IN ({{projectIds}})
                GROUP BY p.project_id
            `)
			.build()
		);

		let totalMilestones = 0;
		let completedMilestones = 0;
		let totalDaysToComplete = 0;
		let milestonesWithCompletionTime = 0;

		milestonesResult.recordSet.forEach(project => {
			totalMilestones += project.total_milestones || 0;
			completedMilestones += project.completed_milestones || 0;

			if (project.avg_days_to_complete) {
				totalDaysToComplete += project.avg_days_to_complete * (project.completed_milestones || 0);
				milestonesWithCompletionTime += project.completed_milestones || 0;
			}
		});

		const projectProgress = totalMilestones > 0
			? Math.round((completedMilestones / totalMilestones) * 100)
			: 0;

		const avgDaysToComplete = milestonesWithCompletionTime > 0
			? parseFloat((totalDaysToComplete / milestonesWithCompletionTime).toFixed(1))
			: 0;

		const contributorsTrendResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('projectIds', projectIds.join(','))
			.query(`
                SELECT 
                    p.name as project_name,
                    COUNT(c.account_id) as contributor_count
                FROM Project p
                JOIN Collaborator c ON p.project_id = c.project_id
                WHERE p.project_id IN ({{projectIds}})
                AND c.is_active = 1
                GROUP BY p.project_id
            `)
			.build()
		);

		const milestonesTimelineResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('projectIds', projectIds.join(','))
			.query(`
                SELECT 
                    p.name as project_name,
                    pm.name as milestone_name,
                    pm.description,
                    pm.created_at,
                    pm.completed_at
                FROM Project p
                JOIN ProjectMilestone pm ON p.project_id = pm.project_id
                WHERE p.project_id IN ({{projectIds}})
                ORDER BY pm.created_at
            `)
			.build()
		);

		const progressComparison = milestonesResult.recordSet.map(project => ({
			projectName: project.project_name,
			progress: project.total_milestones > 0
				? Math.round((project.completed_milestones / project.total_milestones) * 100)
				: 0
		}));

		return {
			totalContributors,
			avgDaysToComplete,
			projectProgress,
			contributorsTrend: contributorsTrendResult.recordSet,
			progressComparison,
			milestones: milestonesTimelineResult.recordSet
		};

	} catch (error) {
		console.error('Error in getCompletionStatusData:', error);
		throw error;
	}
}

async function getUserActivityReportData(userId, startDate = null, endDate = null) {
	try {
		let dateCondition = '';
		if (startDate && endDate) {
			dateCondition = ` AND pa.created_at BETWEEN '${startDate}' AND '${endDate}'`;
		} else if (startDate) {
			dateCondition = ` AND pa.created_at >= '${startDate}'`;
		} else if (endDate) {
			dateCondition = ` AND pa.created_at <= '${endDate}'`;
		}
		const userResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT 
                    account_id,
                    name,
                    created_at,
                    university,
                    department,
                    bio
                FROM Account
                WHERE account_id = {{userId}}
            `)
			.build()
		);

		const userInfo = userResult.recordSet[0] || {};
		const createdProjectsResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT 
                    project_id,
                    name,
                    description,
                    created_at,
                    is_public
                FROM Project
                WHERE created_by_account_id = {{userId}}
                ${startDate ? `AND created_at >= '${startDate}'` : ''}
                ${endDate ? `AND created_at <= '${endDate}'` : ''}
                ORDER BY created_at DESC
            `)
			.build()
		);
		const collaborativeProjectsResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT 
                    p.project_id,
                    p.name,
                    p.description,
                    p.created_at,
                    p.is_public,
                    c.role
                FROM Project p
                JOIN Collaborator c ON p.project_id = c.project_id
                WHERE c.account_id = {{userId}} AND c.is_pending = 0
                ${startDate ? `AND p.created_at >= '${startDate}'` : ''}
                ${endDate ? `AND p.created_at <= '${endDate}'` : ''}
                ORDER BY p.created_at DESC
            `)
			.build()
		);
		const fileContributionsResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT 
                    pf.file_uuid,
                    pf.original_filename,
                    pa.created_at,
                    pf.project_id,
                    p.name AS project_name
                FROM ProjectFile pf
                JOIN ProjectAttachment pa ON pf.file_uuid = pa.file_uuid
                JOIN Project p ON pf.project_id = p.project_id
                WHERE (p.created_by_account_id = {{userId}} 
                       OR p.project_id IN (
                           SELECT project_id 
                           FROM Collaborator 
                           WHERE account_id = {{userId}} AND is_pending = 0
                       ))
                ${dateCondition}
                ORDER BY pa.created_at DESC
            `)
			.build()
		);
		const contributionTimelineResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT 
                    FORMAT(pa.created_at, 'yyyy-MM') AS month,
                    COUNT(*) AS count
                FROM ProjectAttachment pa
                JOIN ProjectFile pf ON pa.file_uuid = pf.file_uuid
                JOIN Project p ON pf.project_id = p.project_id
                WHERE (p.created_by_account_id = {{userId}} 
                       OR p.project_id IN (
                           SELECT project_id 
                           FROM Collaborator 
                           WHERE account_id = {{userId}} AND is_pending = 0
                       ))
                ${dateCondition}
                GROUP BY FORMAT(pa.created_at, 'yyyy-MM')
                ORDER BY month
            `)
			.build()
		);
		const projectCount = createdProjectsResult.recordSet.length;
		const collaborationCount = collaborativeProjectsResult.recordSet.length;
		const fileContributionsCount = fileContributionsResult.recordSet.length;
		const ratingResult = await sender.getResult(new DatabaseQueryBuilder()
			.input('userId', userId)
			.query(`
                SELECT AVG(rating) AS avgRating
                FROM Review
                WHERE reviewer_id = {{userId}}
            `)
			.build()
		);
		const avgRating = ratingResult.recordSet[0]?.avgRating || 0;
		return {
			userInfo,
			dateRange: {
				startDate,
				endDate
			},
			activitySummary: {
				projectCount,
				collaborationCount,
				fileContributionsCount,
				avgRating
			},
			projectsCreated: createdProjectsResult.recordSet || [],
			projectsCollaborated: collaborativeProjectsResult.recordSet || [],
			fileContributions: fileContributionsResult.recordSet || [],
			contributionTimeline: contributionTimelineResult.recordSet || []
		};

	} catch (error) {
		console.error('Error in getUserActivityReportData:', error);
		throw error;
	}
}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
	getFundingReportData
=======
	getFundingReportData,
	fetchUserProjectsWithResources,
	fetchUserProjectsWithCompletionStatus,
	generateCustomReport,
	addMilestone,
	editMilestone,
	completeMilestone,
	uncompleteMilestone,
	deleteMilestone,
	getMilestones,
	getMilestone,
	addFunding,
	addExpenditure,
	getExpenditure,
	getFunding,
	getCompletionStatusData,
	getUserActivityReportData
>>>>>>> Stashed changes
};
