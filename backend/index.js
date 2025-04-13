require('dotenv').config();
const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER, // e.g., myserver.database.windows.net
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  }
};

async function connectAndQuery() {
  try {
    let pool = await sql.connect(config);
    let result = await pool.request().query('SELECT * FROM [dbo].[Test];');
    console.log(result.recordset);
    sql.close();
  } catch (err) {
    console.error('SQL error', err);
  }
}

connectAndQuery();

