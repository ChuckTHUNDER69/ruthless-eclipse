import { cellKey } from './stateGame.svelte';
import type { Modifier, WaysWin } from './types';

// ---------------------------------------------------------------------------
// Board transformations — a TypeScript port of the proven Python evaluator
// (~/workspace/projects/ruthless-eclipse/engine/evaluator.py, validated
// against all 200,000 catalog books / 956,980 spins). The presentation
// layer uses these ONLY to choreograph intermediate frames: the book's
// own `board` is always the authoritative settle state, and the handler
// snaps to it at the end of every spin's transformation.
//
//   surge:   every wild-bearing reel expands to exactly four wilds
//   echo:    wild positions copy to the reel on the right (last reel:
//            to the left), same row, from a snapshot — copies never chain
//   fracture: each wild gains a copy inserted immediately after it,
//            growing the column by one cell per wild
//   eclipse: surge -> echo -> fracture, in that composition order
// ---------------------------------------------------------------------------

export const WILD = 6;
const BASE_ROWS = 4;

const clone = (board: number[][]) => board.map((column) => [...column]);

export const surgeBoard = (board: number[][]): number[][] =>
	board.map((column) => (column.includes(WILD) ? Array(BASE_ROWS).fill(WILD) : [...column]));

export const echoBoard = (board: number[][]): number[][] => {
	const out = clone(board);
	const n = board.length;
	board.forEach((column, reel) => {
		const target = reel < n - 1 ? reel + 1 : reel - 1;
		column.forEach((symbol, row) => {
			if (symbol === WILD && row < out[target].length) out[target][row] = WILD;
		});
	});
	return out;
};

export const fractureBoard = (board: number[][]): number[][] =>
	board.map((column) => {
		const out: number[] = [];
		for (const symbol of column) {
			out.push(symbol);
			if (symbol === WILD) out.push(WILD);
		}
		return out;
	});

export const applyModifier = (before: number[][], modifier: Modifier): number[][] => {
	switch (modifier) {
		case 'surge':
			return surgeBoard(before);
		case 'echo':
			return echoBoard(before);
		case 'fracture':
			return fractureBoard(before);
		case 'eclipse':
			return fractureBoard(echoBoard(surgeBoard(before)));
	}
};

export type Streak = { fromReel: number; fromRow: number; toReel: number; toRow: number };

export type TransformStage = {
	kind: 'surge' | 'echo' | 'fracture';
	/** board after this stage */
	board: number[][];
	/** cells whose symbol differs from the previous stage's board */
	changed: string[];
	/** surge: reels that flood to all-wild */
	floodReels: number[];
	/** echo: ghost copies in flight (only where the target actually changes) */
	streaks: Streak[];
	/** fracture: wild cells in PRE-stage coordinates (the crack flash) */
	splitCells: string[];
	/** fracture: duplicate wilds in POST-stage coordinates (the pop-in) */
	insertedCells: string[];
};

const diffCells = (prev: number[][], next: number[][]): string[] => {
	const keys: string[] = [];
	next.forEach((column, reel) => {
		const before = prev[reel] ?? [];
		column.forEach((symbol, row) => {
			if (before[row] !== symbol) keys.push(cellKey(reel, row));
		});
	});
	return keys;
};

const surgeStage = (prev: number[][]): TransformStage => {
	const board = surgeBoard(prev);
	return {
		kind: 'surge',
		board,
		changed: diffCells(prev, board),
		floodReels: prev
			.map((column, reel) => (column.includes(WILD) ? reel : -1))
			.filter((reel) => reel >= 0),
		streaks: [],
		splitCells: [],
		insertedCells: [],
	};
};

const echoStage = (prev: number[][]): TransformStage => {
	const board = echoBoard(prev);
	const streaks: Streak[] = [];
	const n = prev.length;
	prev.forEach((column, reel) => {
		const target = reel < n - 1 ? reel + 1 : reel - 1;
		column.forEach((symbol, row) => {
			if (symbol === WILD && row < prev[target].length && prev[target][row] !== WILD) {
				streaks.push({ fromReel: reel, fromRow: row, toReel: target, toRow: row });
			}
		});
	});
	return {
		kind: 'echo',
		board,
		changed: diffCells(prev, board),
		floodReels: [],
		streaks,
		splitCells: [],
		insertedCells: [],
	};
};

const fractureStage = (prev: number[][]): TransformStage => {
	const board = fractureBoard(prev);
	const splitCells: string[] = [];
	const insertedCells: string[] = [];
	prev.forEach((column, reel) => {
		let postRow = 0;
		column.forEach((symbol, row) => {
			if (symbol === WILD) {
				splitCells.push(cellKey(reel, row));
				insertedCells.push(cellKey(reel, postRow + 1));
				postRow += 2;
			} else {
				postRow += 1;
			}
		});
	});
	return {
		kind: 'fracture',
		board,
		changed: diffCells(prev, board),
		floodReels: [],
		streaks: [],
		splitCells,
		insertedCells,
	};
};

const stageFor = (kind: TransformStage['kind'], prev: number[][]): TransformStage =>
	kind === 'surge' ? surgeStage(prev) : kind === 'echo' ? echoStage(prev) : fractureStage(prev);

/**
 * The choreographed stage plan for a spin's modifier. Single modifiers
 * produce one stage; 'eclipse' produces surge -> echo -> fracture stages
 * whose final board equals the book's `board` (the handler still snaps
 * to the book board as the settle authority).
 */
export const planStages = (before: number[][], modifier: Modifier): TransformStage[] => {
	if (modifier === 'eclipse') {
		const s1 = surgeStage(before);
		const s2 = echoStage(s1.board);
		const s3 = fractureStage(s2.board);
		return [s1, s2, s3];
	}
	return [stageFor(modifier, before)];
};

/** cells a single ways-win line touches on a board (symbol or wild, run reels only) */
export const cellsForWin = (board: number[][], win: WaysWin): string[] => {
	const keys: string[] = [];
	for (let reel = 0; reel < win.length; reel++) {
		(board[reel] ?? []).forEach((symbol, row) => {
			if (symbol === win.symbol || symbol === WILD) keys.push(cellKey(reel, row));
		});
	}
	return keys;
};
