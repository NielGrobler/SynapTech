class BatchRequest {
	constructor() {
		this.items = [];
	}

	addQueryReq(query) {
		this.items.push({
			queryReq: {
				query
			}
		});
	}

	addUploadReq(formData, filename) {
		this.items.push({
			uploadReq: {
				formData: formData,
				filename: filename
			}
		});
	}
}

module.exports = BatchRequest;
