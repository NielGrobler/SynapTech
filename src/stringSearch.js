const levDist = (fst, snd) => {
	let m = fst.length;
	let n = snd.length;
	// dp[i][j] = Levenshtein(fst[:i+1], snd[:j+1])
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
				dp[i][j] = Math.min(
					dp[i - 1][j - 1],
					dp[i - 1][j] + 1,
					dp[i][j - 1] + 1
				);
			} else {
				dp[i][j] = 1 + Math.min(
					dp[i - 1][j - 1],
					dp[i - 1][j],
					dp[i][j - 1]
				);
			}
		}
	}

	return dp[m][n];
};

const getComparator = (query) => {
	const queryLower = query.toLowerCase();
	return function (x, y) {
		// Compare distances using lowercased strings
		const d1 = levDist(x.name.toLowerCase(), queryLower);
		const d2 = levDist(y.name.toLowerCase(), queryLower);

		if (d1 === d2) {
			// Tiebreak alphabetically using original casing
			return x.name.localeCompare(y.name);
		}

		return d1 - d2;
	};
};

export default {
	getComparator,
	levDist
};
