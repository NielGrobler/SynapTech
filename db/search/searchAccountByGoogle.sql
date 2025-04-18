SELECT *
FROM [dbo].[Account]
INNER JOIN [dbo].[AccountLink]
ON [dbo].[AccountLink].account_id = [dbo].[Account].account_id
WHERE [dbo].[AccountLink].source = 'Google' AND uuid = @guid;
