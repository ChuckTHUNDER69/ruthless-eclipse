<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { TEXTURE_KEYS, coreLitKey } from '../game/constants';

	// Eclipse core pip: the painted bronze socket — dark orb when unlit,
	// the reel's energy colourway when lit (reel 0 teal, 1 amber,
	// 2 violet, repeating). Phase 2b reveal contract: the board's core
	// sweep reveals pips in reel order — an unrevealed pip renders as a
	// dim socket whatever the book says, the pip the sweep has just
	// reached flares (flare), and while the core's reaction presents
	// (reacting) a light burst breathes behind the socket. All sizing
	// folds into width/height (never `scale` alongside width/height).
	type Props = {
		x: number; // centre x
		y: number; // top y
		reel: number; // colourway index
		lit: boolean; // lit AND revealed
		revealed?: boolean; // the reveal sweep has passed this reel
		flare?: boolean; // the sweep just lit this pip
		reacting?: boolean; // the lit core's reaction is presenting
		pulse?: number; // 0..1
	};

	const props: Props = $props();
	const SIZE = 38;
	const size = $derived(
		props.flare
			? SIZE * (1.14 + props.pulse * 0.06)
			: props.reacting
				? SIZE * (1 + props.pulse * 0.1)
				: SIZE,
	);
</script>

{#if props.lit && (props.reacting || props.flare)}
	<Sprite
		key={TEXTURE_KEYS.fx.lightBurst}
		x={props.x}
		y={props.y + SIZE / 2}
		anchor={0.5}
		width={SIZE * (props.flare ? 2.7 : 2.3)}
		height={SIZE * (props.flare ? 2.7 : 2.3)}
		blendMode="add"
		alpha={props.flare ? 0.55 + props.pulse * 0.3 : 0.35 + props.pulse * 0.35}
	/>
{/if}
<Sprite
	key={props.lit ? coreLitKey(props.reel) : TEXTURE_KEYS.coreUnlit}
	x={props.x - size / 2}
	y={props.y + SIZE / 2 - size / 2}
	width={size}
	height={size}
	alpha={props.revealed === false ? 0.55 : 1}
/>
