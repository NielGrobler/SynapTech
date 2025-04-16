CREATE TABLE AccountLink (
	uuid VARCHAR(255) NOT NULL,
	source ENUM('Orcid', 'Google') NOT NULL,
	user_id INT NOT NULL,	

	PRIMARY KEY(uuid),
	FOREIGN KEY (user_id) REFERENCES Users(user_id)
);
