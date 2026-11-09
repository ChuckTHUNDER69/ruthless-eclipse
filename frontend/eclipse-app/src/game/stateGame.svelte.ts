import { INITIAL_BOARD, INITIAL_CORES, BOARD_SIZES } from './constants';
import type { Feature, GameType, Modifier, WaysWin } from './types';
import type { Streak } from './transforms';
import { stateLayoutDerived } from './stateLayout';

export type CeremonyTier = 'none' | 'sweep' | 'big' | 'mega' | 'cap';

// Eclipse board state. Deliberately NOT the utils-slots cascading-reel
// machinery Vaultbreak uses: an Eclipse spin is a static board swap
// (before -> board) with a modifier transformation, so plain reactive
// state is the whole model. Arrays are always replaced, never mutated
// in place (Svelte 5 $state invalidation).
export const stateGame = $state({
	/** current board: 6 columns of symbol ids, column length 4-8 */
	board: INITIAL_BOARD.map((column) => [...column]) as number[][],
	/** lit cores for the current spin, one per reel */
	cores: [...INITIAL_CORES] as number[],
	/** modifier of the current spin (null = no core reaction) */
	modifier: null as Modifier | null,
	showModifierBanner: false,
	/** wins of the current spin (book order) */
	currentWins: [] as WaysWin[],
	/** current spin's paid win + raw win (book units) — the win-list footer
	 * reconciles against these; they differ only when the round cap bites */
	currentSpinWin: 0,
	currentSpinRawWin: 0,
	/** "reel-row" keys of cells taking part in any current win */
	highlightedCells: [] as string[],
	/** "reel-row" keys of cells the modifier changed (before -> board) */
	changedCells: [] as string[],
	/** placeholder roll animation in progress */
	spinning: false,
	/** set by the stop button; playback waits poll and cut short */
	skipRequested: false,
	// ------------------------------------------------------------------
	// Phase 2b choreography state. Every field is a top-level primitive
	// or a wholesale-replaced array (the V42-V45 lesson: never mutate
	// fields of objects inside a $state array — streak/fx descriptors
	// are written once per stage and only read by the render layer).
	// The handler drives flow with bounded, skip-polling waits (the
	// timer fuse); component rAF clocks only paint progress against the
	// timestamps below, so a wedged tween can never hold a round.
	/** performance.now() when the current spin's roll began (0 = settled) */
	spinStartedAt: 0,
	/** how many core pips the reveal has swept past (reel order) */
	pipsRevealed: 6,
	/** true during the core-reveal sweep (the freshest pip flares) */
	revealActive: false,
	/** modifier stage currently choreographing (null = no transform) */
	transformKind: null as 'surge' | 'echo' | 'fracture' | null,
	/** stage clock for the render layer */
	stageStartedAt: 0,
	stageDurationMs: 0,
	/** surge: reels whose columns are flooding */
	floodReels: [] as number[],
	/** echo: ghost copies in flight */
	streaks: [] as Streak[],
	/** fracture: wild cells cracking (pre-stage coords) */
	crackCells: [] as string[],
	/** fracture: duplicate wilds that just grew in (post-stage coords) */
	insertedCells: [] as string[],
	/** eclipse: corona pulse counter + clock (stage boundaries) */
	coronaPulseId: 0,
	coronaPulseAt: 0,
	/** ways pass: win lines flared / listed so far (book order for the list) */
	flareCount: 0,
	listedWins: 0,
	// round-win ceremony (finalWin / feature totals)
	ceremonyTier: 'none' as CeremonyTier,
	ceremonyDurationMs: 0,
	/** 3-15x board light sweep in progress + its clock */
	sweepActive: false,
	sweepStartedAt: 0,
	gameType: 'basegame' as GameType,
	// free-spin presentation state
	fsActive: false,
	fsFeature: null as Feature | null,
	fsTotalSpins: 0,
	fsSpinsPlayed: 0,
	fsWinTotal: 0, // book units, free spins only
	inputLockUntil: 0, // performance.now() deadline; dial ignores presses (V4 click-through fix)
	roundWinTotal: 0, // book units, every spin this round
	introVisible: false,
	outroVisible: false,
	// round-win presentation (base game / feature totals)
	winVisible: false,
	winAmount: 0, // book units
	winText: null as string | null,
});

export const cellKey = (reel: number, row: number) => `${reel}-${row}`;

const boardLayout = () => ({
	x: stateLayoutDerived.mainLayout().width * 0.5,
	y: stateLayoutDerived.mainLayout().height * 0.5,
	anchor: { x: 0.5, y: 0.5 },
	pivot: { x: BOARD_SIZES.width / 2, y: BOARD_SIZES.height / 2 },
	...BOARD_SIZES,
});

const waysCount = () => stateGame.board.reduce((total, column) => total * column.length, 1);

export const stateGameDerived = {
	boardLayout,
	waysCount,
};
