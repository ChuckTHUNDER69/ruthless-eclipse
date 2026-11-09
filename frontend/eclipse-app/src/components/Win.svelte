<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicIn } from 'svelte/easing';
	import { onMount } from 'svelte';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY, TEXTURE_KEYS } from '../game/constants';

	const context = getContext();
	const main = $derived(context.stateLayoutDerived.mainLayout());
	const show = $derived(context.stateGame.winVisible);
	const tier = $derived(context.stateGame.ceremonyTier);

	// Ceremony clock: rAF-driven $state primitives (the V46 lesson).
	// `pulse` breathes the art; `progress` runs the roll-up window the
	// handler opened (ceremonyDurationMs) — cosmetic only, the handler's
	// bounded loop owns the ceremony's actual lifetime.
	let pulse = $state(0);
	let nowMs = $state(0);
	let shownAt = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			pulse = 0.5 + 0.5 * Math.sin(t / 240);
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
	const progress = $derived.by(() => {
		const duration = context.stateGame.ceremonyDurationMs;
		if (!show || !shownAt || !duration) return 0;
		return Math.min(1, Math.max(0, (nowMs - shownAt) / duration));
	});

	// Count-up over the book amount, accelerating with the handler's
	// tick loop (cubicIn). The final frame always lands on the exact
	// book amount, so the display reconciles to the cent; a skip press
	// snaps straight to it.
	const amountTween = new Tween(0, { duration: 1200, easing: cubicIn });
	$effect(() => {
		if (show) {
			amountTween.set(0, { duration: 0 });
			amountTween.set(context.stateGame.winAmount, {
				duration: Math.max(300, context.stateGame.ceremonyDurationMs),
				easing: cubicIn,
			});
		}
	});
	$effect(() => {
		if (show && context.stateGame.skipRequested) {
			amountTween.set(context.stateGame.winAmount, { duration: 0 });
		}
	});
	const amountText = $derived(bookEventAmountToCurrencyString(Math.round(amountTween.current)));

	// Ember storm (BIG and up): a field of ember puffs rising past the
	// amount. Positions are pure functions of (index, clock) — nothing
	// is stored per-particle, so nothing can wedge or leak.
	const EMBERS = 16;
	const emberAt = (i: number) => {
		const phase = i / EMBERS;
		const rise = (nowMs * 0.055 + phase * 460) % 460;
		return {
			x: Math.sin(nowMs / 340 + i * 2.39) * (90 + phase * 190),
			y: 190 - rise,
			size: 44 + phase * 60,
			alpha: Math.sin((rise / 460) * Math.PI) * 0.5,
		};
	};

	const skip = () => {
		context.stateGame.skipRequested = true;
	};
</script>

{#if show}
	<Rectangle width={main.width} height={main.height} backgroundColor={0x05080f} backgroundAlpha={0.72} />
	<Container x={main.width / 2} y={main.height / 2}>
		<!-- MEGA / cap: the eclipse corona flares open behind the win -->
		{#if tier === 'mega' || tier === 'cap'}
			<Sprite
				key={TEXTURE_KEYS.fx.coronaRing}
				anchor={0.5}
				width={340 + progress * 620}
				height={340 + progress * 620}
				blendMode="add"
				alpha={0.25 + (1 - progress) * 0.55}
			/>
			<!-- screen-edge glow -->
			{#each [[-main.width / 2 + 60, -main.height / 2 + 60], [main.width / 2 - 60, -main.height / 2 + 60], [-main.width / 2 + 60, main.height / 2 - 60], [main.width / 2 - 60, main.height / 2 - 60]] as [ex, ey]}
				<Sprite
					key={TEXTURE_KEYS.fx.lightBurst}
					x={ex}
					y={ey}
					anchor={0.5}
					width={280}
					height={280}
					blendMode="add"
					alpha={0.12 + pulse * 0.08}
				/>
			{/each}
		{/if}
		<!-- cap: the eclipse itself, full-screen corona -->
		{#if tier === 'cap'}
			<Sprite
				key={TEXTURE_KEYS.fx.coronaRing}
				anchor={0.5}
				width={Math.max(main.width, main.height) * 1.15}
				height={Math.max(main.width, main.height) * 1.15}
				blendMode="add"
				alpha={0.3 + pulse * 0.12}
			/>
		{/if}

		<Sprite
			key={TEXTURE_KEYS.fx.lightBurst}
			anchor={0.5}
			width={430 + pulse * 60}
			height={430 + pulse * 60}
			blendMode="add"
			alpha={0.5 + pulse * 0.3}
		/>

		<!-- ember storm -->
		{#each Array(EMBERS) as _, i}
			{@const ember = emberAt(i)}
			<Sprite
				key={TEXTURE_KEYS.fx.emberPuff}
				x={ember.x}
				y={ember.y}
				anchor={0.5}
				width={ember.size}
				height={ember.size}
				blendMode="add"
				alpha={ember.alpha}
			/>
		{/each}

		<!-- the ceremony plate behind the amount (art bible: plate_light) -->
		<Sprite key={TEXTURE_KEYS.plateLight} y={36} anchor={0.5} width={340} height={118} alpha={0.95} />
		<Text
			y={-52}
			anchor={0.5}
			text={context.stateGame.winText ?? 'BIG WIN'}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 64, fontWeight: '900', letterSpacing: 6, fill: 0xffe9a8 }}
		/>
		<Text
			y={36}
			anchor={0.5}
			text={amountText}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 40, fontWeight: '700', fill: 0xfff6dd }}
		/>
	</Container>

	<!-- skip layer: a press anywhere snaps the ceremony to the final
	     amount (the handler's ceremony loop polls skipRequested) -->
	<Button x={0} y={0} sizes={{ width: main.width, height: main.height }} onpress={skip}>
		{#snippet children()}
			<Sprite
				key={TEXTURE_KEYS.fx.lightBurst}
				width={main.width}
				height={main.height}
				alpha={0}
			/>
		{/snippet}
	</Button>
{/if}
