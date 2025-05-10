
import dotenv from 'dotenv';
import axios from 'axios';

function decodeBase64(obj) {
	if (typeof obj === 'string') {
		try {
			return Buffer.from(obj, 'base64').toString('ascii');
		} catch {
			return obj;
		}
	}

	if (Array.isArray(obj)) {
		return obj.map(decodeBase64);
	}

	if (typeof obj === 'object' && obj !== null) {
		const decoded = {};
		for (const [key, value] of Object.entries(obj)) {
			decoded[key] = decodeBase64(value);
		}
		return decoded;
	}

	return obj;
}

dotenv.config();

/*
 * Stores the following:
 * - insertId: usually the auto-increment id of the last inserted item. Will be invalid if the query is a select query, for example
 *   - recordSet: used for the results of select statements
 *   - rowsAffected: how many rows were affected by the execution of the query
 */
class QueryResult {
	constructor(res) {
		this.insertId = res.InsertId;
		this.recordSet = res.RecordSet;
		this.rowsAffected = res.rowsAffected;
	}
}

class DatabaseQuery {
	constructor(statement, params) {
		this.statement = statement;
		this.params = params;
	}

	/*
	 * Sends a query to the database server using the httpsAgent. httpsAgent is expected to resemble
	 *
		const httpsAgent = new https.Agent({
			ca: fs.readFileSync('./server.crt'), 
			rejectUnauthorized: true
		});
	*/
	async sendUsing(httpsAgent) {
		const url = `https://${process.env.DB_HOST}:${process.env.DB_PORT}/query`;
		console.log(url);
		const response = await axios.post(url, {
			query: this.statement,
			params: this.params,
		}, {
			headers: {
				'X-API-Key': process.env.DB_API_KEY,
			},
			httpsAgent
		});

		return response;
	}

	/* Retrieves the record set using the specified agent (may fail). Takes care of decoding base64.*/
	async getResultUsing(agent) {
		const res = await this.sendUsing(agent);
		return new QueryResult(decodeBase64(res.data));
	}
}

class DatabaseQueryBuilder {
	constructor() {
		// params are just interpreted as mappings from strings to strings
		this.params = {};
		// this way, errors will propagate before they will be caught. It makes for easier debugging
		this.hasError = false;
		this.errors = [];
	}

	input(parameter, value) {
		if (this.params.hasOwnProperty(parameter)) {
			this.hasError = true;
			this.errors.push(`${parameter} already exists in query.`);
			return this;
		}

		this.params[parameter] = value;
		return this;
	}

	query(givenStatement) {
		this.statement = givenStatement;
		return this;
	}

	build() {
		if (this.errors.length > 0) {
			throw new Error(this.errors.join('\n'));
		}

		return new DatabaseQuery(this.statement, this.params);
	}

	async sendUsing(httpsAgent) {
		const query = this.build();
		return query.sendUsing(httpsAgent);
	}

	/* Retrieves the record set using the specified agent (may fail). Takes care of decoding base64.*/
	async getResultUsing(agent) {
		const query = this.build();
		return query.getResultUsing(agent);
	}
}

export {
	DatabaseQuery,
	DatabaseQueryBuilder,
	decodeBase64,
}
