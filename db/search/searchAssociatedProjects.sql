SELECT	[dbo].[Project].project_id AS id,
	[dbo].[Project].created_by_account_id AS author_id,
	[dbo].[Project].created_at AS created_at,
	[dbo].[Project].name AS name,
	[dbo].[Project].description AS description,
	[dbo].[Project].is_public AS is_public
FROM [dbo].[Project]
LEFT JOIN [dbo].[Collaborator]
ON [dbo].[Collaborator].project_id = [dbo].[Project].project_id
LEFT JOIN [dbo].[Account]
ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id
WHERE [dbo].[Project].created_by_account_id = @id OR ([dbo].[Collaborator].account_id = @id AND [dbo].[Collaborator].is_pending = 0);
