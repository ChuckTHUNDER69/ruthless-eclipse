<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { onMount } from 'svelte';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY, TEXTURE_KEYS, FS_OUTRO_MS } from '../game/constants';

	const context = getContext();
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const show = $derived(context.stateGame.outroVisible);
	const medallionKey = $derived(
		context.stateGame.fsFeature ? TEXTURE_KEYS.medallions[context.stateGame.fsFeature] : null,
	);

	// The feature total counts up across the outro (component-level
	// Tween; the final frame lands on the exact book total). V6: the
	// count completes in the first 45% of the card's life and HOLDS
	// the exact total for the rest — at 80% a mid-card read showed a
	// part-counted total ($18.40 of $34.47) that disagreed with the
	// WIN meter. A corona ring opens behind the medallion as the
	// feature closes — progress is rAF-derived and cosmetic; the
	// handler's FS_OUTRO_MS wait owns the lifetime.
	const amountTween = new Tween(0, { duration: FS_OUTRO_MS * 0.45 });
	$effect(() => {
		if (show) {
			amountTween.set(0, { duration: 0 });
			amountTween.set(context.stateGame.fsWinTotal);
		}
	});
	const amountText = $derived(bookEventAmountToCurrencyString(Math.round(amountTween.current)));

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
	const openP = $derived(
		show && shownAt ? Math.min(1, Math.max(0, (nowMs - shownAt) / FS_OUTRO_MS)) : 0,
	);
</script>

{#if show}
	<Rectangle width={main.width} height={main.height} backgroundColor={0x05080f} backgroundAlpha={0.82} />
	<Container x={main.width / 2} y={main.height / 2}>
		<Sprite key={TEXTURE_KEYS.plateWide} x={-300} y={-110} width={600} height={220} />
		{#if medallionKey}
			<!-- the corona opens as the forge completes -->
			<Sprite
				key={TEXTURE_KEYS.fx.coronaRing}
				y={-52}
				anchor={0.5}
				width={120 + openP * 130}
				height={120 + openP * 130}
				blendMode="add"
				alpha={0.75 * (1 - openP) + 0.1}
			/>
			<Sprite key={medallionKey} y={-52} anchor={0.5} width={76} height={76} />
		{/if}
		<Text
			y={6}
			anchor={0.5}
			text="FORGE COMPLETE"
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 36, fontWeight: '900', letterSpacing: 4, fill: 0xeac98a }}
		/>
		<Text
			y={52}
			anchor={0.5}
			text={`FEATURE WIN ${amountText}`}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 26, fontWeight: '700', fill: 0xfff6dd }}
		/>
	</Container>
{/if}
