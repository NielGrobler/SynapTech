CREATE TABLE Funding (
    funding_id INT IDENTITY(1, 1) PRIMARY KEY,
    project_id INT NOT NULL,
    funding_date DATE NOT NULL,
    currency VARCHAR(10) NOT NULL,
    funding_type VARCHAR(50) NOT NULL,
    total_funding DECIMAL(12, 2) NOT NULL,
    
    FOREIGN KEY (project_id) REFERENCES Project(project_id)
    
);
