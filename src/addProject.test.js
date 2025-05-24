import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as addProject from './addProject.js';

let formSubmitMock;
let consoleErrorMock;

beforeEach(async () => {
	document.body.innerHTML = `
		<form id="project-form">
		<input type="text" id="project-name">
		<textarea id="project-description"></textarea>
		<input type="text" id="project-field">
		<button type="submit" id="submit-btn">Create Project</button>
		<output id="name-error" class="error-message"></output>
		<output id="desc-error" class="error-message"></output>
		<output id="field-error" class="error-message"></output>
		</form>
	`;

	addProject.initForm();
	formSubmitMock = vi.fn();
	document.getElementById('project-form').submit = formSubmitMock;
	consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});	
});

afterEach(() => {
  	vi.clearAllMocks();
});
	
describe('addProject.js Module Tests', () => {
	/*
	describe('initForm', () => {
		it('', () => {}); //got no idea what would be appropriate here
	});
	*/

	describe('validateField', () => {
		it('should return false for empty project name', () => {
			const nameInput = document.getElementById('project-name');
			nameInput.value = '';
			
			const isValid = addProject.validateField('projectName');
			const errorDisplay = document.getElementById('name-error');
			
			expect(isValid).toBe(false);
			expect(errorDisplay.textContent).toBe('Project name is required');
			expect(errorDisplay.style.display).toBe('block');
		});

		it('should return false for project name with invalid characters', () => {
			const nameInput = document.getElementById('project-name');
			nameInput.value = 'Invalid@Name';
			
			const isValid = addProject.validateField('projectName');
			const errorDisplay = document.getElementById('name-error');
			
			expect(isValid).toBe(false);
			expect(errorDisplay.textContent).toContain('Name must be 3-50 characters');
		});

		it('should return true for valid project name', () => {
			const nameInput = document.getElementById('project-name');
			nameInput.value = 'Valid Project 123';
			
			const isValid = addProject.validateField('projectName');
			const errorDisplay = document.getElementById('name-error');
			
			expect(isValid).toBe(true);
			expect(errorDisplay.style.display).toBe('none');
		});

		it('should return false for description that is too short', () => {
			const descInput = document.getElementById('project-description');
			descInput.value = 'Too short';
			
			const isValid = addProject.validateField('description');
			const errorDisplay = document.getElementById('desc-error');
			
			expect(isValid).toBe(false);
			expect(errorDisplay.textContent).toContain('Description must be 10-500 characters');
		});

		it('should return false for field with numbers', () => {
			const fieldInput = document.getElementById('project-field');
			fieldInput.value = 'Computer Science 101';
			
			const isValid = addProject.validateField('field');
			const errorDisplay = document.getElementById('field-error');
			
			expect(isValid).toBe(false);
			expect(errorDisplay.textContent).toContain('Field must be 3-30 letters and spaces');
		});
	});

	describe('showError', () => {
		it('should display error message for invalid field', () => {
			const nameInput = document.getElementById('project-name');
			nameInput.value = '';
			
			addProject.showError('projectName', 'Project name is required');
			
			const errorDisplay = document.getElementById('name-error');
			expect(errorDisplay.textContent).toBe('Project name is required');
			expect(errorDisplay.style.display).toBe('block');
			expect(nameInput.classList.contains('invalid')).toBe(true);
		});
	});

	describe('clearError', () => {
		it('should hide error message for valid field', () => {
			const nameInput = document.getElementById('project-name');
			
			// First show error
			addProject.showError('projectName', 'Error');
			
			// Then clear it
			addProject.clearError('projectName');
			
			const errorDisplay = document.getElementById('name-error');
			expect(errorDisplay.style.display).toBe('none');
			expect(nameInput.classList.contains('valid')).toBe(true);
		});
	});

	describe('validateForm', () => {
		it('should return false when any field is invalid', () => {
			document.getElementById('project-name').value = 'Valid Name';
			document.getElementById('project-description').value = 'Valid description';
			document.getElementById('project-field').value = ''; // Invalid
			
			const isValid = addProject.validateForm();
			expect(isValid).toBe(false);
		});

		it('should return true when all fields are valid', () => {
			document.getElementById('project-name').value = 'Valid Name';
			document.getElementById('project-description').value = 'Valid description that meets length requirements';
			document.getElementById('project-field').value = 'Valid Field';
			
			const isValid = addProject.validateForm();
			expect(isValid).toBe(true);
		});
	});

	describe('handleSubmit', () => {
		it('should prevent submission when form is invalid', async () => {
			const preventDefault = vi.fn();
			const event = { preventDefault };
			
			vi.spyOn(addProject, 'validateForm').mockReturnValue(false);
			
			await addProject.handleSubmit(event);
			
			expect(preventDefault).toHaveBeenCalled();
			expect(formSubmitMock).not.toHaveBeenCalled();
		});

		/*
		it('should disable submit button during submission', async () => {
			const preventDefault = vi.fn();
			const event = { preventDefault };
			
			vi.spyOn(addProject, 'validateForm').mockReturnValue(true);
			
			await addProject.handleSubmit(event);
			
			const submitBtn = document.getElementById('submit-btn');
			expect(submitBtn.disabled).toBe(true);
			expect(submitBtn.textContent).toBe('Creating...');
		});
		

		it('should submit form when validation passes', async () => {
			const preventDefault = vi.fn();
			const event = { preventDefault };
			
			vi.spyOn(addProject, 'validateForm').mockReturnValue(true);
			
			await addProject.handleSubmit(event);
			
			expect(formSubmitMock).toHaveBeenCalled();
		});
		*/

		it('should re-enable button after submission attempt', async () => {
			const preventDefault = vi.fn();
			const event = { preventDefault };
			
			vi.spyOn(addProject, 'validateForm').mockReturnValue(true);
			formSubmitMock.mockImplementation(() => {
				throw new Error('Submission failed');
			});
			
			await addProject.handleSubmit(event);
			
			const submitBtn = document.getElementById('submit-btn');
			expect(submitBtn.disabled).toBe(false);
			//expect(consoleErrorMock).toHaveBeenCalled();
		});
	});
});

