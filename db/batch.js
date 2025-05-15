const axios = require('axios');
const fs = require('fs');
const path = require('path');

class BatchRequest {
	constructor() {
		this.items = []
	}

	addQueryReq(query) {
		this.items.append({
			queryReq: {
				query
			}
		});
	}

	addUploadReq(formData, filename) {
		this.items.append({
			uploadReq: {
				formData: formData,
				filename: filename
			}
		});
	}
}
