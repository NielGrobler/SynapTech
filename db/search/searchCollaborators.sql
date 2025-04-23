SELECT	[dbo].[Account].account_id AS account_id,
	[dbo].[Collaborator].is_active AS is_active,
	[dbo].[Account].name AS name,
	[dbo].[Collaborator].role AS role
FROM [dbo].[Collaborator]
INNER JOIN [dbo].[Account]
ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id
WHERE [dbo].[Collaborator].project_id = @project_id AND [dbo].[Collaborator].is_pending = 0;
