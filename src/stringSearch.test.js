import { describe, it, expect } from 'vitest';
import stringSearch from './stringSearch';

const { levDist, getComparator } = stringSearch;

describe('stringSearch.js Module Tests', () => {
	describe('levDist', () => {
		it('should return 0 for identical strings', () => {
			expect(levDist('kitten', 'kitten')).toBe(0);
		});

		it('should calculate correct distance for insertions', () => {
			expect(levDist('kitten', 'kitteny')).toBe(1);
		});

		it('should calculate correct distance for deletions', () => {
			expect(levDist('kitten', 'kitt')).toBe(2);
		});

		it('should calculate correct distance for substitutions', () => {
			expect(levDist('kitten', 'sitting')).toBe(3);
		});

		it('should handle empty strings', () => {
			expect(levDist('', '')).toBe(0);
			expect(levDist('', 'abc')).toBe(3);
			expect(levDist('abc', '')).toBe(3);
		});
	});

	describe('getComparator', () => {
		const items = [
			{ name: 'apple' },
			{ name: 'grape' },
			{ name: 'pineapple' },
			{ name: 'banana' },
		];

		it('should sort by Levenshtein distance to query', () => {
			const sorted = [...items].sort(getComparator('appl'));
			expect(sorted.map(i => i.name)).toEqual(['apple', 'grape', 'banana', 'pineapple']);
		});

		it('should break ties alphabetically', () => {
			const itemsWithSameDistance = [
				{ name: 'cat' },
				{ name: 'bat' },
				{ name: 'mat' },
			];
			const sorted = [...itemsWithSameDistance].sort(getComparator('hat'));
			expect(sorted.map(i => i.name)).toEqual(['bat', 'cat', 'mat']);
		});
	});
});