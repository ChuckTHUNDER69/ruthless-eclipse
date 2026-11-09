import type config from './config';

export type BetMode = keyof typeof config.betModes;
export type GameType = 'basegame' | 'freeSpins';

// Eclipse symbols are numeric ids in the books: 0-5 paying, 6 wild.
export type SymbolId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Modifier = 'surge' | 'fracture' | 'echo' | 'eclipse';
export type Feature = Modifier;

export type WaysWin = {
	symbol: SymbolId;
	length: number; // consecutive reels from the left (3-6)
	ways: number;
	amount: number; // book units: 100 = 1x base bet
};

export type Position = {
	reel: number;
	row: number;
};
