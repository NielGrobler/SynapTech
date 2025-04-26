
import pageAdder from './pageAdder.js';

let projects = [];

let searchBox = document.getElementById('searchBox');

// Calculates Levenstein Distance
function levDist(fst, snd) {
	let m = fst.length;
	let n = snd.length;
	// dp[i][j] = levenstein(fst[: (i + 1)], snd[: (j + 1)])
	let dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
		dp[i][0] = i;
	}

	for (let j = 1; j <= n; j++) {
		dp[0][j] = j;
	}


	for (let j = 1; j <= n; j++) {
		for (let i = 1; i <= m; i++) {
			if (fst[i - 1] === snd[j - 1]) {
				dp[i][j] = Math.min(dp[i - 1][j - 1], dp[i - 1][j] + 1, dp[i][j - 1] + 1);
				continue;
			}

			dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
		}
	}

	return dp[m][n];
}

document.getElementById('searchForm').addEventListener('submit', (event) => {
	event.preventDefault();

	const query = searchBox.value.toLowerCase();
	const matchingProjects = projects.sort((x, y) => {
		let fst = x.name.toLowerCase();
		let snd = y.name.toLowerCase();
		let d1 = levDist(fst, query);
		let d2 = levDist(snd, query);
		if (d1 == d2) {
			return fst.localeCompare(snd);
		}

		return d1 - d2;
	});
	console.log(matchingProjects);
	pageAdder.clearProjects('projectCardList');
	pageAdder.addProjectsToPage('projectCardList', matchingProjects);
});

(async () => {
	try {
		const res = await fetch('/api/user/project');
		projects = await res.json();
		pageAdder.addProjectsToPage('projectCardList', projects)
		console.log(projects);
	} catch (err) {
		console.error('Error loading user:', err);
	}
})();
