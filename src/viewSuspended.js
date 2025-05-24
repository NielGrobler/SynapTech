
import pageAdder from './pageAdder.js';

const fetchUsers = async () => {
	try {
		const res = await fetch(`/suspended/user`);

		if (!res.ok) {
			throw new Error('Failed to fetch users');
		}

		const users = await res.json();

        pageAdder.addUsersToPage('suspendedUserList', users);
	} catch (error) {
		console.error('Error fetching users:', error);
	};
};

fetchUsers();

