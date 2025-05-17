
import dotenv from 'dotenv';
import axios from 'axios';

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
		this.rowsAffected = res.RowsAffected;
	}
}

class DatabaseQuery {
	constructor(statement, params) {
		this.statement = statement;
		this.params = params;
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

	query(statement) {
		this.statement = statement;
		return this;
	}

	build() {
		if (this.errors.length > 0) {
			throw new Error(this.errors.join('\n'));
		}

		return new DatabaseQuery(this.statement, this.params);
	}
}

export {
	DatabaseQuery,
	DatabaseQueryBuilder,
	QueryResult
}
