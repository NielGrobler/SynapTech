const validationRules = {
	projectName: {
		pattern: /^[\w\s-]{3,50}$/, //NOTE, THIS MISMATCHES DB REGEX (NO NUMBERS)
		messages: {
			empty: 'Project name is required',
			invalid: 'Name must be 3-50 characters (letters, numbers, spaces, hyphens)' 
		}
	},
	description: {
		pattern: /^[\w\s.,!?-]{10,500}$/, //confirm length restrictions
		messages: {
			empty: 'Description is required',
			invalid: 'Description must be 10-500 characters'
		}
	},
	field: {
		pattern: /^[A-Za-z\s-]{3,30}$/,
		messages: {
			empty: 'Field of study is required',
			invalid: 'Field must be 3-30 letters and spaces'
		}
	}
};

let form, submitBtn;
let inputs = {};
let errorDisplays = {};

const initForm = () => { 
	//had to redo this away from functions into constant for code base consistency
	form = document.getElementById('project-form');
	if (!form) return;

	submitBtn = document.getElementById('submit-btn');

	inputs = {
		projectName: document.getElementById('project-name'),
		description: document.getElementById('project-description'),
		field: document.getElementById('project-field')
	};

	errorDisplays.projectName = document.getElementById('name-error');
	errorDisplays.description = document.getElementById('desc-error');
	errorDisplays.field = document.getElementById('field-error');
	//errorDisplays.form: document.getElementById('form-errors') //decided against a 'global' indicator. add <output id="form-errors" class="error-messages" style="display: none;"></output> back to the html if you need it

	if (inputs.projectName) { inputs.projectName.addEventListener('input', () => validateField('projectName'));	}
	if (inputs.description) { inputs.description.addEventListener('input', () => validateField('description'));	}
	if (inputs.field) {	inputs.field.addEventListener('input', () => validateField('field'));}
	if (form) {	form.addEventListener('submit', handleSubmit); }
}

const validateField = (field) => {
	const value = inputs[field].value.trim();
	const rules = validationRules[field];
	
	if (!value) {
		showError(field, rules.messages.empty);
		return false;
	}
	
	if (!rules.pattern.test(value)) {
		showError(field, rules.messages.invalid);
		return false;
	}
	
	clearError(field);
	return true;
}

const showError = (field, message) => {
	inputs[field].classList.add('invalid');
	inputs[field].classList.remove('valid');
	errorDisplays[field].textContent = message;
	errorDisplays[field].style.display = 'block';
}

const clearError = (field) => {
	inputs[field].classList.remove('invalid');
	inputs[field].classList.add('valid');
	errorDisplays[field].style.display = 'none';
}

const validateForm = () => {
	let isValid = true;
	Object.keys(inputs).forEach(field => {
		if (!validateField(field)) isValid = false;
	});
	//would be too much hassle to implement a disabled button look, but would communicate errors better
	return isValid;
}

const handleSubmit = async (e) => {
	e.preventDefault();
	
	if (!validateForm()) {
		return;
	}
	
	
	try {
		submitBtn.disabled = true; //to avoid double click situations. it should instantly load but you never know
		submitBtn.textContent = 'Creating...';
		if(form){
			form.submit(); //sends this to the router so that it properly works
		}
	} catch (error) {
		console.error(error);
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = 'Create Project';
	}
}

document.addEventListener('DOMContentLoaded', initForm);

export {
	validateField,
	showError,
	clearError,
	validateForm,
	handleSubmit,
	initForm
};