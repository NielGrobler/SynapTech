SELECT * 
FROM Project
WHERE name LIKE @name AND is_public = 1;
