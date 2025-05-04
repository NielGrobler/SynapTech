
const constructMessage = (rawData, fromFst) => {
	return {
		"fromFst": fromFst,
		"content": rawData.content,
		"createdAt": rawData.created_at,
	};
}

const pushRemaining = (accumulated, arr, i) => {
	for (; i < arr.length; i++) {
		accumulated.push(arr[i]);
	}
}

const mergeConstruct = (fstArr, sndArr, constructor, predicate) => {
	if (!Array.isArray(fstArr) || !Array.isArray(sndArr)) {
		throw new TypeError("Both arguments must be arrays.");
	}

	let i = 0;
	let j = 0;
	let result = [];

	while (i < fstArr.length && j < sndArr.length) {
		if (predicate(fstArr[i], sndArr[j])) {
			result.push(constructor(fstArr[i++], true));
			continue;
		}

		result.push(constructor(sndArr[j++], false));
	}

	pushRemaining(result, fstArr, i);
	pushRemaining(result, sndArr, j);

	return result;
}

/* Groups objects in an array into contiguous arrays based on their category */
const groupByCategory = (arr, categoryAssigner) => {
	if (!Array.isArray(arr)) {
		throw new TypeError("First argument must be array.");
	}

	if (arr.length === 0) {
		return [];
	}

	let result = [];
	result.push([arr[0]]);
	let prevCategory = categoryAssigner(arr[0]);

	for (let i = 1; i < arr.length; i++) {
		let curCategory = categoryAssigner(arr[i]);
		if (curCategory !== prevCategory) {
			result.push([arr[i]]);
			prevCategory = curCategory;
			continue;
		}

		result.at(-1).push(arr[i]);
		prevCategory = curCategory;
	}

	return result;
}

const addClasses = (messageElement, index, containerLength, fromFst) => {
	let direction = (fromFst) ? "right" : "left";
	messageElement.classList.add(`bubble-${direction}`);
	messageElement.classList.add((index === containerLength - 1) ? `bubble-${direction}-end` : "bubble-fragment");
	if (index === containerLength - 1) {
		messageElement.classList.add(`bubble-${direction}-end`);
		messageElement.classList.add(`bubble`);
	} else {
		messageElement.classList.add(`bubble-fragment`);
	}
}

const toHTML = (message, index, containerLength) => {
	const { content, createdAt, fromFst } = message;

	const article = document.createElement('article');
	const footer = document.createElement('footer');

	const time = document.createElement('time');
	time.dateTime = createdAt;
	time.textContent = new Date(createdAt).toLocaleString();

	footer.appendChild(time);

	const paragraph = document.createElement('p');
	paragraph.textContent = content;

	article.appendChild(footer);
	article.appendChild(paragraph);
	addClasses(article, index, containerLength, fromFst);

	return article;
}

let userElements = [];
let activeUserId = null;

const unactivateActiveUser = () => {
	if (!activeUserId) {
		return false;
	}

	let activeUserElement = null;
	for (let element of userElements) {
		if (element.dataset.userId === activeUserId) {
			activeUserElement = element;
			break;
		}
	}

	if (!activeUserElement) {
		return false;
	}

	activeUserElement.classList.remove('active');
	return true;
}

const userToHTML = (user) => {
	const li = document.createElement('li');
	li.dataset.userId = user.id;

	const button = document.createElement('button');
	button.classList.add('conversation');
	button.textContent = user.name;
	button.addEventListener('click', () => {
		unactivateActiveUser();
		button.classList.add('active');
		const userId = li.dataset.userId;
		activeUserId = userId;
		setConversation(userId);
	});

	li.appendChild(button);
	return li;
}

const insertUsersIntoDocument = (users) => {
	let messagedUsersElement = document.getElementById('messagedUsers');
	if (!messagedUsersElement) {
		console.error('Messaged Users element not found in DOM');
		return;
	}

	users.forEach(user => userElements.push(userToHTML(user)));

	if (userElements.length === 0) {
		messagedUsersElement.innerHTML = "<p>Nothing to display</p>";
		return;
	}

	userElements.forEach(element => {
		messagedUsersElement.appendChild(element);
	});

	userElements[0].classList.add('activated');
	activeUserId = userElements[0].id;
}

/* Processes rawMessages and inserts them all into the document */
const insertMessagesIntoDocument = (rawMessages) => {
	console.log(rawMessages);
	const mergedMessages = mergeConstruct(rawMessages[0], rawMessages[1], constructMessage, (x, y) => x.created_at < y.created_at);
	const categorizedMessages = groupByCategory(mergedMessages, x => (x.fromFst ? 1 : 0));
	const messageElements = map(
		categorizedMessages,
		segment => (segment.map((message, index, container) => toHTML(message, index, container.length)))
	).flat();

	messageElements.forEach(element => document.getElementById('conversation').appendChild(element));
}

/* Fetch stuff */
const fetchMessages = async (userId) => {
	const rawMessages = [];
	return rawMessages;
}

const fetchMessagedUsers = async () => {
	const messagedUsers = [];
	return messagedUsers;
}

/* Stuff */

const setConversation = (userId) => {
	const conversation = document.getElementById('conversation');
	if (!conversation) {
		console.error('Conversation element not found in DOM');
		return;
	}

	if (!userId) {
		conversation.innerHTML = '<p>Nothing to display.</p>';
		return;
	}

	fetchMessages(userId)
		.then((rawMessages) => {
			conversation.innerHTML = '';
			insertMessagesIntoDocument(rawMessages);
		})
		.catch((error) => {
			console.error('Failed to fetch messages:', error);

			if (conversation) {
				conversation.innerHTML = '<p class="error">Unable to load messages.</p>';
			}
		});
}

const initMessagedUsers = () => {
	let result = null;

	fetchMessagedUsers()
		.then(users => {
			insertUsersIntoDocument(users);
			result = userElements.length > 0 ? userElements[0] : null;
		})
		.catch(error => {
			console.error('Failed to load messaged users:', error);
			const messagedUsers = document.getElementById('messagedUsers');
			if (messagedUsers) {
				messagedUsers.innerHTML = '<p>Unable to load users.</p>';
			}
		});

	return result;
}

const sendHandler = (e) => {
	e.preventDefault();
	console.log("Hello???");

	const form = document.getElementById('sendForm');

	const formData = new FormData(form);

	if (!activeUserId) {
		console.error(`Missing activated conversation's user.`);
		alert('Missing user to message');
		return;
	}

	formData.append('receivedRecipientId', activeUserId);

	// might be good to extend functionality for this eventually.
	formData.append('attachment', null);

	button.disabled = true;
	button.textContent = 'Sending...';

	fetch('/api/message/send', {
		method: 'POST',
		body: formData,
	})
		.then((res) => {
			if (!res.ok) {
				throw new Error('Request failed');
			}

			return res.json();
		})
		.then((_data) => {
			form.reset();
		})
		.catch((err) => {
			console.error('Error:', err);
		})
		.finally(() => {
			button.disabled = false;
			button.textContent = 'Submit';
		});
}

const initMessages = async () => {
	let topId = initMessagedUsers();
	setConversation(topId);
	document.getElementById("sendForm").addEventListener('submit', sendHandler);
}

export default {
	initMessages
}
