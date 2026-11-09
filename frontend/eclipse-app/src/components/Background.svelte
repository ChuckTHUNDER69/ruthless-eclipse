<script lang="ts">
	import { onMount } from 'svelte';

	import { Rectangle, Sprite } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import {
		TEXTURE_KEYS,
		BANNER_HEIGHT,
		HEADER_HEIGHT,
		BOARD_BLOCK_HEIGHT,
	} from '../game/constants';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const mainLayout = $derived(context.stateLayoutDerived.mainLayout());

	// Production backdrop: the painted celestial-forge scene, cover-fit
	// to the canvas. The free-spins variant is DERIVED (inventory key
	// note): the same scene with the eclipse corona ring closed over it,
	// additive and breathing — no separate bg_feature asset exists.
	const inFeature = $derived(context.stateGame.gameType === 'freeSpins');

	// cover-fit the 2048x1152 scene (crop overflow, never stretch)
	const cover = $derived.by(() => {
		const scale = Math.max(canvas.width / 2048, canvas.height / 1152);
		return { width: 2048 * scale, height: 1152 * scale };
	});

	// corona breathing: a component-level $state primitive on rAF
	// (the V46 lesson — never a field on objects inside a $state array)
	let pulse = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			pulse = 0.5 + 0.5 * Math.sin(t / 900);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});

	const coronaSize = $derived(Math.min(canvas.width, canvas.height) * 0.92);

	// Wordmark placement (V2 fix D): the wordmark used to sit at a fixed
	// canvas-top slot (y=16, up to 440×220) while the board block is
	// stage-centred — in landscape the core pips landed inside the
	// wordmark's lower half and obscured its letters. Now the wordmark
	// is sized from the board's own layout math: the main stage is
	// centred and scaled by mainLayout.scale, so the pips row's top
	// edge in canvas space is computable exactly, and the wordmark
	// (riding behind the eclipse halo at the top centre) is capped to
	// end above it at every aspect — landscape, portrait and stacked.
	const boardTopCanvas = $derived(canvas.height / 2 - (BOARD_BLOCK_HEIGHT / 2) * mainLayout.scale);
	const pipsTopCanvas = $derived(
		boardTopCanvas + (BANNER_HEIGHT + HEADER_HEIGHT) * mainLayout.scale,
	);
	const wordmarkWidth = $derived(
		Math.min(460, canvas.width * 0.42, Math.max(0, pipsTopCanvas - 11) * 2),
	);
	const wordmarkHeight = $derived(wordmarkWidth / 2);
	const showWordmark = $derived(wordmarkHeight >= 30);
</script>

<Rectangle {...canvas} backgroundColor={0x090d19} />
<Sprite
	key={TEXTURE_KEYS.backgroundBase}
	x={canvas.width / 2}
	y={canvas.height / 2}
	anchor={0.5}
	width={cover.width}
	height={cover.height}
/>
{#if inFeature}
	<Sprite
		key={TEXTURE_KEYS.fx.coronaRing}
		x={canvas.width / 2}
		y={canvas.height * 0.36}
		anchor={0.5}
		width={coronaSize}
		height={coronaSize}
		blendMode="add"
		alpha={0.35 + pulse * 0.25}
	/>
{/if}
{#if showWordmark}
	<!-- the eclipse halo the wordmark rides on -->
	<Sprite
		key={TEXTURE_KEYS.fx.coronaRing}
		x={canvas.width / 2}
		y={6 + wordmarkHeight / 2}
		anchor={0.5}
		width={wordmarkWidth * 1.35}
		height={wordmarkWidth * 1.35}
		blendMode="add"
		alpha={0.16 + pulse * 0.07}
	/>
	<Sprite
		key={TEXTURE_KEYS.wordmark}
		x={canvas.width / 2}
		y={6}
		anchor={{ x: 0.5, y: 0 }}
		width={wordmarkWidth}
		height={wordmarkHeight}
	/>
{/if}
