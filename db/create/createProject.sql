CREATE TABLE Project (
	project_id INT IDENTITY(1,1) PRIMARY KEY,
	created_at DATETIME DEFAULT GETDATE() NOT NULL,
	name NVARCHAR(255) NOT NULL,
	description NVARCHAR(255) NOT NULL,
	is_public BIT NOT NULL,
	created_by INT,

	created_by_account_id INT NOT NULL,

	FOREIGN KEY (created_by_account_id) REFERENCES Account(account_id),
);
