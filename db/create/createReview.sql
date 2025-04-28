CREATE TABLE Review (
    review_id INT IDENTITY(1, 1) PRIMARY KEY,
    project_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
	created_at DATETIME DEFAULT GETDATE() NOT NULL,
    
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (reviewer_id) REFERENCES Account(account_id)
);
