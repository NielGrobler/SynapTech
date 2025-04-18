CREATE TABLE AccountLink (
    uuid NVARCHAR(255) NOT NULL,
    source NVARCHAR(50) NOT NULL CHECK (source IN ('Orcid', 'Google')),
    account_id INT NOT NULL,

    PRIMARY KEY (uuid),
    FOREIGN KEY (account_id) REFERENCES Account(account_id)
);
