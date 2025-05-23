document.addEventListener('DOMContentLoaded', () => {
	const form = document.getElementById('project-form');
	const inputs = {
		projectName: document.getElementById('project-name'),
		description: document.getElementById('project-description'),
		field: document.getElementById('project-field')
	};
	const submitBtn = document.getElementById('submit-btn');

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

	const errorDisplays = {
		projectName: document.getElementById('name-error'),
		description: document.getElementById('desc-error'),
		field: document.getElementById('field-error'),
		//form: document.getElementById('form-errors') //decided against a 'global' indicator. add <output id="form-errors" class="error-messages" style="display: none;"></output> back to the html if you need it
	};

	

	function validateField(field) {
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

	function showError(field, message) {
		inputs[field].classList.add('invalid');
		inputs[field].classList.remove('valid');
		errorDisplays[field].textContent = message;
		errorDisplays[field].style.display = 'block';
	}

	function clearError(field) {
		inputs[field].classList.remove('invalid');
		inputs[field].classList.add('valid');
		errorDisplays[field].style.display = 'none';
	}

	function validateForm() {
		let isValid = true;
		Object.keys(inputs).forEach(field => {
			if (!validateField(field)) isValid = false;
		});
		//would be too much hassle to implement a disabled button look, but would communicate errors better
		return isValid;
	}

	async function handleSubmit(e) {
		e.preventDefault();
		
		if (!validateForm()) {
			//errorDisplays.form.textContent = 'Please correct the errors in the form';
			//errorDisplays.form.style.display = 'block';
			return;
		}
		
		submitBtn.disabled = true; //to avoid double click situations. it should instantly load but you never know
		submitBtn.textContent = 'Creating...';
		
		try {
			form.submit(); //sends this to the router so that it properly works
		} catch (error) {
			console.error(error);
		} finally {
			submitBtn.disabled = false;
		}
	}

	function initForm() { 
		Object.keys(inputs).forEach(field => {
			inputs[field].addEventListener('input', () => validateField(field));
		});
		
		form.addEventListener('submit', handleSubmit);
	}

	initForm();
});