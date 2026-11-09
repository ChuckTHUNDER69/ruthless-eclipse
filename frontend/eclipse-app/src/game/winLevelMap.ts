import { SECOND } from 'constants-shared/time';

// Win presentation levels. Eclipse books carry no winLevel field (unlike
// Vaultbreak's), so the level is derived in the handler map from the
// payout multiple of the round's total cost. Thresholds are multiples
// of total cost (bet x mode cost).
export const winLevelMap = {
	1: { level: 1, alias: 'zero', type: 'small', text: null, presentDuration: 0 },
	2: { level: 2, alias: 'standard', type: 'small', text: null, presentDuration: 0.6 * SECOND },
	3: { level: 3, alias: 'small', type: 'small', text: null, presentDuration: 1 * SECOND },
	4: { level: 4, alias: 'nice', type: 'medium', text: null, presentDuration: 1.5 * SECOND },
	5: { level: 5, alias: 'substantial', type: 'medium', text: null, presentDuration: 2.0 * SECOND },
	6: { level: 6, alias: 'big', type: 'big', text: 'BIG WIN', presentDuration: 4 * SECOND },
	7: { level: 7, alias: 'superwin', type: 'big', text: 'SUPER WIN', presentDuration: 6 * SECOND },
	8: { level: 8, alias: 'mega', type: 'big', text: 'MEGA WIN', presentDuration: 8 * SECOND },
	9: { level: 9, alias: 'epic', type: 'big', text: 'EPIC WIN!', presentDuration: 10 * SECOND },
	10: { level: 10, alias: 'max', type: 'big', text: 'MAX WIN', presentDuration: 12 * SECOND },
} as const;

export type WinLevelMap = typeof winLevelMap;
export type WinLevel = keyof typeof winLevelMap;
export type WinLevelData = WinLevelMap[WinLevel];
export type WinLevelAlias = WinLevelData['alias'];

const THRESHOLDS: { level: WinLevel; minMultiple: number }[] = [
	{ level: 10, minMultiple: 1000 },
	{ level: 9, minMultiple: 500 },
	{ level: 8, minMultiple: 250 },
	{ level: 7, minMultiple: 100 },
	{ level: 6, minMultiple: 50 },
	{ level: 5, minMultiple: 25 },
	{ level: 4, minMultiple: 15 },
	{ level: 3, minMultiple: 5 },
	{ level: 2, minMultiple: 1 },
];

export const getWinLevelDataByMultiple = (multiple: number): WinLevelData => {
	const found = THRESHOLDS.find((entry) => multiple >= entry.minMultiple);
	return winLevelMap[found ? found.level : 1];
};
