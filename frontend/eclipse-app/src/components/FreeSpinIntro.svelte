<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY, MODIFIER_INFO, TEXTURE_KEYS, coreLitKey, FS_INTRO_MS } from '../game/constants';

	const context = getContext();
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const show = $derived(context.stateGame.introVisible);
	const info = $derived(
		context.stateGame.fsFeature ? MODIFIER_INFO[context.stateGame.fsFeature] : null,
	);
	const medallionKey = $derived(
		context.stateGame.fsFeature ? TEXTURE_KEYS.medallions[context.stateGame.fsFeature] : null,
	);

	// Intro choreography clock (component-level $state, rAF — cosmetic
	// only; the handler's FS_INTRO_MS wait owns the lifetime). The
	// medallion slams in with a back-out overshoot folded into
	// width/height, and the spin count lights up as core orbs, one per
	// awarded spin, across the intro.
	let nowMs = $state(0);
	let shownAt = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			nowMs = t;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});
	$effect(() => {
		if (show && !shownAt) shownAt = performance.now();
		if (!show) shownAt = 0;
	});
	const elapsed = $derived(show && shownAt ? nowMs - shownAt : 0);
	const slamP = $derived(Math.min(1, Math.max(0, elapsed / 460)));
	const backOut = (p: number) => {
		const c = 1.70158;
		return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
	};
	const medallionSize = $derived(104 * (0.4 + 0.6 * backOut(slamP)));
	const orbsLit = $derived(
		Math.min(
			context.stateGame.fsTotalSpins,
			Math.floor((elapsed / FS_INTRO_MS) * context.stateGame.fsTotalSpins * 1.25),
		),
	);
	const orbRowWidth = $derived(context.stateGame.fsTotalSpins * 30);
</script>

{#if show && info}
	<Rectangle width={main.width} height={main.height} backgroundColor={0x05080f} backgroundAlpha={0.82} />
	<Container x={main.width / 2} y={main.height / 2}>
		<Sprite key={TEXTURE_KEYS.plateWide} x={-300} y={-120} width={600} height={240} />
		{#if medallionKey}
			<Sprite
				key={TEXTURE_KEYS.fx.coronaRing}
				y={-58}
				anchor={0.5}
				width={150}
				height={150}
				blendMode="add"
				alpha={0.8}
			/>
			<Sprite key={medallionKey} y={-58} anchor={0.5} width={medallionSize} height={medallionSize} />
		{/if}
		<Text
			y={16}
			anchor={0.5}
			text={`${info.title} AWAKENED`}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 40, fontWeight: '900', letterSpacing: 4, fill: info.color }}
		/>
		<Text
			y={58}
			anchor={0.5}
			text={`${context.stateGame.fsTotalSpins} FREE SPINS`}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 26, fontWeight: '700', letterSpacing: 3, fill: 0xfff6dd }}
		/>
		<!-- the awarded spins as core orbs, lighting in sequence -->
		{#each Array(context.stateGame.fsTotalSpins) as _, i}
			<Sprite
				key={i < orbsLit ? coreLitKey(i) : TEXTURE_KEYS.coreUnlit}
				x={-orbRowWidth / 2 + i * 30 + 11}
				y={88}
				width={22}
				height={22}
			/>
		{/each}
	</Container>
{/if}
