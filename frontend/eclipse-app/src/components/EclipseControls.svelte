<script lang="ts">
	// EclipseControls — Ruthless Eclipse's floating control layer.
	// Adapted from Vaultbreak's VaultControls (same SDK wiring contracts:
	// 'bet' / 'stopButtonClick' emitter events, bet stepping over
	// stateConfig.betAmountOptions, buy menu via the buyBonus modal),
	// rendered with the production painted plates + spin dial
	// (TEXTURE_KEYS.plateWide / dial in game/constants.ts). No boxed
	// control deck; readouts float on the scene.
	import { Tween } from 'svelte/motion';
	import { onMount } from 'svelte';
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { Button } from 'components-pixi';
	import { OnHotkey } from 'components-shared';
	import {
		stateBet,
		stateBetDerived,
		stateConfig,
		stateMeta,
		stateModal,
		stateSound,
	} from 'state-shared';
	import { numberToCurrencyString, bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import config from '../game/config';
	import { DISPLAY_FONT_FAMILY, TEXTURE_KEYS } from '../game/constants';

	const context = getContext();
	const canvas = $derived(context.stateLayoutDerived.canvasSizes());
	const stacked = $derived(context.stateLayoutDerived.isStacked());

	// ---------- readouts ----------
	const balanceTween = new Tween(stateBet.balanceAmount);
	const winTween = new Tween(stateBet.winBookEventAmount);
	$effect(() => {
		balanceTween.set(stateBet.balanceAmount);
	});
	$effect(() => {
		winTween.set(stateBet.winBookEventAmount);
	});
	const balanceText = $derived(numberToCurrencyString(balanceTween.current));
	const winText = $derived(bookEventAmountToCurrencyString(winTween.current));
	const betText = $derived(numberToCurrencyString(stateBet.betAmount));

	// ---------- spin / stop ----------
	let stopDisabled = $state(false);
	context.eventEmitter.subscribeOnMount({
		stopButtonClick: () => (stopDisabled = true),
		stopButtonEnable: () => (stopDisabled = false),
	});
	const isIdle = $derived(context.stateXstateDerived.isIdle());
	// V4 click-through shield: while a feature intro/outro card is up —
	// and for a beat after it hides — the dial must not take a press.
	// The v3 playtest's CONTINUE click dismissed the outro and the same
	// gesture fired a $1 base spin on the dial underneath.
	const theatreUp = $derived(context.stateGame.introVisible || context.stateGame.outroVisible);
	const spinDisabled = $derived(
		(isIdle && !stateBetDerived.isBetCostAvailable()) || theatreUp,
	);
	const dialLabel = $derived(isIdle ? 'SPIN' : 'STOP');
	const autoCount = $derived(stateBetDerived.hasAutoBetCounter() ? stateBet.autoSpinsCounter : 0);

	// The dial really rotates while a round plays (bible §4): a
	// component-level $state primitive advanced on rAF, holding its
	// angle when idle.
	let dialRotation = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		let last = performance.now();
		const loop = (now: number) => {
			if (dead) return;
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			if (!context.stateXstateDerived.isIdle()) dialRotation += dt * 2.4;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});

	const onDialPress = () => {
		if (theatreUp || performance.now() < context.stateGame.inputLockUntil) return;
		context.eventEmitter.broadcast({ type: 'soundPressBet' });
		if (context.stateXstateDerived.isIdle()) {
			if (stateBetDerived.activeBetMode()?.type === 'buy') stateBet.activeBetModeKey = 'BASE';
			context.eventEmitter.broadcast({ type: 'bet' });
		} else if (!stopDisabled) {
			if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
			// Eclipse playback waits poll this flag and cut short
			context.stateGame.skipRequested = true;
			context.eventEmitter.broadcast({ type: 'stopButtonClick' });
		}
	};

	// ---------- bet steppers ----------
	const smallest = $derived(stateConfig.betAmountOptions[0]);
	const biggest = $derived(stateConfig.betAmountOptions[stateConfig.betAmountOptions.length - 1]);
	const stepBet = (dir: 1 | -1) => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		const options = [...stateConfig.betAmountOptions].sort((a, b) => a - b);
		const next =
			dir === 1
				? options.find((option) => option > stateBet.betAmount)
				: [...options].reverse().find((option) => option < stateBet.betAmount);
		if (next !== undefined) stateBet.betAmount = next;
	};

	// ---------- buy / auto / turbo / sound / modals ----------
	const openBuy = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateModal.modal = { name: 'buyBonus' };
	};
	const openAuto = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		if (stateBetDerived.hasAutoBetCounter()) stateBet.autoSpinsCounter = 0;
		else stateModal.modal = { name: 'autoSpin' };
	};
	const toggleTurbo = () => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true });
	};
	const toggleSound = () => {
		stateSound.volumeValueMaster = stateSound.volumeValueMaster === 0 ? 50 : 0;
	};

	// PAYS shows per-way amounts at the player's CURRENT bet; the modal
	// content is static meta text, so refresh it from config on open.
	const refreshPaytableTexts = () => {
		const section = stateMeta.gameRuleMeta.payTable.find((s) => s.title === 'PAYTABLE');
		if (!section) return;
		const bet = stateBet.betAmount;
		const fmt = (mult: number) => numberToCurrencyString(mult * bet);
		for (const container of section.containers) {
			if (container.title === 'WAYS WINS') {
				container.text = `Amounts are per way for your current bet of ${numberToCurrencyString(bet)}, for 3 · 4 · 5 · 6 of a kind on consecutive reels from the left. The matching counts on each reel multiply into the number of ways.`;
				continue;
			}
			const match = /assets\/rules\/(\w+)\.webp/.exec(container.image ?? '');
			if (!match) continue;
			const symbol = config.symbols[match[1].toUpperCase() as keyof typeof config.symbols];
			if (!('paytable' in symbol) || !symbol.paytable) continue;
			const table = symbol.paytable as unknown as Array<Record<string, number>>;
			const payAt = (count: number) =>
				table.find((entry) => entry[String(count)] !== undefined)?.[String(count)] ?? 0;
			container.text = `Per way — 3: ${fmt(payAt(3))} · 4: ${fmt(payAt(4))} · 5: ${fmt(payAt(5))} · 6: ${fmt(payAt(6))}`;
		}
	};
	const openModal = (name: 'gameRules' | 'payTable') => {
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		refreshPaytableTexts();
		stateModal.modal = { name };
	};

	// ---------- layout ----------
	const H = $derived(canvas.height);
	const W = $derived(canvas.width);
	const dialSize = $derived(stacked ? 132 : 176);
	const dialX = $derived(stacked ? W - 84 : W - 108);
	const dialY = $derived(stacked ? H - 84 : H - 106);
	const plateW = $derived(stacked ? 220 : 300);
	const plateH = $derived(64);
</script>

{#snippet readout(x: number, y: number, label: string, value: string, anchorX?: number)}
	<Text
		{x}
		{y}
		anchor={{ x: anchorX ?? 0, y: 1 }}
		text={label}
		style={{ fontFamily: 'proxima-nova', fontSize: 12, fontWeight: '700', letterSpacing: 2, fill: 0xeac98a }}
	/>
	<Text
		{x}
		y={y + 4}
		anchor={{ x: anchorX ?? 0, y: 0 }}
		text={value}
		style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 21, fontWeight: '700', fill: 0xfff6dd }}
	/>
{/snippet}

{#snippet plateButton(
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	sub: string,
	onpress: () => void,
	disabled: boolean,
	sub2?: string,
)}
	<Button {x} {y} sizes={{ width: w, height: h }} {onpress} {disabled}>
		{#snippet children({ hovered, pressed })}
			{@const f = pressed ? 0.97 : hovered ? 1.02 : 1}
			<Sprite
				key={TEXTURE_KEYS.plateWide}
				x={-((w * f - w) / 2)}
				y={-((h * f - h) / 2)}
				width={w * f}
				height={h * f}
				alpha={disabled ? 0.5 : 1}
			/>
			<Text
				x={w / 2}
				y={sub2 ? h / 2 - 15 : sub ? h / 2 - 11 : h / 2}
				anchor={0.5}
				text={label}
				style={{ fontFamily: 'proxima-nova', fontSize: sub2 ? 15 : 16, fontWeight: '800', letterSpacing: 1, fill: 0xffe9a8 }}
			/>
			{#if sub}
				<Text
					x={w / 2}
					y={sub2 ? h / 2 + 3 : h / 2 + 12}
					anchor={0.5}
					text={sub}
					style={{ fontFamily: 'proxima-nova', fontSize: sub2 ? 10 : 11, fontWeight: '600', letterSpacing: sub2 ? 0 : 1, fill: 0xd8c491 }}
				/>
			{/if}
			{#if sub2}
				<Text
					x={w / 2}
					y={h / 2 + 16}
					anchor={0.5}
					text={sub2}
					style={{ fontFamily: 'proxima-nova', fontSize: 10, fontWeight: '600', fill: 0xd8c491 }}
				/>
			{/if}
		{/snippet}
	</Button>
{/snippet}

{#snippet miniButton(
	x: number,
	y: number,
	label: string,
	onpress: () => void,
	active?: boolean,
	disabled?: boolean,
)}
	<Button {x} {y} sizes={{ width: 74, height: 40 }} {onpress} disabled={disabled ?? false}>
		{#snippet children({ hovered, pressed })}
			{@const f = pressed ? 0.96 : hovered ? 1.03 : 1}
			<Sprite
				key={TEXTURE_KEYS.plateWide}
				x={-((74 * f - 74) / 2)}
				y={-((40 * f - 40) / 2)}
				width={74 * f}
				height={40 * f}
				alpha={disabled ? 0.5 : 1}
				tint={active ? 0x9fe8dc : 0xffffff}
			/>
			<Text
				x={37}
				y={20}
				anchor={0.5}
				text={label}
				style={{
					fontFamily: 'proxima-nova',
					fontSize: 12,
					fontWeight: '800',
					letterSpacing: 1,
					fill: active ? 0x78eee4 : 0xffe9a8,
				}}
			/>
		{/snippet}
	</Button>
{/snippet}

<!-- Space bar = the bet button (Stake frontend requirement); mirrors the
     dial and stays out of the way while any modal is open. -->
<OnHotkey hotkey="Space" disabled={stateModal.modal !== null} onpress={onDialPress} />

<!-- (the painted wordmark rides the Background scene, top centre) -->

<!-- top-right utility plates -->
<Container x={W - 26 - 74 * 3 - 16} y={16}>
	{@render miniButton(0, 0, stateSound.volumeValueMaster === 0 ? 'SOUND ✕' : 'SOUND', toggleSound)}
	{@render miniButton(82, 0, 'RULES', () => openModal('gameRules'))}
	{@render miniButton(164, 0, 'PAYS', () => openModal('payTable'))}
</Container>

<!-- feature plate (left). The buy-cost sub-label runs on TWO lines
     (V2 fix C): the full one-line string is ~52 glyphs and clipped its
     final "×" against both plate widths (300 landscape / 220 stacked);
     split at the midpoint each line is ~26 glyphs ≈ 150px at 10px,
     which fits the 220px stacked plate with ~35px margin per side. -->
{@render plateButton(
	26,
	H - (stacked ? 190 : 150),
	plateW,
	plateH,
	'ENTER THE FORGE',
	'SURGE 75× · FRACTURE 100×',
	openBuy,
	!isIdle,
	'ECHO 150× · ECLIPSE 300×',
)}

<!-- floating readouts -->
{#if stacked}
	{@render readout(26, H - 128, 'BALANCE', balanceText)}
	{@render readout(26, H - 74, 'WIN', winText)}
	{@render readout(dialX - dialSize / 2 - 118, H - 128, 'BET', betText)}
{:else}
	{@render readout(W * 0.345, H - 62, 'BALANCE', balanceText)}
	{@render readout(W * 0.475, H - 62, 'WIN', winText)}
	{@render readout(W * 0.648, H - 62, 'BET', betText, 0.5)}
{/if}

<!-- bet steppers flanking the BET readout -->
{#if !stacked}
	<Button
		x={W * 0.648 - 92}
		y={H - 58}
		sizes={{ width: 46, height: 40 }}
		disabled={!isIdle || stateBet.betAmount === smallest}
		onpress={() => stepBet(-1)}
	>
		{#snippet children({ pressed })}
			<Sprite key={TEXTURE_KEYS.plateWide} width={46} height={40} alpha={pressed ? 0.8 : 1} />
			<Text x={23} y={20} anchor={0.5} text="−" style={{ fontSize: 22, fontWeight: '800', fill: 0xffe9a8 }} />
		{/snippet}
	</Button>
	<Button
		x={W * 0.648 + 46}
		y={H - 58}
		sizes={{ width: 46, height: 40 }}
		disabled={!isIdle || stateBet.betAmount === biggest}
		onpress={() => stepBet(1)}
	>
		{#snippet children({ pressed })}
			<Sprite key={TEXTURE_KEYS.plateWide} width={46} height={40} alpha={pressed ? 0.8 : 1} />
			<Text x={23} y={20} anchor={0.5} text="+" style={{ fontSize: 22, fontWeight: '800', fill: 0xffe9a8 }} />
		{/snippet}
	</Button>
{/if}

<!-- auto / turbo mini plates near the dial -->
<Container x={dialX - dialSize / 2} y={dialY - dialSize / 2 - 52}>
	{@render miniButton(0, 0, autoCount > 0 ? `AUTO ${autoCount}` : 'AUTO', openAuto, autoCount > 0)}
	{@render miniButton(82, 0, 'TURBO', toggleTurbo, stateBet.isTurbo)}
</Container>

<!-- the dial: SPIN / STOP (placeholder disc) -->
<Button
	x={dialX - dialSize / 2}
	y={dialY - dialSize / 2}
	sizes={{ width: dialSize, height: dialSize }}
	disabled={spinDisabled}
	onpress={onDialPress}
>
	{#snippet children({ hovered, pressed })}
		{@const f = pressed ? 0.95 : hovered ? 1.03 : 1}
		<!-- the painted bronze dial (empty stone centre takes the label);
		     hover/press fold into width/height, rotation is real -->
		<Sprite
			key={TEXTURE_KEYS.dial}
			x={dialSize / 2}
			y={dialSize / 2}
			anchor={0.5}
			width={dialSize * f}
			height={dialSize * f}
			rotation={dialRotation}
			alpha={spinDisabled ? 0.55 : 1}
		/>
		<Text
			x={dialSize / 2}
			y={dialSize / 2 - (autoCount > 0 && !isIdle ? 10 : 0)}
			anchor={0.5}
			text={dialLabel}
			style={{ fontFamily: 'proxima-nova', fontSize: 29, fontWeight: '800', letterSpacing: 2, fill: 0xf2e0bb }}
		/>
		{#if autoCount > 0 && !isIdle}
			<Text
				x={dialSize / 2}
				y={dialSize / 2 + 18}
				anchor={0.5}
				text={`${autoCount} LEFT`}
				style={{ fontFamily: 'proxima-nova', fontSize: 13, fontWeight: '700', fill: 0xf2e0bb }}
			/>
		{/if}
	{/snippet}
</Button>
