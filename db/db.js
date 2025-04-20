const sql = require('mssql');

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
		idleTimeoutMillis: 30000,
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

async function getUserByGUID(guid) {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('guid', sql.NVarChar, guid)
		.query(`
			SELECT *
			FROM [dbo].[Account]
			INNER JOIN [dbo].[AccountLink]
			ON [dbo].[AccountLink].account_id = [dbo].[Account].account_id
			WHERE [dbo].[AccountLink].source = 'Google' AND uuid = @guid;
		`);

	return result.recordset[0];
}

async function createUser(user) {
	const pool = await poolPromise;
	const result = await pool.request()
		.input('name', sql.NVarChar, user.name)
		.input('is_admin', sql.Bit, false)
		.input('university', sql.NVarChar, null)
		.input('department', sql.NVarChar, null)
		.input('bio', sql.NVarChar, null)
		.input('uuid', sql.NVarChar, user.id)
		.input('source', sql.NVarChar, user.source)
		.query(`
			DECLARE @InsertedAccounts TABLE (account_id INT);

			INSERT INTO Account (name, is_admin, university, department, bio)
			OUTPUT INSERTED.account_id INTO @InsertedAccounts
			VALUES (@name, @is_admin, @university, @department, @bio);

			INSERT INTO AccountLink (uuid, source, account_id)
			VALUES (@uuid, @source, (SELECT account_id FROM @InsertedAccounts));
		`);
}

module.exports = {
	getUserByGUID,
	createUser
};

