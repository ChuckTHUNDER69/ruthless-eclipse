import { recordBookEvent, type BookEventHandlerMap } from 'utils-book';
import { stateBet, stateBetDerived } from 'state-shared';
import { waitForTimeout } from 'utils-shared/wait';

import { eventEmitter } from './eventEmitter';
import { stateGame, type CeremonyTier } from './stateGame.svelte';
import { getWinLevelDataByMultiple } from './winLevelMap';
import { planStages, cellsForWin, type TransformStage } from './transforms';
import { coreChimeName, landSoundName, type SoundEffectName } from './sound';
import config from './config';
import {
	WIN_LINE_STEP_MS,
	NO_WIN_MS,
	FS_INTRO_MS,
	FS_OUTRO_MS,
	LAND_STAGGER_MS,
	LAND_DROP_MS,
	PIP_STAGGER_MS,
	CORE_BEAT_MS,
	SURGE_FLIP_MS,
	SURGE_SETTLE_MS,
	FRACTURE_CRACK_MS,
	FRACTURE_SETTLE_MS,
	ECHO_TRAVEL_MS,
	ECHO_SOLIDIFY_MS,
	ECLIPSE_PULSE_MS,
	ECLIPSE_STAGE_SCALE,
	SWEEP_MS,
	CEREMONY_MS,
	ROUND_CAP_BOOK_UNITS,
	INITIAL_BOARD,
} from './constants';
import type { BookEvent, BookEventOfType, BookEventContext } from './typesBookEvent';

// ---------------------------------------------------------------------------
// Round-scoped module state. playBet (utils.ts) calls beginRound() before
// the events play; the snapshot handler rebuilds the same state from the
// events that precede a resume point.
// ---------------------------------------------------------------------------
let roundModeKey: keyof typeof config.betModes = 'base';
let roundHasBonus = false;

export const beginRound = ({
	modeKey,
	bookEvents,
}: {
	modeKey?: string;
	bookEvents: BookEvent[];
}) => {
	roundModeKey = (
		modeKey && modeKey.toLowerCase() in config.betModes ? modeKey.toLowerCase() : 'base'
	) as keyof typeof config.betModes;
	roundHasBonus = bookEvents.some((bookEvent) => bookEvent.type === 'bonusStart');
	stateGame.roundWinTotal = 0;
	stateGame.currentWins = [];
	stateGame.currentSpinWin = 0;
	stateGame.currentSpinRawWin = 0;
	stateGame.highlightedCells = [];
	stateGame.changedCells = [];
	stateGame.fsWinTotal = 0;
	stateGame.fsSpinsPlayed = 0;
	stateGame.fsActive = false;
	stateGame.fsFeature = null;
	stateGame.skipRequested = false;
	stateGame.winVisible = false;
	stateGame.introVisible = false;
	stateGame.outroVisible = false;
	// phase 2b choreography state
	stateGame.spinStartedAt = 0;
	stateGame.pipsRevealed = 6;
	stateGame.revealActive = false;
	stateGame.transformKind = null;
	stateGame.stageStartedAt = 0;
	stateGame.stageDurationMs = 0;
	stateGame.floodReels = [];
	stateGame.streaks = [];
	stateGame.crackCells = [];
	stateGame.insertedCells = [];
	stateGame.flareCount = 0;
	stateGame.listedWins = 0;
	stateGame.ceremonyTier = 'none';
	stateGame.ceremonyDurationMs = 0;
	stateGame.sweepActive = false;
};

const roundCost = () => config.betModes[roundModeKey].cost;

// Playback pacing (ANIMATION_SPEC): turbo compresses every budget x0.45,
// autoplay x0.8. Waits poll in small slices so a stop press lands within
// ~40ms instead of after the full duration — the stop/skip flag is the
// timer fuse that, together with these bounded waits, guarantees an
// awaited presentation can never wedge a round: component animations
// are purely cosmetic rAF derivations and are never awaited.
const pace = () => (stateBet.isTurbo ? 0.45 : stateBetDerived.hasAutoBetCounter() ? 0.8 : 1);

const wait = async (ms: number) => {
	let remaining = ms * pace();
	while (remaining > 0) {
		if (stateGame.skipRequested) return;
		const slice = Math.min(remaining, 40);
		await waitForTimeout(slice);
		remaining -= slice;
	}
};

const recordIfBonus = (bookEvent: BookEvent) => {
	if (roundHasBonus) recordBookEvent({ bookEvent });
};

const soundOnce = (name: SoundEffectName) => eventEmitter.broadcast({ type: 'soundOnce', name });

// ---------------------------------------------------------------------------
// Transformation set pieces. Each runner leaves stateGame.board equal to
// the stage's board even when skipped mid-flight; the spin handler snaps
// to the book's authoritative `board` after the final stage.
// ---------------------------------------------------------------------------
const setStageClock = (totalMs: number) => {
	stateGame.stageStartedAt = performance.now();
	stateGame.stageDurationMs = totalMs * pace();
};

const runSurgeStage = async (stage: TransformStage, scale: number) => {
	stateGame.transformKind = 'surge';
	stateGame.floodReels = stage.floodReels;
	const floodSet = new Set(stage.floodReels);
	const rows = Math.max(0, ...stage.floodReels.map((reel) => stage.board[reel].length));
	setStageClock(rows * SURGE_FLIP_MS * scale + SURGE_SETTLE_MS * scale);
	if (stage.floodReels.length > 0) soundOnce('sfx_surge');

	let current = stateGame.board;
	for (let row = 0; row < rows; row++) {
		await wait(SURGE_FLIP_MS * scale);
		current = current.map((column, reel) =>
			floodSet.has(reel)
				? column.map((symbol, r) => (r === row ? stage.board[reel][r] : symbol))
				: column,
		);
		stateGame.board = current;
		stateGame.changedCells = stage.changed.filter((key) => Number(key.split('-')[1]) <= row);
	}
	await wait(SURGE_SETTLE_MS * scale);
	stateGame.board = stage.board;
	stateGame.changedCells = stage.changed;
	stateGame.floodReels = [];
};

const runEchoStage = async (stage: TransformStage, scale: number) => {
	stateGame.transformKind = 'echo';
	const empty = stage.streaks.length === 0;
	setStageClock((ECHO_TRAVEL_MS + ECHO_SOLIDIFY_MS) * scale * (empty ? 0.5 : 1));
	stateGame.streaks = stage.streaks;
	if (!empty) soundOnce('sfx_echo');
	await wait(ECHO_TRAVEL_MS * scale * (empty ? 0.5 : 1));
	stateGame.board = stage.board;
	stateGame.changedCells = stage.changed;
	await wait(ECHO_SOLIDIFY_MS * scale * (empty ? 0.5 : 1));
	stateGame.streaks = [];
};

const runFractureStage = async (stage: TransformStage, scale: number) => {
	stateGame.transformKind = 'fracture';
	setStageClock((FRACTURE_CRACK_MS + FRACTURE_SETTLE_MS) * scale);
	stateGame.crackCells = stage.splitCells;
	if (stage.splitCells.length > 0) soundOnce('sfx_fracture');
	await wait(FRACTURE_CRACK_MS * scale);
	stateGame.board = stage.board;
	stateGame.crackCells = [];
	stateGame.changedCells = stage.changed;
	stateGame.insertedCells = stage.insertedCells;
	await wait(FRACTURE_SETTLE_MS * scale);
	stateGame.insertedCells = [];
};

const runStage = (stage: TransformStage, scale: number) =>
	stage.kind === 'surge'
		? runSurgeStage(stage, scale)
		: stage.kind === 'echo'
			? runEchoStage(stage, scale)
			: runFractureStage(stage, scale);

const coronaPulse = async () => {
	stateGame.coronaPulseId += 1;
	stateGame.coronaPulseAt = performance.now();
	soundOnce('sfx_eclipse');
	await wait(ECLIPSE_PULSE_MS);
};

// ---------------------------------------------------------------------------
// Win ceremonies (ANIMATION_SPEC tiers, x total round cost):
//   <3x readout only · 3-15x board sweep · 15-50x BIG roll-up + ember
//   storm · 50x+ MEGA corona flare · round-cap MAX. Overlay ceremonies
//   are skippable on press (the Win overlay's press layer and the stop
//   button both set skipRequested) and hard-capped by their duration —
//   the tick loop below is bounded by the same clock it presents.
// ---------------------------------------------------------------------------
export const ceremonyTierFor = (amount: number, multiple: number): CeremonyTier =>
	amount >= ROUND_CAP_BOOK_UNITS
		? 'cap'
		: multiple >= 50
			? 'mega'
			: multiple >= 15
				? 'big'
				: multiple >= 3
					? 'sweep'
					: 'none';

const presentCeremony = async ({ amount, multiple }: { amount: number; multiple: number }) => {
	const tier = ceremonyTierFor(amount, multiple);
	if (tier === 'none' || amount <= 0) return;

	if (tier === 'sweep') {
		stateGame.ceremonyTier = 'sweep';
		stateGame.sweepStartedAt = performance.now();
		stateGame.sweepActive = true;
		soundOnce('sfx_win_small');
		await wait(SWEEP_MS);
		stateGame.sweepActive = false;
		stateGame.ceremonyTier = 'none';
		return;
	}

	const durationMs = CEREMONY_MS[tier] * pace();
	stateGame.ceremonyTier = tier;
	stateGame.ceremonyDurationMs = durationMs;
	stateGame.winAmount = amount;
	stateGame.winText =
		tier === 'cap'
			? 'MAX WIN'
			: tier === 'mega'
				? (getWinLevelDataByMultiple(multiple).text ?? 'MEGA WIN')
				: 'BIG WIN';
	stateGame.winVisible = true;
	// A press that fast-forwarded the spins must not eat the ceremony:
	// it starts un-skipped, and only a fresh press during it snaps.
	stateGame.skipRequested = false;
	soundOnce(tier === 'big' ? 'sfx_win_big' : 'sfx_win_mega');
	eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_bigwin_coinloop' });

	const startedAt = performance.now();
	let tickInterval = 130;
	let nextTickAt = 0;
	while (performance.now() - startedAt < durationMs) {
		if (stateGame.skipRequested) break;
		const elapsed = performance.now() - startedAt;
		if (elapsed >= nextTickAt) {
			eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_tick', forcePlay: true });
			nextTickAt = elapsed + tickInterval;
			tickInterval = Math.max(42, tickInterval * 0.86);
		}
		await waitForTimeout(30);
	}
	eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_bigwin_coinloop' });
	stateGame.winVisible = false;
	stateGame.ceremonyTier = 'none';
	stateGame.ceremonyDurationMs = 0;
};

export const bookEventHandlerMap: BookEventHandlerMap<BookEvent, BookEventContext> = {
	spin: async (bookEvent: BookEventOfType<'spin'>) => {
		recordIfBonus(bookEvent);
		const inFeature = stateGame.fsActive;
		if (inFeature) stateGame.fsSpinsPlayed += 1;

		// Clear the previous spin's presentation NOW, at spin start —
		// never leave a stale win list / highlights on a new board
		// (V2 fix B).
		stateGame.currentWins = [];
		stateGame.currentSpinWin = 0;
		stateGame.currentSpinRawWin = 0;
		stateGame.highlightedCells = [];
		stateGame.changedCells = [];
		stateGame.flareCount = 0;
		stateGame.listedWins = 0;
		stateGame.modifier = null;
		stateGame.transformKind = null;
		stateGame.streaks = [];
		stateGame.crackCells = [];
		stateGame.insertedCells = [];

		// 1. The draw lands: `before` board drops in, columns resolving
		// left -> right with a per-reel stagger; each column's land is
		// sounded as it settles (the Board derives drop offsets from
		// spinStartedAt on its own rAF clock — cosmetic only).
		stateGame.board = bookEvent.before;
		stateGame.cores = bookEvent.cores;
		stateGame.pipsRevealed = 0;
		stateGame.spinStartedAt = performance.now();
		stateGame.spinning = true;
		await wait(LAND_DROP_MS);
		for (let reel = 0; reel < bookEvent.before.length; reel++) {
			soundOnce(landSoundName(reel));
			if (reel < bookEvent.before.length - 1) await wait(LAND_STAGGER_MS);
		}
		stateGame.spinning = false;

		// 2. Core reveal — the suspense beat. Pips sweep in reel order;
		// each lit pip flares and chimes at a pitch rising with the lit
		// count, so the player hears the reaction tier before it fires.
		stateGame.revealActive = true;
		let litCount = 0;
		for (let reel = 0; reel < bookEvent.cores.length; reel++) {
			stateGame.pipsRevealed = reel + 1;
			if (bookEvent.cores[reel] > 0) {
				litCount += 1;
				soundOnce(coreChimeName(litCount));
			}
			await wait(PIP_STAGGER_MS);
		}
		stateGame.revealActive = false;
		await wait(CORE_BEAT_MS);

		// 3. The core reaction: authored set pieces per stage. With no
		// modifier the final board is simply the drawn board.
		if (bookEvent.modifier) {
			stateGame.modifier = bookEvent.modifier;
			stateGame.showModifierBanner = true;
			const stages = planStages(bookEvent.before, bookEvent.modifier);
			const scale = bookEvent.modifier === 'eclipse' ? ECLIPSE_STAGE_SCALE : 1;
			for (let i = 0; i < stages.length; i++) {
				if (bookEvent.modifier === 'eclipse' && i > 0) await coronaPulse();
				await runStage(stages[i], scale);
			}
			// the book is the settle authority, whatever the stages did
			stateGame.board = bookEvent.board;
			stateGame.transformKind = null;
			stateGame.floodReels = [];
			stateGame.streaks = [];
			stateGame.showModifierBanner = false;
		} else {
			stateGame.board = bookEvent.board;
		}

		// 4. Ways pass: lines flare highest-value first while the list
		// prints in book order; both complete together, then the full
		// list persists until the next spin starts (V2 fix B).
		stateGame.currentWins = bookEvent.wins;
		stateGame.currentSpinWin = bookEvent.win;
		stateGame.currentSpinRawWin = bookEvent.rawWin;
		stateGame.roundWinTotal += bookEvent.win;
		if (inFeature) stateGame.fsWinTotal += bookEvent.win;
		stateBet.winBookEventAmount = stateGame.roundWinTotal;
		if (bookEvent.wins.length > 0) {
			if (bookEvent.win > 0) soundOnce('sfx_win_small');
			const byValue = [...bookEvent.wins].sort((a, b) => b.amount - a.amount);
			const flared = new Set<string>();
			for (let k = 0; k < byValue.length; k++) {
				for (const key of cellsForWin(bookEvent.board, byValue[k])) flared.add(key);
				stateGame.highlightedCells = [...flared];
				stateGame.flareCount = k + 1;
				stateGame.listedWins = k + 1;
				if (k < byValue.length - 1) await wait(WIN_LINE_STEP_MS);
			}
			await wait(150);
		} else {
			await wait(NO_WIN_MS);
		}
		stateGame.highlightedCells = [];
		stateGame.changedCells = [];
		stateGame.flareCount = 0;
	},

	bonusStart: async (bookEvent: BookEventOfType<'bonusStart'>) => {
		recordIfBonus(bookEvent);
		stateGame.fsActive = true;
		stateGame.fsFeature = bookEvent.feature;
		stateGame.fsTotalSpins = bookEvent.spins;
		stateGame.fsSpinsPlayed = 0;
		stateGame.fsWinTotal = 0;
		stateGame.gameType = 'freeSpins';
		stateGame.currentWins = [];
		stateGame.highlightedCells = [];

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_intro' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_freespin' });
		eventEmitter.broadcast({ type: 'uiHide' });
		stateGame.introVisible = true;
		await wait(FS_INTRO_MS);
		stateGame.introVisible = false;
		stateGame.inputLockUntil = performance.now() + 700;
		eventEmitter.broadcast({ type: 'uiShow' });
	},

	bonusEnd: async (bookEvent: BookEventOfType<'bonusEnd'>) => {
		recordIfBonus(bookEvent);
		const featureTotal = stateGame.fsWinTotal;
		stateGame.fsActive = false;
		stateGame.gameType = 'basegame';

		eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_fs_end' });
		eventEmitter.broadcast({ type: 'soundMusic', name: 'bgm_main' });
		eventEmitter.broadcast({ type: 'uiHide' });
		stateGame.outroVisible = true;
		await wait(FS_OUTRO_MS);
		stateGame.outroVisible = false;
		stateGame.inputLockUntil = performance.now() + 700;
		eventEmitter.broadcast({ type: 'uiShow' });

		// The outro panel is the feature's own ceremony; a feature total
		// in the BIG/MEGA/cap tiers earns the full overlay ceremony too.
		const multiple = featureTotal / (100 * roundCost());
		const tier = ceremonyTierFor(featureTotal, multiple);
		if (tier === 'big' || tier === 'mega' || tier === 'cap') {
			await presentCeremony({ amount: featureTotal, multiple });
		}

		// V5: reset the resting board — the final feature board (a
		// Fracture-grown board can stand 8 rows high) must not linger
		// as the base-game idle board once the feature closes.
		stateGame.board = INITIAL_BOARD.map((column) => [...column]);
		stateGame.changedCells = [];
		stateGame.highlightedCells = [];
	},

	finalWin: async (bookEvent: BookEventOfType<'finalWin'>) => {
		// The book is authoritative: snap the displayed total to its amount.
		stateBet.winBookEventAmount = bookEvent.amount;
		stateGame.roundWinTotal = bookEvent.amount;
		stateGame.currentWins = [];
		stateGame.highlightedCells = [];
		stateGame.showModifierBanner = false;

		if (!roundHasBonus && bookEvent.amount > 0) {
			const multiple = bookEvent.amount / (100 * roundCost());
			await presentCeremony({ amount: bookEvent.amount, multiple });
		}
	},

	// Resume: rebuild feature/counter/total state from the events that
	// precede the resume point, then the remaining events play normally.
	createBonusSnapshot: async (bookEvent: BookEventOfType<'createBonusSnapshot'>) => {
		const { bookEvents } = bookEvent;
		const spins = bookEvents.filter(
			(event): event is BookEventOfType<'spin'> => event.type === 'spin',
		);
		const lastSpin = spins[spins.length - 1];
		if (lastSpin) {
			stateGame.board = lastSpin.board;
			stateGame.cores = lastSpin.cores;
		}
		stateGame.roundWinTotal = spins.reduce((sum, event) => sum + event.win, 0);
		stateBet.winBookEventAmount = stateGame.roundWinTotal;
		// choreography settles: a resumed board renders at rest
		stateGame.spinStartedAt = 0;
		stateGame.pipsRevealed = 6;
		stateGame.revealActive = false;
		stateGame.transformKind = null;
		stateGame.streaks = [];
		stateGame.crackCells = [];
		stateGame.insertedCells = [];
		stateGame.sweepActive = false;
		stateGame.ceremonyTier = 'none';

		const bonusStartIndex = bookEvents.findLastIndex((event) => event.type === 'bonusStart');
		if (bonusStartIndex >= 0) {
			const bonusStart = bookEvents[bonusStartIndex] as BookEventOfType<'bonusStart'>;
			const fsSpins = bookEvents
				.slice(bonusStartIndex + 1)
				.filter((event): event is BookEventOfType<'spin'> => event.type === 'spin');
			stateGame.fsActive = true;
			stateGame.fsFeature = bonusStart.feature;
			stateGame.fsTotalSpins = bonusStart.spins;
			stateGame.fsSpinsPlayed = fsSpins.length;
			stateGame.fsWinTotal = fsSpins.reduce((sum, event) => sum + event.win, 0);
			stateGame.gameType = 'freeSpins';
		}
	},
};
