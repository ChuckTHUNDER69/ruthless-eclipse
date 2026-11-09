// Ruthless Eclipse — board geometry + symbol presentation constants.
// Placeholder palette lifted from the standalone prototype (style.css),
// so the scaffold already reads in Eclipse colours; final art replaces
// the flat cells, not the layout.

export const REELS = 6;
export const ROWS = 4;
export const MAX_ROWS = 8; // fracture can grow a column to 8 positions

export const CELL_WIDTH = 118;
export const CELL_HEIGHT = 118;
export const CELL_GAP = 6;

export const BOARD_WIDTH = REELS * CELL_WIDTH + (REELS - 1) * CELL_GAP;
export const BOARD_HEIGHT = ROWS * CELL_HEIGHT + (ROWS - 1) * CELL_GAP;

// heights of the furniture stacked over the board (banner / header / pips)
export const BANNER_HEIGHT = 44;
export const HEADER_HEIGHT = 34;
export const PIPS_HEIGHT = 52;
export const WINLIST_HEIGHT = 118;
export const BOARD_BLOCK_HEIGHT =
	BANNER_HEIGHT + HEADER_HEIGHT + PIPS_HEIGHT + BOARD_HEIGHT + WINLIST_HEIGHT;

export const BOARD_SIZES = { width: BOARD_WIDTH, height: BOARD_BLOCK_HEIGHT };

export type SymbolInfo = {
	id: number;
	key: string;
	name: string;
	letter: string;
	color: number; // flat placeholder fill
};

// ids match the books: 0-5 paying symbols, 6 wild
export const SYMBOL_INFO: SymbolInfo[] = [
	{ id: 0, key: 'RUNE', name: 'Rune', letter: 'R', color: 0x79c4d2 },
	{ id: 1, key: 'COMET', name: 'Comet', letter: 'C', color: 0xa6a6e4 },
	{ id: 2, key: 'MOON', name: 'Moon', letter: 'M', color: 0x9fcedd },
	{ id: 3, key: 'CHALICE', name: 'Chalice', letter: 'H', color: 0x77cdb5 },
	{ id: 4, key: 'PHOENIX', name: 'Phoenix', letter: 'P', color: 0xdd9c68 },
	{ id: 5, key: 'CROWN', name: 'Crown', letter: 'K', color: 0xd7bc7a },
	{ id: 6, key: 'WILD', name: 'Wild', letter: 'W', color: 0xedda9e },
];

export const MODIFIER_INFO: Record<string, { title: string; color: number }> = {
	surge: { title: 'SURGE', color: 0x79c4d2 },
	fracture: { title: 'FRACTURE', color: 0xdd9c68 },
	echo: { title: 'ECHO', color: 0xa6a6e4 },
	eclipse: { title: 'ECLIPSE', color: 0xedda9e },
};

// a calm opening board (same arrangement the prototype boots with)
export const INITIAL_BOARD: number[][] = [
	[0, 1, 2, 3],
	[3, 5, 4, 0],
	[2, 6, 6, 1],
	[4, 0, 3, 2],
	[1, 2, 5, 4],
	[5, 3, 0, 1],
];

export const INITIAL_CORES: number[] = [0, 0, 0, 0, 0, 0];

// playback pacing (ms at default pace — the handler's waits apply the
// spec's pace compression on top: turbo x0.45, autoplay x0.8)
export const SPIN_ROLL_MS = 380;
export const CORE_LIGHT_MS = 300;
export const MODIFIER_BANNER_MS = 700;
export const WIN_SHOW_MS = 850;
export const NO_WIN_MS = 220;
export const FS_INTRO_MS = 1600;
export const FS_OUTRO_MS = 2200;

// ---------------------------------------------------------------------------
// Phase 2b choreography budgets (ANIMATION_SPEC.md). Stage durations are
// totalled per set piece; the handler stores the pace-scaled duration in
// stateGame.stageDurationMs so the render layer's rAF progress runs on
// exactly the clock the flow waits on.
export const LAND_STAGGER_MS = 70; // per-reel stagger, columns land left->right
export const LAND_DROP_MS = 150; // one column's drop duration
export const PIP_STAGGER_MS = 38; // core reveal: one pip per step, reel order
export const CORE_BEAT_MS = 90; // held beat after the reveal, before the reaction
export const SURGE_FLIP_MS = 75; // flood front: ms per row flipped
export const SURGE_SETTLE_MS = 220; // wash settle after the last flip
export const FRACTURE_CRACK_MS = 240; // crack flash before the split
export const FRACTURE_SETTLE_MS = 380; // growth settle after the split
export const ECHO_TRAVEL_MS = 300; // ghost streaks in flight
export const ECHO_SOLIDIFY_MS = 220; // ripple settle after targets land
export const ECLIPSE_PULSE_MS = 140; // corona pulse beat at stage boundaries
/** eclipse composition runs its stages compressed (spec total ≈1,400 ms) */
export const ECLIPSE_STAGE_SCALE = 0.72;
export const WIN_LINE_STEP_MS = 140; // ways pass: per-line flare step
export const SWEEP_MS = 750; // 3-15x board light sweep
export const CEREMONY_MS = { big: 2400, mega: 3600, cap: 4800 } as const;
/** round cap in book units: 20,000x base bet */
export const ROUND_CAP_BOOK_UNITS = 2_000_000;

// ---------------------------------------------------------------------------
// Art contract: production atlas frames (static/assets/sprites/game/,
// built by art/production/make_game_assets.py) register under exactly
// these keys. Layout math comes from the geometry constants above —
// never from art code.
export const TEXTURE_KEYS = {
	symbols: [
		'symbol_rune',
		'symbol_comet',
		'symbol_moon',
		'symbol_chalice',
		'symbol_phoenix',
		'symbol_crown',
		'symbol_wild',
	],
	// lit core colourways by reel index: 0 teal, 1 amber, 2 violet, repeat
	coreLitByReel: ['core_lit_teal', 'core_lit_amber', 'core_lit_violet'],
	coreUnlit: 'core_unlit',
	// feature medallions: buy panel cards + feature banners / FS intro
	medallions: {
		surge: 'medallion_surge',
		fracture: 'medallion_fracture',
		echo: 'medallion_echo',
		eclipse: 'medallion_eclipse',
	},
	// FX sprites ship on pure black and render with additive blending
	fx: {
		lightBurst: 'fx_light_burst',
		emberPuff: 'fx_ember_puff',
		coronaRing: 'fx_corona_ring',
	},
	// plates derived from the spin-dial plate family (painted stone +
	// bronze rim) — see art/production/INVENTORY.md key notes
	plateWide: 'plate_wide',
	plateLight: 'plate_light',
	dial: 'spin_dial',
	// single-image assets (registered under their assets.ts entry key)
	backgroundBase: 'bg_base',
	wordmark: 'wordmark',
} as const;

/**
 * Display typeface for headers, win amounts, banners and modal titles
 * (Cinzel Decorative, self-hosted woff2 — see +layout @font-face and
 * PORT_NOTES INTEGRATION). Body/rules text stays in proxima-nova.
 */
export const DISPLAY_FONT_FAMILY = 'Cinzel Decorative';

/** lit-core texture for a reel: colourway cycles teal/amber/violet */
// V4 (GPT round 1, ratified): lit pips use ONE colour for every reel —
// colour-by-reel-index read as reaction identity (a violet pip beside a
// Surge). The reaction is named by the banner; pips just say "lit".
export const coreLitKey = (_reel: number) => TEXTURE_KEYS.coreLitByReel[1];

/** animation states every symbol renderer must implement */
export type SymbolRenderState = 'idle' | 'land' | 'win' | 'transform' | 'crack';
