<script lang="ts">
	import { Sprite } from 'pixi-svelte';

	import { TEXTURE_KEYS, type SymbolRenderState } from '../game/constants';

	// Production symbol renderer: the painted atlas tile for the symbol,
	// with FX sprites layered on the animation states:
	//   idle      settled symbol (WILD gets a faint corona shimmer)
	//   land      ember puff at the cell foot as the column settles
	//             (alpha rides the board's landing clock via puffAlpha)
	//   win       additive light burst behind the tile
	//   transform the core reaction rewrote this cell — rim halo tinted
	//             by modifier; fracture growth adds a stone-dust puff
	//   crack     fracture pre-split: amber crack flash (the board adds
	//             a positional jitter while the state lasts)
	// The heavy choreography (surge flood wash, echo ghost streaks,
	// corona pulses) is board-level overlay art in Board.svelte; this
	// component owns only per-cell states. Geometry comes from the board
	// layout; state scaling folds into width/height (never `scale`
	// alongside width/height — pixi-svelte rule from the Vaultbreak
	// lessons). Dimming follows the spec: non-winning symbols sit at
	// 55% alpha during the ways pass.
	type Props = {
		x: number;
		y: number;
		width: number;
		height: number;
		symbol: number;
		state?: SymbolRenderState;
		modifier?: string | null;
		dimmed?: boolean;
		puffAlpha?: number; // 0..1 landing puff strength
		pulse?: number; // 0..1 animation phase
	};

	const props: Props = $props();
	const isWild = $derived(props.symbol === 6);
	const state = $derived(props.state ?? 'idle');
	const textureKey = $derived(TEXTURE_KEYS.symbols[props.symbol]);

	const pop = $derived(
		state === 'transform'
			? 1 + props.pulse * (props.modifier === 'fracture' ? 0.1 : 0.06)
			: state === 'win'
				? 1 + props.pulse * 0.03
				: 1,
	);
	const w = $derived(props.width * pop);
	const h = $derived(props.height * pop);
	const x = $derived(props.x - (w - props.width) / 2);
	const y = $derived(props.y - (h - props.height) / 2);
	const cx = $derived(props.x + props.width / 2);
	const cy = $derived(props.y + props.height / 2);

	const transformTint = $derived(
		props.modifier === 'surge'
			? 0x8ff5e6
			: props.modifier === 'fracture'
				? 0xffc07a
				: props.modifier === 'echo'
					? 0xcfa9ff
					: 0xffe9a8,
	);
</script>

<!-- win / transform light burst behind the tile. V2 fix E: the
     transform burst stays a rim halo — 1.45x and at most ~0.34 alpha —
     so the signal reads as a coloured rim + the tile swap itself, never
     a white-out over the WILD lettering. -->
{#if state === 'win' || state === 'transform'}
	<Sprite
		key={TEXTURE_KEYS.fx.lightBurst}
		x={cx}
		y={cy}
		anchor={0.5}
		width={props.width * (state === 'transform' ? 1.45 : 1.5)}
		height={props.height * (state === 'transform' ? 1.45 : 1.5)}
		blendMode="add"
		tint={state === 'transform' ? transformTint : 0xffe9a8}
		alpha={state === 'transform' ? 0.18 + props.pulse * 0.16 : 0.22 + props.pulse * 0.3}
	/>
{/if}

<!-- crack flash behind the tile (fracture pre-split) -->
{#if state === 'crack'}
	<Sprite
		key={TEXTURE_KEYS.fx.emberPuff}
		x={cx}
		y={cy}
		anchor={0.5}
		width={props.width * 1.3}
		height={props.height * 1.3}
		blendMode="add"
		tint={0xffc07a}
		alpha={0.4 + props.pulse * 0.3}
	/>
	<Sprite
		key={TEXTURE_KEYS.fx.lightBurst}
		x={cx}
		y={cy}
		anchor={0.5}
		width={props.width * 1.15}
		height={props.height * 1.15}
		blendMode="add"
		tint={0xffe9a8}
		alpha={0.25 + props.pulse * 0.2}
	/>
{/if}

<Sprite key={textureKey} {x} {y} width={w} height={h} alpha={props.dimmed ? 0.55 : 1} />

<!-- fracture growth: stone-dust puff at the foot of a rewritten cell -->
{#if state === 'transform' && props.modifier === 'fracture'}
	<Sprite
		key={TEXTURE_KEYS.fx.emberPuff}
		x={cx}
		y={props.y + props.height * 0.94}
		anchor={0.5}
		width={props.width * 1.0}
		height={props.height * 0.55}
		blendMode="add"
		tint={0xd8b28a}
		alpha={0.3}
	/>
{/if}

<!-- land: ember puff at the cell foot, strength from the landing clock -->
{#if state === 'land'}
	<Sprite
		key={TEXTURE_KEYS.fx.emberPuff}
		x={cx}
		y={props.y + props.height * 0.92}
		anchor={0.5}
		width={props.width * 0.95}
		height={props.height * 0.6}
		blendMode="add"
		alpha={0.28 * (props.puffAlpha ?? 1)}
	/>
{/if}

<!-- idle WILD: faint breathing corona shimmer -->
{#if state === 'idle' && isWild && !props.dimmed}
	<Sprite
		key={TEXTURE_KEYS.fx.lightBurst}
		x={cx}
		y={cy}
		anchor={0.5}
		width={props.width * 1.25}
		height={props.height * 1.25}
		blendMode="add"
		alpha={0.04 + props.pulse * 0.05}
	/>
{/if}
