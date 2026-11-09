import type { BetType } from 'rgs-requests';

import type { Modifier, WaysWin } from './types';

// Ruthless Eclipse book schema (math_v2) — NOT the Vaultbreak/SDK sample
// event vocabulary. A book is { id, events, payoutMultiplier } and the
// events are only these four types. All amounts are book units
// (BOOK_AMOUNT_MULTIPLIER = 100 -> 100 = 1x base bet), the SDK standard.

type BookEventSpin = {
	index: number;
	type: 'spin';
	/** the board as drawn, before any core reaction */
	before: number[][];
	/** the board after the modifier transformation (=== before when null) */
	board: number[][];
	/** lit eclipse cores, one per reel (0/1) */
	cores: number[];
	modifier: Modifier | null;
	wins: WaysWin[];
	/** this spin's win after the round cap */
	win: number;
	/** this spin's win before the round cap */
	rawWin: number;
};

type BookEventBonusStart = {
	index: number;
	type: 'bonusStart';
	feature: Modifier;
	/** NB: the books call this `spins` (the prototype brief said spinsAwarded) */
	spins: number;
};

type BookEventBonusEnd = {
	index: number;
	type: 'bonusEnd';
};

type BookEventFinalWin = {
	index: number;
	type: 'finalWin';
	amount: number;
};

// customised (resume support, same pattern as Vaultbreak)
type BookEventCreateBonusSnapshot = {
	index: number;
	type: 'createBonusSnapshot';
	bookEvents: BookEvent[];
};

export type BookEvent =
	| BookEventSpin
	| BookEventBonusStart
	| BookEventBonusEnd
	| BookEventFinalWin
	| BookEventCreateBonusSnapshot;

export type Bet = BetType<BookEvent>;
export type BookEventOfType<T> = Extract<BookEvent, { type: T }>;
export type BookEventContext = { bookEvents: BookEvent[] };
