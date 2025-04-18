DECLARE @InsertedAccounts TABLE (account_id INT);

INSERT INTO Account (name, is_admin, university, department, bio)
OUTPUT INSERTED.account_id INTO @InsertedAccounts
VALUES (@name, @is_admin, @university, @department, @bio);

INSERT INTO AccountLink (uuid, source, account_id)
VALUES (@uuid, @source, (SELECT account_id FROM @InsertedAccounts));

