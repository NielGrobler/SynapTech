SELECT
	A.account_id AS user_account_id,
	A.name,
	A.email,
	L.uuid,
	L.source
FROM [dbo].[Account] A
INNER JOIN [dbo].[AccountLink] L ON L.account_id = A.account_id
WHERE L.source = 'Google' AND uuid = @guid;
