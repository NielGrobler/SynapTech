CREATE TABLE Collaborator (
	account_id INT NOT NULL,
	project_id INT NOT NULL,

	role NVARCHAR(10) NOT NULL CHECK (role IN ('Researcher', 'Reviewer')),

	is_active BIT NOT NULL,
	
	FOREIGN KEY (account_id) REFERENCES Account(account_id),
	FOREIGN KEY (project_id) REFERENCES Project(project_id),
	PRIMARY KEY (account_id, project_id),
	
);
