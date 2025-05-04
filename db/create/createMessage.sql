CREATE TABLE Message (
	id BIGINT IDENTITY(1,1) PRIMARY KEY,
	sender_id INT NOT NULL,
	receiver_id INT NOT NULL,
	content NVARCHAR(1024) NOT NULL,
	created_at DATETIME DEFAULT GETDATE() NOT NULL,
	is_read BIT DEFAULT 0,

	FOREIGN KEY (sender_id) REFERENCES Account(account_id),
	FOREIGN KEY (receiver_id) REFERENCES Account(account_id),
	CONSTRAINT CHK_Sender_Receiver_NotEqual CHECK (SenderId <> ReceiverId)
);

