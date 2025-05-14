import Joi from 'joi';
import dotenv from 'dotenv';
import { DatabaseQueryBuilder } from './query.js';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ca = fs.readFileSync(path.join(__dirname, 'server.crt'));

const agent = new https.Agent({
	//	ca: ca,
	rejectUnauthorized: false
});

console.log("Using agent to access database server");

const getUserByGUID = async (guid) => {
	console.log("== HELLO WORLD ==");
	const result = await new DatabaseQueryBuilder()
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
		.getResultUsing(agent);
	console.log(result);
	return result.recordSet[0];
};

const createUser = async (user) => {
	const result = await new DatabaseQueryBuilder()
		.input('name', user.name)
		.input('is_admin', false)
		.input('department', null)
		.input('bio', null)
		.input('university', null)
		.query(`
			INSERT INTO Account (name, is_admin, university, department, bio)
			VALUES ({{name}}, {{is_admin}}, {{university}}, {{department}}, {{bio}});
		`)
		.getResultUsing(agent);

	const id = result.insertId;
	console.log(id);

	await new DatabaseQueryBuilder()
		.input('id', id)
		.input('uuid', user.id)
		.input('source', user.source)
		.query(`
			INSERT INTO AccountLink (uuid, source, account_id)
			VALUES ({{uuid}}, {{source}}, {{id}});
		`)
		.sendUsing(agent);
};

const projectSchema = Joi.object({
	name: Joi.string().trim().min(3).max(255).regex(/^[A-Za-z\s]+$/).required(),
	description: Joi.string().min(3).max(255).regex(/^[A-Za-z0-9\s,.'"!;?-]+$/).required(),
	field: Joi.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).required(),
	isPublic: Joi.boolean().required()
});

// Project names are unique up to user id
const checkProjectNameUniqueness = async (project, user) => {
	const result = await new DatabaseQueryBuilder()
		.input('name', project.name)
		.input('created_by_account_id', user.id)
		.query(`
			SELECT *
			FROM Project
			WHERE Project.name = {{name}} AND Project.created_by_account_id = {{created_by_account_id}};
		`)
		.getResultUsing(agent);

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

	await new DatabaseQueryBuilder()
		.input('name', project.name)
		.input('description', project.description)
		.input('is_public', project.isPublic)
		.input('created_by_account_id', user.id)
		.query(`
			INSERT INTO Project(name, description, is_public, created_by_account_id)
			VALUES({{name}}, {{description}}, {{is_public}}, {{created_by_account_id}});
		`)
		.sendUsing(agent);
};

const fetchAssociatedProjects = async (user) => {
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
			WHERE Project.created_by_account_id = {{id}}
			OR (Collaborator.account_id = {{id}} AND Collaborator.is_pending = 0);
		`)
		.getResultUsing(agent);

	return result.recordSet;
};

const fetchPublicAssociatedProjects = async (id) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', id)
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
		.getResultUsing(agent);

		if (!project) {
		return null;
	}
	return result.recordSet;
};


const appendCollaborators = async (projects) => {
	for (let project of projects) {
		const result = await new DatabaseQueryBuilder()
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
			.getResultUsing(agent);
		project.collaborators = result.recordSet;
	}
};

const deleteUser = async (userId) => {
	await new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			DELETE FROM AccountLink WHERE AccountLink.account_id = {{id}};
			DELETE FROM Project WHERE Project.created_by_account_id = {{id}};
			DELETE FROM Collaborator WHERE Collaborator.account_id = {{id}};
			DELETE FROM Account WHERE Account.account_id = {{id}};
		`)
		.sendUsing(agent);
};

const isSuspended = async (userId) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			SELECT is_suspended FROM Account WHERE account_id = {{id}};
		`)
		.getResultUsing(agent);

		let isSus = result.recordSet[0].is_suspended;
	return isSus;
};

const suspendUser = async (userId) => {
	await new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			UPDATE Account
			SET is_suspended = 1
			WHERE account_id = {{id}}
		`)
		.sendUsing(agent);
		console.log("Unsuspended");
};

const unsuspendUser = async (userId) => {
	await new DatabaseQueryBuilder()
		.input('id', userId)
		.query(`
			UPDATE Account
			SET is_suspended = 0
			WHERE account_id = {{id}}
		`)
		.sendUsing(agent);
		console.log("Unsuspended");
};


const addCollaborator = async (projectId, userId, role) => {
	await new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('account_id', userId)
		.input('role', role)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES({{account_id}}, {{project_id}}, {{role}}, 1, 1);
		`)
		.sendUsing(agent);
};

const permittedToAcceptCollaborator = async (user, collabUserId, projectId) => {
	const result = await new DatabaseQueryBuilder()
		.input('project_id', projectId)
		.input('account_id', user.id)
		.query(`
			SELECT project_id
			FROM Project
			WHERE Project.project_id = {{project_id}} AND Project.created_by_account_id = {{account_id}};
		`)
		.getResultUsing(agent);

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
	await new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			DELETE
			FROM Collaborator
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.sendUsing(agent);
}

const acceptCollaborator = async (userId, projectId) => {
	await new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			UPDATE Collaborator
			SET is_pending = 0 
			WHERE account_id = {{account_id}} AND project_id = {{project_id}};
		`)
		.sendUsing(agent);
};

const searchProjects = async (projectName) => {
	const lowerName = projectName.toLowerCase();
	const result = await new DatabaseQueryBuilder()
		.input('projectName', `%${lowerName}%`)
		.query(`
			SELECT *
			FROM Project
			WHERE LOWER(Project.name) LIKE {{projectName}} AND Project.is_public = 1
			ORDER BY CHAR_LENGTH(Project.name)
			LIMIT 10;
		`)
		.getResultUsing(agent);

	return result.recordSet;
};

const fetchCollaborators = async (projectId) => {
	const result = await new DatabaseQueryBuilder()
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
		.getResultUsing(agent);

	return result.recordSet;
}

const fetchPendingCollaborators = async (user) => {
	const result = await new DatabaseQueryBuilder()
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
		.getResultUsing(agent);

	return result.recordSet;
}

const insertPendingCollaborator = async (userId, projectId) => {
	await new DatabaseQueryBuilder()
		.input('account_id', userId)
		.input('project_id', projectId)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES({{account_id}}, {{project_id}}, 'Researcher', 1, 1);
		`)
		.sendUsing(agent);
}

const fetchProjectById = async (id) => {
	const result = await new DatabaseQueryBuilder()
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
		.getResultUsing(agent);

	let project = result.recordSet[0];

	if (!project) {
		return null;
	}

	project.collaborators = await fetchCollaborators(id);

	return project;
}

const storeMessage = async (senderId, recipientId, messageBody) => {
	await new DatabaseQueryBuilder()
		.input('sender_id', senderId)
		.input('receiver_id', recipientId)
		.input('content', messageBody)
		.query(`
			INSERT INTO Message (sender_id, receiver_id, content)
			VALUES({{sender_id}}, {{receiver_id}}, {{content}});
		`)
		.sendUsing(agent);
}

const retrieveMessages = async (fstPersonId, sndPersonId) => {
	const sent = await new DatabaseQueryBuilder()
		.input('fst_id', fstPersonId)
		.input('snd_id', sndPersonId)
		.query(`
			SELECT  	Message.created_at AS created_at,
					Message.content AS you_sent
			FROM Message]
			WHERE sender_id = {{fst_id}} AND receiver_id = {{snd_id}}
			ORDER BY Message.created_at
			LIMIT 50;
		`)
		.getResultUsing(agent);

	const received = await new DatabaseQueryBuilder()
		.input('fst_id', fstPersonId)
		.input('snd_id', sndPersonId)
		.query(`
			SELECT  	Message.created_at AS created_at,
					Message.content AS they_sent
			FROM Message
			WHERE sender_id = {{snd_id} AND receiver_id = {{fst_id}}
			ORDER BY Message.created_at
			LIMIT 50;
		`)
		.getResultUsing(agent);

	return [sent.recordSet, received.recordSet];
}

const retrieveMessagedUsers = async (userId) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('user_id', userId)
		.query(`
			SELECT DISTINCT 
			    Account.account_id, 
			    Account.name, 
			    idAndLatest.latest_message_at
			FROM Account
			JOIN (
			    SELECT 
				CASE 
				    WHEN Message.sender_id = {{user_id}} THEN Message.receiver_id
				    ELSE Message.sender_id
				END AS snd_account_id,
				MAX(Message.created_at) AS latest_message_at
			    FROM Message 
			    WHERE Message.sender_id = {{user_id}} OR Message.receiver_id = {{user_id}}
			    GROUP BY 
				CASE 
				    WHEN Message.sender_id = {{user_id}} THEN Message.receiver_id
				    ELSE Message.sender_id
				END
			) AS idAndLatest ON Account.account_id = idAndLatest.snd_account_id
			ORDER BY idAndLatest.latest_message_at;
		`)
		.getResultUsing(agent);

	return result.recordSet;
}

const searchUsers = async (userName) => {
	const lowerName = userName.toLowerCase();
	const result = await new DatabaseQueryBuilder()
		.input('userName', `%${lowerName}%`)
		.query(`
			SELECT *
			FROM Account
			WHERE LOWER(Account.name) LIKE {{userName}} AND Account.is_suspended = 0
			ORDER BY CHAR_LENGTH(Account.name)
			LIMIT 10;
		`)
		.getResultUsing(agent);

	return result.recordSet;
};

const 	fetchUserById = async (id) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	* FROM Account
			WHERE Account.account_id = {{id}}
			LIMIT 1;
		`)
		.getResultUsing(agent);

	let user = result.recordSet[0];

	if (!user) {
		return null;
	}

	return user;
}

const updateProfile = async (params) => {
	const { id, username, bio, university, department } = params;

	const result = await new DatabaseQueryBuilder()
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
		`);
}

const 	is_Admin = async (id) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	is_admin FROM Account
			WHERE account_id = {{id}}
			LIMIT 1;
		`)
		.getResultUsing(agent);

	let admin = result.recordSet[0].is_admin;
	console.log(admin)

	return admin;
}

const 	getSpending = async (id) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	* FROM UsedFunding
			WHERE UsedFunding.funding_id = {{id}}
		`)
		.getResultUsing(agent);

	let spending = result.recordSet[0];

	if (!spending) {
		return null;
	}

	return spending;
}

const 	getFunding = async (id) => {
	const result = await new DatabaseQueryBuilder()
		.input('id', id)
		.query(`
			SELECT	* FROM Funding
			WHERE Funding.project_id = {{id}}
		`)
		.getResultUsing(agent);

	let funding = result.recordSet[0];

	if (!funding) {
		return null;
	}

	return spending;
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
	unsuspendUser,
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
	retrieveMessages,
	retrieveMessagedUsers,
	is_Admin,
	getSpending,
	getFunding
};

