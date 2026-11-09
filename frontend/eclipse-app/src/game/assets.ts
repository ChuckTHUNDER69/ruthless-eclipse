// Production asset set (2026-11-08 art integration): the painted game
// atlas (symbols, cores, medallions, dial, FX, plates) plus the scene
// singles. Atlas frames register under the TEXTURE_KEYS names in
// game/constants.ts; single 'sprite' entries register under their entry
// key here (bg_base / wordmark). The feature background is NOT a separate
// asset: Background.svelte derives it from bg_base + the fx_corona_ring
// overlay, per the inventory's key note.
export default {
	gameAtlas: {
		type: 'sprites',
		src: new URL('../../assets/sprites/game/game.json', import.meta.url).href,
		preload: true,
	},
	bg_base: {
		type: 'sprite',
		src: new URL('../../assets/sprites/scene/bg_base.webp', import.meta.url).href,
		preload: true,
	},
	wordmark: {
		type: 'sprite',
		src: new URL('../../assets/sprites/scene/wordmark.webp', import.meta.url).href,
		preload: true,
	},
	sound: {
		type: 'audio',
		src: new URL('../../assets/audio/sounds.json', import.meta.url).href,
		preload: true,
	},
} as const;
