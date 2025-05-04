CREATE TABLE Account (
	account_id INT IDENTITY(1,1) PRIMARY KEY,
	created_at DATETIME DEFAULT GETDATE() NOT NULL,
	name NVARCHAR(255) NOT NULL,
	is_admin BIT NOT NULL,
	is_suspended BIT DEFAULT 0 NOT NULL,
	university NVARCHAR(64),
	department NVARCHAR(128),
	bio NVARCHAR(255),
);

