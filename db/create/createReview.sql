CREATE TABLE Review (
    review_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    reviewer_id VARCHAR(255) NOT NULL,
    reviewerName VARCHAR(255) NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    dateSubmitted DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES Project(project_id),
    FOREIGN KEY (reviewer_id) REFERENCES users(userId)
);
