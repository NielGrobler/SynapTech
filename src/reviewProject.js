import { successToast, failToast } from './toast.js';

const validationRules = {
    rating: {
        pattern: /^[1-5]$/, //idk about this one?
        messages: {
            empty: 'Rating is required',
            invalid: 'Please select a valid rating' //the chances of a user messing this up is 0, but you never know.
        }
    },
	comment: {
		pattern: /^[\w\s.,!?-]{10,500}$/, //confirm length restrictions
		messages: {
			empty: 'Comment is required',
			invalid: 'Comment must be 10-500 characters'
		}
	},
};

let form, submitBtn;
let inputs = {};
let errorDisplays = {};

//new code copied over from addProject, mismatched functionality
const initForm = () => { 
	form = document.getElementById('reviewForm');
	if (!form) return;

	submitBtn = document.getElementById('submitReviewBtn');

	inputs = {
		rating: document.getElementById('rating'),
		comment: document.getElementById('comment')
	};

	errorDisplays.rating = document.getElementById('rating-error');
	errorDisplays.comment = document.getElementById('comment-error');

	if (inputs.rating) { inputs.rating.addEventListener('change', () => validateField('rating')); }
	if (inputs.comment) { inputs.comment.addEventListener('input', () => validateField('comment'));	}
	if (submitBtn) { submitBtn.addEventListener('click', handleSubmit);	}
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
	if (inputs[field]) inputs[field].classList.add('invalid');
	if (inputs[field]) inputs[field].classList.remove('valid');
	if (errorDisplays[field]) {
		errorDisplays[field].textContent = message;
		errorDisplays[field].style.display = 'block';
	}
}

const clearError = (field) => {
	if (inputs[field]) inputs[field].classList.remove('invalid');
	if (inputs[field]) inputs[field].classList.add('valid');
	if (errorDisplays[field]) errorDisplays[field].style.display = 'none';
}

const validateForm = () => {
	let isValid = true;
	Object.keys(inputs).forEach(field => {
		if (!validateField(field)) isValid = false;
	});
	return isValid;
}

const getProjectId = () => {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get('id');
}

const handleSubmit = async (e) => {
	e.preventDefault();
	
	if (!validateForm()) {
		return;
	}
	
	const review = {
		projectId: getProjectId(),
		rating: inputs.rating.value,
		comment: inputs.comment.value.trim()
	};

	try {
		submitBtn.disabled = true;
		submitBtn.textContent = 'Submitting...';
		
		//would be simplier if this was handled by router like addProject
		const response = await fetch('/api/review', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(review),
		});

		if (!response.ok) {
			throw new Error(`Request failed with status: ${response.status}`);
		}

		const data = await response.json();
		if (data.message === 'Review submitted!') {
			window.location.href = data.redirect || '/successfulReviewPost';
		} else if (data.error) {
			alert('Error: ' + data.error); //using alert is tacky
		}
	} catch (error) {
		console.error('Error:', error);
		alert('Failed to submit review. Please try again.');
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = 'Submit Review';
	}
}

document.addEventListener('DOMContentLoaded', initForm);

export {
	validateField,
	showError,
	clearError,
	validateForm,
	getProjectId,
	handleSubmit,
	initForm
};


document.addEventListener('DOMContentLoaded', function() {
	function getProjectId() {
		const urlParams = new URLSearchParams(window.location.search);
		return urlParams.get('id');
	}

	document.getElementById('submitReviewBtn').addEventListener('click', function() {
		const review = {
			projectId: getProjectId(),
			rating: document.getElementById('rating').value,
			comment: document.getElementById('comment').value
		};

		if (!review.rating || !review.comment) {
			failToast('Please fill all required fields');
			return;
		}

		fetch('/api/review', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(review),
		})
			.then(res => {
				if (!res.ok) {
					throw new Error(`Request failed with status: ${res.status}`);
				}
				return res.json();
			})
			.then(data => {
				console.log('Server response:', data);
				if (data.message === 'Review submitted!') {
					window.location.href = data.redirect || '/successfulReviewPost';
				} else if (data.error) {
					failToast('Error: ' + data.error);
				}
			})
			.catch(err => {
				console.error('Error:', err);
				failToast('Failed to submit review. Please try again.');
			});
	});
});

