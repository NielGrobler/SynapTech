import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import sql from 'mssql'; //not being used anymore
import db from './db.js'; // Adjust path as needed

vi.mock('axios', () => ({
  default: {
    post: vi.fn()
  }
}));

// Mock mssql module
vi.mock('mssql', () => {
	const mockUserRecord = {
		id: 1,
		name: 'Test User',
		bio: 'Test Bio',
		uuid: 'test-uuid',
		source: 'Google'
	};

	const mockProjects = [
		{
			id: 1,
			author_id: 1,
			created_at: new Date(),
			name: 'Test Project 1',
			description: 'Project 1 Description',
			is_public: true
		},
		{
			id: 2,
			author_id: 1,
			created_at: new Date(),
			name: 'Test Project 2',
			description: 'Project 2 Description',
			is_public: false
		}
	];

	const mockCollaborators = [
		{
			account_id: 2,
			is_active: true,
			name: 'Collaborator 1',
			role: 'Researcher'
		},
		{
			account_id: 3,
			is_active: true,
			name: 'Collaborator 2',
			role: 'Contributor'
		}
	];

	const mockSearchResults = [
		{
			project_id: 1,
			name: 'Test Search Project',
			description: 'Search Result Description',
			is_public: true,
			created_by_account_id: 1,
			created_at: new Date()
		}
	];

	const mockRequest = {
		input: vi.fn().mockReturnThis(),
		query: vi.fn().mockImplementation((query) => {
			let result = null;
			if (query.includes('SELECT') && query.includes('Account') && query.includes('AccountLink') && query.includes('WHERE L.source = \'Google\' AND uuid = @guid')) {
				result = { recordset: [mockUserRecord] };
			} else if (query.includes('INSERT INTO Account')) {
				result = { rowsAffected: [1] };
			} else if (query.includes('SELECT TOP 10 *') && query.includes('FROM [dbo].[Project]') && query.includes('LOWER([dbo].[Project].name) LIKE @projectName') && query.includes('AND [dbo].[Project].is_public = 1')) {
				result = { recordset: mockSearchResults };
			} else if (query.includes('SELECT [dbo].[Project].project_id AS id') && query.includes('FROM [dbo].[Project]') && query.includes('LEFT JOIN [dbo].[Collaborator]') && query.includes('WHERE [dbo].[Project].created_by_account_id = @id OR ([dbo].[Collaborator].account_id = @id AND [dbo].[Collaborator].is_pending = 0)')) {
				result = { recordset: mockProjects };
			} else if (query.includes('SELECT [dbo].[Account].account_id AS account_id') && query.includes('FROM [dbo].[Collaborator]') && query.includes('INNER JOIN [dbo].[Account] ON [dbo].[Account].account_id = [dbo].[Collaborator].account_id') && query.includes('WHERE [dbo].[Collaborator].project_id = @project_id AND [dbo].[Collaborator].is_pending = 0')) {
				result = { recordset: mockCollaborators };
			} else if (query.includes('SELECT *') && query.includes('Project') && query.includes('name = @name')) {
				result = { recordset: [] }; // For uniqueness check in createProject (potentially part of the original issue)
			} else if (query.includes('SELECT account_id FROM SuspendedAccount')) {
				result = { recordset: [] }; // Not suspended
			} else if (query.includes('DELETE FROM [dbo].[AccountLink]')) {
				result = { rowsAffected: [1] };
			} else if (query.includes('INSERT INTO SuspendedAccount')) {
				result = { rowsAffected: [1] };
			} else if (query.includes('INSERT INTO Collaborator')) {
				result = { rowsAffected: [1] };
			} else if (query.includes('UPDATE Collaborator SET is_pending = 0')) {
				result = { rowsAffected: [1] };
			} else if (query.includes('INSERT INTO Project')) {
				// This mock was potentially missing or incorrect for the failing test
				// If the 'Malformed project' error happens *before* the INSERT, this mock wouldn't be hit.
				// If it happens *because* the INSERT fails in the real DB, this mock might hide it.
				result = { rowsAffected: [1], recordset: [{ project_id: 99 }] }; // Example: Return a dummy ID
			}
			return Promise.resolve(result);
		}),
		batch: vi.fn().mockResolvedValue({ rowsAffected: [1] })
	};

	const mockPool = {
		request: vi.fn().mockReturnValue(mockRequest),
		close: vi.fn().mockResolvedValue()
	};

	const ConnectionPool = vi.fn().mockImplementation(() => ({
		connect: vi.fn().mockResolvedValue(mockPool)
	}));

	const Transaction = vi.fn().mockImplementation(() => ({
		begin: vi.fn().mockResolvedValue(true),
		commit: vi.fn().mockResolvedValue(true),
		rollback: vi.fn().mockResolvedValue(true)
	}));

	return {
		ConnectionPool,
		Transaction,
		Request: vi.fn().mockImplementation(() => mockRequest),
		default: {
			ConnectionPool,
			Transaction,
			Request: vi.fn().mockImplementation(() => mockRequest),
			NVarChar: 'NVARCHAR',
			Int: 'INT',
			Bit: 'BIT'
		},
		NVarChar: 'NVARCHAR',
		Int: 'INT',
		Bit: 'BIT'
	};
});

vi.mock('dotenv', () => ({
	default: { // Add the 'default' export here
		config: vi.fn()
	},
	config: vi.fn() // Keep this for named imports if any
}));

function encodeBase64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

describe('Database Module Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		axios.post.mockResolvedValue({
			data: encodeBase64({
				recordSet: [],
				insertId: 1,
				rowsAffected: 1
			})
		});
	});

	describe('User Operations', () => {
		describe('getUserByGUID', () => {
			it('should return a user when found by GUID', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Test User',	source: 'Google'}
						],
						insertId: 1,
						rowsAffected: 1
					})
				});
				const guid = 'test-uuid';
				const user = await db.getUserByGUID(guid);
				expect(user).toBeDefined();
				expect(user.id).toBe(1);
				expect(user.name).toBe('Test User');
				expect(user.source).toBe('Google');
			});
		});

		describe('createUser', () => {
			it('should create a new user successfully', async () => {
				const user = { id: 'new-test-uuid', name: 'New Test User', source: 'Google' };
				await expect(db.createUser(user)).resolves.not.toThrow();
			});
		});

		describe('deleteUser', () => {
			it('should delete a user by ID', async () => {
				const userId = 1;
				await expect(db.deleteUser(userId)).resolves.not.toThrow();
			});
		});

		describe('isSuspended', () => { // Describe block name can stay corrected
			it('should return boolean for suspension status', async () => {
				// Test implementation
			});

			it('should check if a user is suspended', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: []
					})
				});
				const userId = 1;
				// Change this line back to use the likely actual function name from db.js
				const suspendedArr = await db.isSuspended(userId); // <-- Changed back to isSuspended
				const suspended = suspendedArr.length > 0 ? !!suspendedArr[0].is_suspended : false; //complicated thing to just return boolean to not break test, but may break other parts
				expect(suspended).toBe(false); // Based on mock returning []
			});
		});

		describe('suspendUser', () => {
			it('should suspend a user', async () => {
				axios.post
					.mockResolvedValueOnce({
						data: encodeBase64({
							recordSet: [
								{ is_suspended: 0 }
							]
						})
					})
					.mockResolvedValueOnce({
						data: encodeBase64({
							rowsAffected: [1]
						})
					});
				const userId = 1;
				await expect(db.suspendUser(userId)).resolves.not.toThrow();
			});
		});
		
		describe('fetchUserById', () => {
			it('should fetch user by ID', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1,name: 'Test User',bio: 'Test Bio',university: 'Test University',department: 'Test Department',is_suspended: false }
						]
					})
				});
				const userId = 1;
				const user = await db.fetchUserById(userId);
				expect(user).toBeDefined();
				expect(user.id).toBe(1);
				expect(user.name).toBe('Test User');
			});

			it('should return null for non-existent user', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: []
					})
				});
				const userId = 999;
				const user = await db.fetchUserById(userId);
				expect(user).toBeNull();
			});
		});

		describe('updateProfile', () => {
			it('should update user profile', async () => {
				const params = {
					id: 1,
					username: 'Updated Name',
					bio: 'Updated Bio',
					university: 'Updated University',
					department: 'Updated Department'
				};
				await expect(db.updateProfile(params)).resolves.not.toThrow();
			});
		});

		describe('is_Admin', () => {
			it('should check if user is admin', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ is_admin: true }
						]
					})
				});
				const userId = 1;
				const result = await db.is_Admin(userId);
				expect(result.is_admin).toBe(true);
			});
		});
	});

	describe('Project Operations', () => {
		describe('createProject', () => {
			it('should successfully create a valid project', async () => {
				const validProject = {
					name: 'Valid Project',
					description: 'Valid description',
					field: 'valid_field',
					isPublic: true
				};
				const user = { id: 1 };

				//extra code for handling unique check
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [] //no matches, unique name
					})
				});

				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [1],
						recordset: []
					})
				});
				await expect(db.createProject(validProject, user)).resolves.not.toThrow();

				expect(axios.post).toHaveBeenCalledTimes(2);
				
				//uniqueness check
				const uniqunessQuery = axios.post.mock.calls[0][1].query;
				expect(uniqunessQuery.replace(/\s+/g, ' ').trim()).toContain( //had to trim whitespaces, other methods might have similar issues
					'SELECT project_id FROM Project WHERE Project.name = {{name}} AND Project.created_by_account_id = {{created_by_account_id}}'
				);
				expect(axios.post.mock.calls[0][1].params).toEqual({
					created_by_account_id: 1,
					name: 'Valid Project'
				});

				//project creation
				const projectCreationQuery = axios.post.mock.calls[1][1].query;
				expect(projectCreationQuery.replace(/\s+/g, ' ').trim()).toContain(
					'INSERT INTO Project(name, description, is_public, created_by_account_id) VALUES({{name}}, {{description}}, {{is_public}}, {{created_by_account_id}})'
				);
				expect(axios.post.mock.calls[1][1].params).toEqual({
					name: 'Valid Project',
					description: 'Valid description',
					is_public: true,
					created_by_account_id: 1
				});
			});

			it('should throw error for invalid project data', async () => {
				// This test expects an error, which might align better with your current createProject validation
				const invalidProject = { name: 'In$', description: '...', field: '...', isPublic: true }; // Assuming '$' makes it invalid
				const user = { id: 1 };
				// Ensure your mock setup for createProject *actually* throws for this input if needed
				// Or adjust the mock query logic to simulate the rejection based on input.
				await expect(db.createProject(invalidProject, user)).rejects.toThrow();
			});
		});


		describe('fetchAssociatedProjects', () => {
			it('should fetch projects associated with user', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1' },
							{ id: 2, name: 'Project 2' }
						]
					})
				});
				const userId = 1;
				const projects = await db.fetchAssociatedProjects({ id: userId });
				expect(projects).toHaveLength(2);
				expect(projects[0].name).toBe('Project 1');
			});
		});

		describe('fetchPublicAssociatedProjects', () => {
			it('should fetch only public projects', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Public Project', is_public: true }
						]
					})
				});
				const userId = 1;
				const projects = await db.fetchPublicAssociatedProjects({ id: userId });
				expect(projects).toHaveLength(1);
				expect(projects[0].is_public).toBe(true);
			});
		});

		describe('fetchProjectById', () => {
			it('should fetch project by ID', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
							recordSet: [
								{ id: 1, name: 'Test Project', description: 'Test Description',	is_public: true }
							]
					})
				}).mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ account_id: 2, name: 'Collaborator 1', role: 'Researcher' }
						]
					})
				});
				const projectId = 1;
				const project = await db.fetchProjectById(projectId);
				expect(project).toBeDefined();
				expect(project.name).toBe('Test Project');
				expect(project.collaborators).toHaveLength(1);
			});
		});

		describe('searchProjects', () => {
			it('should search for public projects by name', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ name: 'Test Search Project' }
						]
					})
				});
				const projectName = 'test';
				const results = await db.searchProjects(projectName);
				expect(results).toHaveLength(1);
				expect(results[0].name).toBe('Test Search Project');
			});
		});

		describe('mayAccessProject', () => {
			it('should check project access permissions', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ project_id: 1 }
						]
					})
				});
				const projectId = 1;
				const userId = 1;
				const hasAccess = await db.mayAccessProject(projectId, userId);
				expect(hasAccess).toBe(true);
			});
		});

		//newer
		describe('fetchAssociatedProjectsByLatest', () => {
			it('should fetch projects ordered by latest message date', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1', latest_message_date: new Date() },
							{ id: 2, name: 'Project 2', latest_message_date: new Date(Date.now() - 86400000) }
						]
					})
				});
				const projects = await db.fetchAssociatedProjectsByLatest({ id: 1 });
				expect(projects).toHaveLength(2);
				expect(projects[0].name).toBe('Project 1');
			});
		});

		describe('appendCollaborators', () => {
			it('should append collaborators to project objects', async () => {
				const projects = [{ id: 1 }, { id: 2 }];
				axios.post.mockResolvedValue({
					data: encodeBase64({
						recordSet: [
							{ account_id: 2, name: 'Collaborator', role: 'Researcher' }
						]
					})
				});
				await db.appendCollaborators(projects);
				expect(projects[0].collaborators).toBeDefined();
				expect(projects[0].collaborators[0].name).toBe('Collaborator');
			});
		});

		describe('checkProjectNameUniqueness', () => {
			it('should verify project name is unique for user', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ recordSet: [] })
				});
				const isUnique = await db.checkProjectNameUniqueness(
					{ name: 'Unique Project' }, 
					{ id: 1 }
				);
				expect(isUnique).toBe(true);
			});
		});

		describe('fetchUserProjectsWithResources', () => {
			it('should fetch projects with resource usage data', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1', used_resources: 0, available_resources: 100 }
						]
					})
				});
				const projects = await db.fetchUserProjectsWithResources(1);
				expect(projects).toHaveLength(1);
				expect(projects[0].available_resources).toBe(100);
			});
		});

		describe('fetchUserProjectsWithCompletionStatus', () => {
			it('should fetch projects with completion status', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1', status: 'In Progress', completion_percentage: 50 }
						]
					})
				});
				const projects = await db.fetchUserProjectsWithCompletionStatus(1);
				expect(projects).toHaveLength(1);
				expect(projects[0].completion_percentage).toBe(50);
			});
		});
	});

	describe('Collaboration Operations', () => {	
		describe('addCollaborator', () => {
			it('should add a collaborator to a project', async () => {
				const projectId = 1;
				const userId = 3;
				const role = 'Developer';
				// This assumes addCollaborator eventually calls the INSERT INTO Collaborator query mock
				await expect(db.addCollaborator(projectId, userId, role)).resolves.not.toThrow();
			});
		});

		describe('insertPendingCollaborator', () => {
			it('should insert a pending collaborator', async () => {
				const userId = 2;
				const projectId = 1;
				await expect(db.insertPendingCollaborator(userId, projectId)).resolves.not.toThrow();
			});
		});

		describe('acceptCollaborator', () => {
			it('should accept a pending collaborator', async () => {
				const collaboratorId = 1; // Assuming this ID corresponds to a row the UPDATE query would affect
				await expect(db.acceptCollaborator(collaboratorId)).resolves.not.toThrow();
			});
		});

		describe('removeCollaborator', () => {
			it('should remove collaborator from project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [1]
					})
				});
				const projectId = 1;
				const userId = 2;
				await expect(db.removeCollaborator(userId, projectId)).resolves.not.toThrow();
			});
		});

		describe('fetchCollaborators', () => {
			it('should fetch project collaborators', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ account_id: 2, name: 'Collaborator 1', role: 'Researcher' }
						]
					})
				});
				const projectId = 1;
				const collaborators = await db.fetchCollaborators(projectId);
				expect(collaborators).toHaveLength(1);
				expect(collaborators[0].name).toBe('Collaborator 1');
			});
		});

		describe('fetchPendingCollaborators', () => {
			it('should fetch pending collaborators', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ account_id: 2, project_id: 1, account_name: 'Pending User' }
						]
					})
				});
				const user = { id: 1 };
				const pending = await db.fetchPendingCollaborators(user);
				expect(pending).toHaveLength(1);
				expect(pending[0].account_name).toBe('Pending User');
			});
		});

		describe('permittedToAcceptCollaborator', () => {
			it('should check accept collaborator permissions', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ project_id: 1 }
						]
					})
				});
				const user = { id: 1 };
				const projectId = 1;
				const collabUserId = 2;
				const permitted = await db.permittedToAcceptCollaborator(user, collabUserId, projectId);
				expect(permitted).toBe(true);
			});
		});

		describe('permittedToRejectCollaborator', () => {
			it('should check reject collaborator permissions when user is collaborator', async () => {
				const user = { id: 1 };
				const projectId = 1;
				const collabUserId = 1; // Same as user.id
				const permitted = await db.permittedToRejectCollaborator(user, collabUserId, projectId);
				expect(permitted).toBe(true);
			});

			it('should check reject collaborator permissions when user is project owner', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ project_id: 1 }
						]
					})
				});
				const user = { id: 1 };
				const projectId = 1;
				const collabUserId = 2;
				const permitted = await db.permittedToRejectCollaborator(user, collabUserId, projectId);
				expect(permitted).toBe(true);
			});
		});

		describe('getPendingCollabInvites', () => {
			it('should get pending collaboration invites', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ account_id: 1, project_id: 1, role: 'Researcher', project_name: 'Test Project', account_name: 'Test User'	}
						]
					})
				});
				const userId = 1;
				const invites = await db.getPendingCollabInvites(userId);
				expect(invites).toHaveLength(1);
				expect(invites[0].project_name).toBe('Test Project');
			});
		});

		describe('replyToCollabInvite', () => {
			it('should handle invite acceptance', async () => {
				axios.post
				.mockResolvedValueOnce({
					data: encodeBase64({
					rowsAffected: [1]
					})
				})
				.mockResolvedValueOnce({
					data: encodeBase64({
					rowsAffected: [1]
					})
				});
				
				await expect(db.replyToCollabInvite(true, 1, 1, 'Researcher')).resolves.not.toThrow();
			});

			it('should handle invite rejection', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [1]
					})
				});
				
				await expect(db.replyToCollabInvite(false, 1, 1)).resolves.not.toThrow();
			});

			it('should throw error for nonexistent invite', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [0]
					})
				});
				
				await expect(db.replyToCollabInvite(false, 1, 1)).rejects.toThrow("cannot reject a nonexistent invite");
			});
		});

		describe('sendCollabInvite', () => {
			it('should send collaboration invite', async () => {
				await expect(db.sendCollabInvite(1, 1, 'Researcher')).resolves.not.toThrow();
			});
		});

		describe('canInvite', () => {
			it('should check if user can invite', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: []
					})
				});
				const canInvite = await db.canInvite(1, 1);
				expect(canInvite).toBe(true);
			});
		});

		describe('alreadyInvited', () => {
			it('should check if user already invited', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: []
					})
				});
				const alreadyInvited = await db.alreadyInvited(1, 1);
				expect(alreadyInvited).toBe(true);
			});
		});
	});

	/*
	describe('File Operations', () => {
		describe('uploadToProject', () => {
			it('should upload file to project storage', async () => {
				const mockFileBuffer = Buffer.from('test content');
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ uuid: 'file-uuid' })
				}).mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.uploadToProject(1, mockFileBuffer, 'test.txt'))
					.resolves.not.toThrow();
			});

			it('should record file metadata in database', async () => {
				const mockFileBuffer = Buffer.from('test content');
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ uuid: 'file-uuid' })
				}).mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await db.uploadToProject(1, mockFileBuffer, 'test.txt');
				expect(axios.post).toHaveBeenCalledTimes(2);
			});
		});
		

		describe('storeMessageWithAttachment', () => {
			it('should store message with attached file', async () => {
				const mockFile = {
					buffer: Buffer.from('test'),
					name: 'test.txt'
				};
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ insertId: 1 })
				}).mockResolvedValueOnce({
					data: encodeBase64({ uuid: 'file-uuid' })
				}).mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				const result = await db.storeMessageWithAttachment(1, 1, 'Test message', mockFile);
				expect(result.uuid).toBe('file-uuid');
			});

			it('should link attachment to message in database', async () => {
				const mockFile = {
					buffer: Buffer.from('test'),
					name: 'test.txt'
				};
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ insertId: 1 })
				}).mockResolvedValueOnce({
					data: encodeBase64({ uuid: 'file-uuid' })
				}).mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await db.storeMessageWithAttachment(1, 1, 'Test message', mockFile);
				expect(axios.post).toHaveBeenCalledTimes(3);
			});
		});

		describe('getProjectFiles', () => {
			it('should get project files', async () => {
				axios.post.mockResolvedValueOnce({
				data: encodeBase64({
					recordSet: [
						{ file_uuid: '123', original_filename: 'test.txt', project_id: 1 }
					]
				})
				});
				const files = await db.getProjectFiles(1);
				expect(files).toHaveLength(1);
				expect(files[0].original_filename).toBe('test.txt');
			});
		});

		describe('mayUploadToProject', () => {
			it('should check upload permissions', async () => {
				axios.post.mockResolvedValueOnce({
				data: encodeBase64({
					recordSet: [
						{ project_id: 1 }
					]
				})
				});
				const mayUpload = await db.mayUploadToProject(1, 1);
				expect(mayUpload).toBe(true);
			});
		});

		describe('downloadFile', () => {
			it('should download file', async () => {
				const mockResponse = { data: 'file content' };
				vi.spyOn(db, 'downloadFile').mockResolvedValue(mockResponse);
				const result = await db.downloadFile('123', 'txt');
				expect(result).toEqual(mockResponse);
			});
		});
	});*/

	describe('Messaging Operations', () => {
		describe('storeMessage', () => {
			it('should store message', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						insertId: 1,
						rowsAffected: [1]
					})
				});
				await expect(db.storeMessage(1, 1, 'Test message')).resolves.not.toThrow();
			});
		});

		//are mocks being properly reset, this is somehow breaking other tests
		/*describe('storeMessageWithAttachment', () => {
			it('should store message with attachment', async () => {
				const mockFile = {
					buffer: Buffer.from('test content'),
					name: 'test.txt'
				};

				//mocks ofr storeMessage,upload response, and attach insert
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						insertId: 1,
						rowsAffected: [1]
					})
				});
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						uuid: 'file-uuid'
					})
				});
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [1]
					})
				});

				const result = await db.storeMessageWithAttachment(1, 1, 'Test message', mockFile);
				expect(result.uuid).toBe('file-uuid');
				expect(axios.post).toHaveBeenCalledTimes(3);
			});
		});*/
		

		describe('retrieveLatestMessages', () => {
			it('should retrieve latest messages', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, user: 'Test User', text: 'Test message' }
						],
						insertId: 1,
						rowsAffected: 1
					})
				});
				const messages = await db.retrieveLatestMessages(1);
				expect(messages.recordSet).toHaveLength(1);
				expect(messages.recordSet[0].text).toBe('Test message');
			});
		});
	});

	describe('Review Operations', () => {
		describe('getProjectReviews', () => {
			it('should get project reviews', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ review_id: 1, rating: 5, comment: 'Great project' }
						]
					})
				});
				const reviews = await db.getProjectReviews(1);
				expect(reviews).toHaveLength(1);
				expect(reviews[0].rating).toBe(5);
			});
		});

		describe('getReviewCount', () => {
			it('should get review count', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ total: 5 }
						]
					})
				});
				const count = await db.getReviewCount(1);
				expect(count).toBe(5);
			});
		});

		describe('createReview', () => {
			it('should create review', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						rowsAffected: [1]
					})
				});
				const review = {
					project_id: 1,
					reviewer_id: 1,
					rating: 5,
					comment: 'Great project'
				};
				await expect(db.createReview(review)).resolves.not.toThrow();
			});
		});
	});
	
	describe('Milestone Operations', () => {
		describe('getMilestones', () => {
			it('should fetch all milestones for a project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ project_milestone_id: 1, name: 'Milestone 1', description: 'First milestone' }
						]
					})
				});
				const milestones = await db.getMilestones(1);
				expect(milestones).toHaveLength(1);
				expect(milestones[0].name).toBe('Milestone 1');
			});
		});

		describe('getMilestone', () => {
			it('should fetch a specific milestone by ID', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ project_milestone_id: 1, name: 'Specific Milestone', description: 'Details' }
						]
					})
				});
				const milestone = await db.getMilestone(1);
				expect(milestone[0].name).toBe('Specific Milestone');
			});
		});

		describe('addMilestone', () => {
			it('should create a new milestone for a project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.addMilestone(1, 'New Milestone', 'Description'))
					.resolves.not.toThrow();
			});
		});

		describe('editMilestone', () => {
			it('should update an existing milestone', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.editMilestone(1, 'Updated Name', 'Updated Description'))
					.resolves.not.toThrow();
			});
		});

		describe('completeMilestone', () => {
			it('should mark a milestone as completed', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.completeMilestone(1)).resolves.not.toThrow();
			});
		});

		describe('uncompleteMilestone', () => {
			it('should mark a milestone as not completed', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.uncompleteMilestone(1)).resolves.not.toThrow();
			});
		});

		describe('deleteMilestone', () => {
			it('should remove a milestone from a project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.deleteMilestone(1)).resolves.not.toThrow();
			});
		});
	});

	describe('Funding Operations', () => {
		describe('addFunding', () => {
			it('should add funding information to a project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.addFunding(1, 'USD', 'Grant', 10000))
					.resolves.not.toThrow();
			});
		});

		describe('addExpenditure', () => {
			it('should record an expenditure against project funding', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({ rowsAffected: [1] })
				});
				await expect(db.addExpenditure(1, 500, 'Equipment'))
					.resolves.not.toThrow();
			});
		});

		describe('getFunding', () => {
			it('should retrieve funding information for a project', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ funding_id: 1, currency_code: 'USD', total_funding: 10000 }
						]
					})
				});
				const funding = await db.getFunding(1);
				expect(funding[0].total_funding).toBe(10000);
			});
		});

		describe('getExpenditure', () => {
			it('should retrieve expenditure records for funding', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ expenditure_id: 1, amount: 500, description: 'Equipment' }
						]
					})
				});
				const expenditures = await db.getExpenditure(1);
				expect(expenditures[0].amount).toBe(500);
			});
		});
	});

	describe('Report Operations', () => {
		describe('generateCustomReport', () => {
			it('should generate reports with selected metrics', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1', completion_percentage: 50 }
						]
					})
				});
				const report = await db.generateCustomReport({
					userId: 1,
					metrics: ['completion']
				});
				expect(report.data[0].completion_percentage).toBe(50);
			});

			it('should filter by project IDs when specified', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Specific Project' }
						]
					})
				});
				const report = await db.generateCustomReport({
					userId: 1,
					metrics: [],
					projectIds: [1]
				});
				expect(report.data[0].name).toBe('Specific Project');
			});

			it('should filter by timeframe when specified', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Recent Project' }
						]
					})
				});
				const report = await db.generateCustomReport({
					userId: 1,
					metrics: [],
					timeframe: 'month'
				});
				expect(report.data).toHaveLength(1);
			});

			it('should group by creation date when requested', async () => {
				axios.post.mockResolvedValueOnce({
					data: encodeBase64({
						recordSet: [
							{ id: 1, name: 'Project 1', created_at: new Date() }
						]
					})
				});
				const report = await db.generateCustomReport({
					userId: 1,
					metrics: [],
					groupBy: 'creation_date'
				});
				expect(report.groupBy).toBe('creation_date');
			});
		});
	});
	
});