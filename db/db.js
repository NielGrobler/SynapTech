import sql from 'mssql';
import Joi from 'joi';
import dotenv from 'dotenv';

dotenv.config();

const config = {
	user: process.env.AZURE_DB_USER,
	password: process.env.AZURE_DB_PASSWORD,
	server: process.env.AZURE_DB_SERVER,
	database: process.env.AZURE_DB_NAME,
	options: {
		encrypt: true,
		trustServerCertificate: false
	},
	pool: {
		max: 10,
		min: 0,
		idleTimeoutMillis: 30000
	}
};

const poolPromise = new sql.ConnectionPool(config).connect()
	.then(pool => {
		console.log('Connected to Azure DB with pool');
		return pool;
	})
	.catch(err => {
		console.error('Database connection failed. Bad Config: ', err);
		throw err;
	});

const getUserByGUID = async (guid) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('guid', sql.NVarChar, guid)
		.query(`
			SELECT
				A.account_id AS id,
				A.name,
				A.bio,
				L.uuid,
				L.source
			FROM [dbo].[Account] A
			INNER JOIN [dbo].[AccountLink] L ON L.account_id = A.account_id
			WHERE L.source = 'Google' AND uuid = @guid;
		`);
	return result.recordset[0];
};

const createUser = async (user) => {
	const pool = await poolPromise;
	await pool.request()
		.input('name', sql.NVarChar, user.name)
		.input('is_admin', sql.Bit, false)
		.input('university', sql.NVarChar, null)
		.input('department', sql.NVarChar, null)
		.input('bio', sql.NVarChar, null)
		.input('uuid', sql.NVarChar, user.id)
		.input('source', sql.NVarChar, user.source)
		.batch(`
			DECLARE @InsertedAccounts TABLE (account_id INT);

			INSERT INTO Account (name, is_admin, university, department, bio)
			OUTPUT INSERTED.account_id INTO @InsertedAccounts
			VALUES (@name, @is_admin, @university, @department, @bio);

			INSERT INTO AccountLink (uuid, source, account_id)
			VALUES (@uuid, @source, (SELECT account_id FROM @InsertedAccounts));
		`);
};

const projectSchema = Joi.object({
	name: Joi.string().trim().min(3).max(255).regex(/^[A-Za-z\s]+$/).required(),
	description: Joi.string().min(3).max(255).regex(/^[A-Za-z0-9\s,.'"!;?-]+$/).required(),
	field: Joi.string().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/).required(),
	isPublic: Joi.boolean().required()
});

// Project names are unique up to user id
const checkProjectNameUniqueness = async (project, user) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('name', sql.NVarChar, project.name)
		.input('created_by_account_id', sql.Int, user.id)
		.query(`
			SELECT *
			FROM [dbo].[Project]
			WHERE [dbo].[Project].name = @name AND [dbo].[Project].created_by_account_id = @created_by_account_id;
		`);

	return result.recordset.length === 0;
}

const createProject = async (project, user) => {
	const { _, error } = projectSchema.validate(project);
	if (error) {
		throw new Error(`Malformed project.`);
	}

	const isUnique = await checkProjectNameUniqueness(project, user);
	if (!isUnique) {
		throw new Error(`Project with name ${project.name} already exists.`);
	}

	const pool = await poolPromise;
	await pool.request()
		.input('name', sql.NVarChar, project.name)
		.input('description', sql.NVarChar, project.description)
		.input('is_public', sql.Bit, project.isPublic)
		.input('created_by_account_id', sql.Int, user.id)
		.query(`
			INSERT INTO Project(name, description, is_public, created_by_account_id)
			VALUES(@name, @description, @is_public, @created_by_account_id);
		`);
};

const fetchAssociatedProjects = async (user) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('id', sql.Int, user.id)
		.query(`
			SELECT [dbo].[Project].project_id AS id,
				[dbo].[Project].created_by_account_id AS author_id,
				[dbo].[Project].created_at AS created_at,
				[dbo].[Project].name AS name,
				[dbo].[Project].description AS description,
				[dbo].[Project].is_public AS is_public
			FROM [dbo].[Project]
			LEFT JOIN [dbo].[Collaborator] ON [dbo].[Collaborator].project_id = [dbo].[Project].project_id
			LEFT JOIN [dbo].[Account] ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id
			WHERE [dbo].[Project].created_by_account_id = @id OR ([dbo].[Collaborator].account_id = @id AND [dbo].[Collaborator].is_pending = 0);
		`);
	return result.recordset;
};

const appendCollaborators = async (projects) => {
	const pool = await poolPromise;
	const transaction = new sql.Transaction(pool);
	try {
		await transaction.begin();
		for (let project of projects) {
			const request = new sql.Request(transaction);
			const queryResult = await request
				.input('project_id', sql.Int, project.id)
				.query(`
					SELECT [dbo].[Account].account_id AS account_id,
						[dbo].[Collaborator].is_active AS is_active,
						[dbo].[Account].name AS name,
						[dbo].[Collaborator].role AS role
					FROM [dbo].[Collaborator]
					INNER JOIN [dbo].[Account] ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id
					WHERE [dbo].[Collaborator].project_id = @project_id AND [dbo].[Collaborator].is_pending = 0;
				`);
			project.collaborators = queryResult.recordset;
		}
		await transaction.commit();
	} catch (err) {
		await transaction.rollback();
		console.error('Transaction rolled back.', err);
	}
};

const deleteUser = async (userId) => {
	const pool = await poolPromise;
	await pool.request()
		.input('id', sql.Int, userId)
		.query(`
			DELETE FROM [dbo].[AccountLink] WHERE [dbo].[AccountLink].account_id = @id;
			DELETE FROM [dbo].[Project] WHERE [dbo].[Project].created_by_account_id = @id;
			DELETE FROM [dbo].[Collaborator] WHERE [dbo].[Collaborator].account_id = @id;
			DELETE FROM [dbo].[Account] WHERE [dbo].[Account].account_id = @id;
		`);
};

const isSuspendend = async (userId) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('id', sql.NVarChar, userId)
		.query(`
			SELECT account_id FROM SuspendedAccount WHERE account_id = @id;
		`);
	return result.recordset.length > 0;
};

const suspendUser = async (userId) => {
	const pool = await poolPromise;
	await pool.request()
		.input('id', sql.NVarChar, userId)
		.query(`
			INSERT INTO SuspendedAccount(account_id) VALUES(@id);
		`);
};

const addCollaborator = async (projectId, userId, role) => {
	const pool = await poolPromise;
	await pool.request()
		.input('project_id', sql.NVarChar, projectId)
		.input('account_id', sql.NVarChar, userId)
		.input('role', sql.NVarChar, role)
		.query(`
			INSERT INTO Collaborator (account_id, project_id, role, is_active, is_pending)
			VALUES(@account_id, @project_id, @role, 1, 1);
		`);
};

const acceptCollaborator = async (collaboratorId) => {
	const pool = await poolPromise;
	await pool.request()
		.input('id', sql.NVarChar, collaboratorId)
		.query(`
			-- You may want to update this to reflect the actual behavior
			UPDATE Collaborator SET is_pending = 0 WHERE collaborator_id = @id;
		`);
};

const searchProjects = async (projectName) => {
	const lowerName = projectName.toLowerCase();
	const pool = await poolPromise;
	const result = await pool.request()
		.input('projectName', sql.NVarChar, `%${lowerName}%`)
		.query(`
			SELECT TOP 10 *
			FROM [dbo].[Project]
			WHERE LOWER([dbo].[Project].name) LIKE @projectName AND [dbo].[Project].is_public = 1
			ORDER BY LEN([dbo].[Project].name);
		`);
	return result.recordset;
};

const fetchCollaborators = async (projectId) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('project_id', sql.Int, projectId)
		.query(`
			SELECT [dbo].[Account].account_id AS account_id,
				[dbo].[Collaborator].is_active AS is_active,
				[dbo].[Account].name AS name,
				[dbo].[Collaborator].role AS role
			FROM [dbo].[Collaborator]
			INNER JOIN [dbo].[Account] ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id
			WHERE [dbo].[Collaborator].project_id = @project_id AND [dbo].[Collaborator].is_pending = 0;
		`);

	return result.recordset;
}

const fetchPendingCollaborators = async (user) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('id', sql.Int, user.id)
		.query(`
			SELECT	*
			FROM [dbo].[Collaborator]
			INNER JOIN [dbo].[Account]
			ON [dbo].[Account].id = [dbo].[Collaborator].account_id
			WHERE [dbo].[Account].id = @id AND [dbo].[Collaborator].is_pending = 1;
		`);

	return result.recordset;
}

const fetchProjectById = async (id) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('id', sql.Int, id)
		.query(`
			SELECT	[dbo].[Project].project_id AS id,
				[dbo].[Project].name AS name,
				[dbo].[Project].created_by_account_id AS created_by_account_id,
				[dbo].[Account].name AS author_name,
				[dbo].[Project].created_at AS created_at,
				[dbo].[Project].description AS description,
				[dbo].[Project].is_public AS is_public
			FROM [dbo].[Project]
			INNER JOIN [dbo].[Account]
			ON [dbo].[Project].created_by_account_id = [dbo].[Account].account_id
			WHERE [dbo].[Project].project_id = @id;
		`);

	let project = result.recordset[0];

	if (!project) {
		return null;
	}

	project.collaborators = await fetchCollaborators(id);

	return project;
}

const createReview = async (reviewData) => {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('project_id', sql.Int, reviewData.project_id)
		.input('reviewer_id', sql.Int, reviewData.reviewer_id)
		.input('reviewerName', sql.NVarChar, reviewData.reviewerName)
		.input('rating', sql.Int, reviewData.rating)
		.input('comment', sql.NVarChar, reviewData.comment)
		.input('dateSubmitted', sql.DateTime, reviewData.dateSubmitted)
		.query(`
            INSERT INTO Review (project_id, reviewer_id, reviewerName, rating, comment, dateSubmitted)
            OUTPUT INSERTED.review_id
            VALUES (@project_id, @reviewer_id, @reviewerName, @rating, @comment, @dateSubmitted);
        `);

	const reviewId = result.recordset[0].review_id;

	return {
		review_id: reviewId,
		...reviewData
	};
};

export default {
	getUserByGUID,
	createUser,
	createProject,
	fetchAssociatedProjects,
	appendCollaborators,
	deleteUser,
	isSuspendend,
	suspendUser,
	addCollaborator,
	acceptCollaborator,
	searchProjects,
	fetchProjectById,
	createReview
};

