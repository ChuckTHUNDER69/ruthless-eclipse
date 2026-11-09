<script lang="ts">
	import { onMount } from 'svelte';

	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { cellKey } from '../game/stateGame.svelte';
	import {
		SYMBOL_INFO,
		MODIFIER_INFO,
		TEXTURE_KEYS,
		DISPLAY_FONT_FAMILY,
		BOARD_WIDTH,
		BOARD_HEIGHT,
		BANNER_HEIGHT,
		HEADER_HEIGHT,
		PIPS_HEIGHT,
		CELL_WIDTH,
		CELL_GAP,
		LAND_STAGGER_MS,
		LAND_DROP_MS,
		SWEEP_MS,
	} from '../game/constants';
	import SymbolCell from './SymbolCell.svelte';
	import CorePip from './CorePip.svelte';

	const context = getContext();
	const layout = $derived(context.stateGameDerived.boardLayout());
	const board = $derived(context.stateGame.board);
	const highlighted = $derived(new Set(context.stateGame.highlightedCells));
	const changed = $derived(new Set(context.stateGame.changedCells));
	const crack = $derived(new Set(context.stateGame.crackCells));
	const anyHighlight = $derived(highlighted.size > 0);

	// Component-level rAF clock (the V46 lesson — $state primitives only,
	// never fields on objects inside a $state array). `pulse` drives the
	// gentle breathing effects; `nowMs` is the choreography clock every
	// staged visual derives its progress from. These paint only — the
	// handler's bounded waits own the flow, so a stalled frame can never
	// wedge a round.
	let pulse = $state(0);
	let nowMs = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			pulse = 0.5 + 0.5 * Math.sin(t / 180);
			nowMs = t;
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});

	const boardY = BANNER_HEIGHT + HEADER_HEIGHT + PIPS_HEIGHT;
	const pipsY = BANNER_HEIGHT + HEADER_HEIGHT;
	const phaseText = $derived(
		context.stateGame.fsActive
			? `${(context.stateGame.fsFeature ?? '').toUpperCase()} · SPIN ${context.stateGame.fsSpinsPlayed} OF ${context.stateGame.fsTotalSpins}`
			: 'BASE GAME',
	);
	const modifierInfo = $derived(
		context.stateGame.modifier ? MODIFIER_INFO[context.stateGame.modifier] : null,
	);

	const columnX = (reel: number) => reel * (CELL_WIDTH + CELL_GAP);
	const cellHeight = (columnLength: number) =>
		(BOARD_HEIGHT - (columnLength - 1) * CELL_GAP) / columnLength;
	const cellCentre = (reel: number, row: number) => {
		const column = board[reel] ?? [];
		const h = cellHeight(Math.max(1, column.length));
		return { x: columnX(reel) + CELL_WIDTH / 2, y: boardY + row * (h + CELL_GAP) + h / 2, h };
	};

	// -- landing: columns drop in left -> right off the handler's clock.
	// progress is a pure function of (nowMs, spinStartedAt, reel).
	const DROP_DISTANCE = 34;
	const dropFor = (reel: number) => {
		const start = context.stateGame.spinStartedAt;
		if (!start) return { yOff: 0, puff: 0, falling: false };
		const t = nowMs - start - reel * LAND_STAGGER_MS;
		if (t <= 0) return { yOff: DROP_DISTANCE, puff: 0, falling: true };
		const p = Math.min(1, t / LAND_DROP_MS);
		const eased = 1 - Math.pow(1 - p, 3);
		const puff = p >= 1 ? Math.max(0, 1 - (t - LAND_DROP_MS) / 240) : 0;
		return { yOff: (1 - eased) * DROP_DISTANCE, puff, falling: p < 1 };
	};

	// -- staged transform progress (0..1) on the handler's stage clock.
	// Flip/travel shares of a stage are scale-invariant (the handler
	// scales every stage segment by the same factor), so the render
	// layer can slice the stage without knowing the scale.
	const stageProgress = $derived.by(() => {
		const started = context.stateGame.stageStartedAt;
		const duration = context.stateGame.stageDurationMs;
		if (!started || !duration) return 0;
		return Math.min(1, Math.max(0, (nowMs - started) / duration));
	});
	const SURGE_FLIP_SHARE = 280 / 500; // (4 rows x 75ms) / (flips + 220ms settle)
	const ECHO_TRAVEL_SHARE = 300 / 520; // travel / (travel + solidify)

	// -- corona pulses at eclipse stage boundaries
	const pulseAge = $derived(
		context.stateGame.coronaPulseAt ? nowMs - context.stateGame.coronaPulseAt : Infinity,
	);
	const pulseP = $derived(Math.min(1, pulseAge / 650));

	// -- 3-15x sweep
	const sweepP = $derived(
		context.stateGame.sweepActive
			? Math.min(1, Math.max(0, (nowMs - context.stateGame.sweepStartedAt) / SWEEP_MS))
			: 0,
	);
</script>

<Container x={layout.x} y={layout.y} pivot={layout.pivot}>
	<!-- The board floats on the painted scene (the symbol tiles carry
	     their own stone cells); only the modifier banner rides a plate. -->
	<!-- modifier banner: painted plate + the feature's medallion -->
	{#if context.stateGame.showModifierBanner && modifierInfo && context.stateGame.modifier}
		<Sprite
			key={TEXTURE_KEYS.plateWide}
			x={BOARD_WIDTH / 2 - 240}
			y={3}
			width={480}
			height={BANNER_HEIGHT - 6}
		/>
		<Sprite
			key={TEXTURE_KEYS.medallions[context.stateGame.modifier]}
			x={BOARD_WIDTH / 2 - 226}
			y={BANNER_HEIGHT / 2}
			anchor={0.5}
			width={32}
			height={32}
		/>
		<Text
			x={BOARD_WIDTH / 2 + 12}
			y={BANNER_HEIGHT / 2}
			anchor={0.5}
			text={`${modifierInfo.title} · CORE REACTION`}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 19, fontWeight: '700', letterSpacing: 3, fill: 0xffe9a8 }}
		/>
	{/if}

	<!-- header: ways + phase -->
	<Text
		x={4}
		y={BANNER_HEIGHT + HEADER_HEIGHT / 2}
		anchor={{ x: 0, y: 0.5 }}
		text={`${context.stateGameDerived.waysCount().toLocaleString('en-US')} WAYS`}
		style={{ fontFamily: 'proxima-nova', fontSize: 15, fontWeight: '700', letterSpacing: 2, fill: 0xc8ba94 }}
	/>
	<Text
		x={BOARD_WIDTH - 4}
		y={BANNER_HEIGHT + HEADER_HEIGHT / 2}
		anchor={{ x: 1, y: 0.5 }}
		text={phaseText}
		style={{ fontFamily: 'proxima-nova', fontSize: 15, fontWeight: '700', letterSpacing: 2, fill: 0x81d9d8 }}
	/>

	<!-- eclipse core pips, one above each reel: a pip only shows its lit
	     colourway once the core-reveal sweep has passed its reel, and the
	     freshest lit pip flares (the suspense beat made visible) -->
	{#each context.stateGame.cores as lit, reel}
		<CorePip
			x={columnX(reel) + CELL_WIDTH / 2}
			y={pipsY + 6}
			{reel}
			lit={lit > 0 && reel < context.stateGame.pipsRevealed}
			revealed={reel < context.stateGame.pipsRevealed}
			flare={context.stateGame.revealActive &&
				reel === context.stateGame.pipsRevealed - 1 &&
				lit > 0}
			reacting={context.stateGame.showModifierBanner}
			{pulse}
		/>
	{/each}

	<!-- free-spins rim light: a soft back-glow in the feature's colour
	     behind the board for the whole feature (art sprite, no drawn
	     frame) -->
	{#if context.stateGame.fsActive && context.stateGame.fsFeature}
		<Sprite
			key={TEXTURE_KEYS.fx.lightBurst}
			x={BOARD_WIDTH / 2}
			y={boardY + BOARD_HEIGHT / 2}
			anchor={0.5}
			width={BOARD_WIDTH * 1.32}
			height={BOARD_HEIGHT * 1.5}
			blendMode="add"
			tint={MODIFIER_INFO[context.stateGame.fsFeature].color}
			alpha={0.1 + pulse * 0.05}
		/>
	{/if}

	<!-- the board: columns divide the fixed board height (fracture columns
	     run to 8 cells, each half height — the prototype's flex columns) -->
	{#each board as column, reel}
		{@const h = cellHeight(column.length)}
		{@const drop = dropFor(reel)}
		{#each column as symbol, row}
			{@const key = cellKey(reel, row)}
			{@const isCrack = crack.has(key)}
			<SymbolCell
				x={columnX(reel) + (isCrack ? Math.sin(nowMs / 11 + reel * 13 + row * 7) * 1.6 : 0)}
				y={boardY + row * (h + CELL_GAP) - drop.yOff}
				width={CELL_WIDTH}
				height={h}
				{symbol}
				modifier={context.stateGame.modifier}
				state={highlighted.has(key)
					? 'win'
					: isCrack
						? 'crack'
						: changed.has(key)
							? 'transform'
							: drop.puff > 0
								? 'land'
								: 'idle'}
				puffAlpha={drop.puff}
				dimmed={anyHighlight && !highlighted.has(key)}
				{pulse}
			/>
		{/each}
	{/each}

	<!-- SURGE: the teal flood wash pours over each flooding column; its
	     front runs on the same stage clock the handler flips rows by -->
	{#if context.stateGame.transformKind === 'surge'}
		{#each context.stateGame.floodReels as reel}
			{@const column = board[reel] ?? []}
			{@const h = cellHeight(Math.max(1, column.length))}
			{@const front = Math.min(1, stageProgress / SURGE_FLIP_SHARE) * column.length}
			{#if front > 0.02}
				<Sprite
					key={TEXTURE_KEYS.fx.emberPuff}
					x={columnX(reel) - 4}
					y={boardY - 4}
					width={CELL_WIDTH + 8}
					height={front * (h + CELL_GAP) + 8}
					blendMode="add"
					tint={0x2fd8c8}
					alpha={0.3}
				/>
				<Sprite
					key={TEXTURE_KEYS.fx.lightBurst}
					x={columnX(reel) + CELL_WIDTH / 2}
					y={boardY + Math.min(column.length - 0.5, front - 0.5) * (h + CELL_GAP) + h / 2}
					anchor={0.5}
					width={CELL_WIDTH * 1.5}
					height={h * 1.5}
					blendMode="add"
					tint={0x8ff5e6}
					alpha={0.4}
				/>
			{/if}
		{/each}
	{/if}

	<!-- ECHO: ghost wilds streak to their target reels simultaneously,
	     then ripple as they solidify -->
	{#if context.stateGame.transformKind === 'echo'}
		{@const travelP = Math.min(1, stageProgress / ECHO_TRAVEL_SHARE)}
		{@const eased = travelP * travelP * (3 - 2 * travelP)}
		{#each context.stateGame.streaks as streak}
			{@const from = cellCentre(streak.fromReel, streak.fromRow)}
			{@const to = cellCentre(streak.toReel, streak.toRow)}
			<Sprite
				key={TEXTURE_KEYS.symbols[6]}
				x={from.x + (to.x - from.x) * eased}
				y={from.y + (to.y - from.y) * eased - Math.sin(eased * Math.PI) * 12}
				anchor={0.5}
				width={CELL_WIDTH * 0.94}
				height={from.h * 0.94}
				tint={0xcfa9ff}
				alpha={0.55}
			/>
		{/each}
		{#if stageProgress > ECHO_TRAVEL_SHARE}
			{@const q = (stageProgress - ECHO_TRAVEL_SHARE) / (1 - ECHO_TRAVEL_SHARE)}
			{#each context.stateGame.streaks as streak}
				{@const at = cellCentre(streak.toReel, streak.toRow)}
				<Sprite
					key={TEXTURE_KEYS.fx.coronaRing}
					x={at.x}
					y={at.y}
					anchor={0.5}
					width={CELL_WIDTH * (0.5 + q * 1.4)}
					height={CELL_WIDTH * (0.5 + q * 1.4)}
					blendMode="add"
					tint={0xcfa9ff}
					alpha={(1 - q) * 0.55}
				/>
			{/each}
		{/if}
	{/if}

	<!-- eclipse stage-boundary corona pulse, expanding from board centre -->
	{#if pulseAge < 650 && context.stateGame.coronaPulseId > 0}
		<Sprite
			key={TEXTURE_KEYS.fx.coronaRing}
			x={BOARD_WIDTH / 2}
			y={boardY + BOARD_HEIGHT / 2}
			anchor={0.5}
			width={BOARD_WIDTH * (0.35 + pulseP * 1.15)}
			height={BOARD_WIDTH * (0.35 + pulseP * 1.15)}
			blendMode="add"
			alpha={(1 - pulseP) * 0.65}
		/>
	{/if}

	<!-- 3-15x win sweep: a band of light crosses the board -->
	{#if context.stateGame.sweepActive}
		<Sprite
			key={TEXTURE_KEYS.fx.lightBurst}
			x={-110 + sweepP * (BOARD_WIDTH + 220)}
			y={boardY + BOARD_HEIGHT / 2}
			anchor={0.5}
			width={210}
			height={BOARD_HEIGHT * 1.3}
			blendMode="add"
			alpha={Math.sin(sweepP * Math.PI) * 0.4}
		/>
	{/if}

	<!-- ways-win list for the current spin: EVERY book win line, so the
	     listed amounts sum exactly to the spin's win (V2 fix B). During
	     the ways pass the list prints progressively (listedWins), and
	     the reconciling TOTAL footer appears only once the list is
	     complete. Up to 4 lines stack in one column; 5-6 lines split
	     into two columns. -->
	{@const allWins = context.stateGame.currentWins}
	{@const wins = allWins.slice(0, context.stateGame.listedWins)}
	{@const listComplete = context.stateGame.listedWins >= allWins.length}
	{@const twoCol = wins.length > 4}
	{@const rows = twoCol ? Math.ceil(wins.length / 2) : wins.length}
	{@const pitch = twoCol ? 24 : 22}
	{@const listTop = boardY + BOARD_HEIGHT + 12}
	{#if wins.length > 0}
		<!-- V4: a dark backing plate guarantees the list (and especially
		     the TOTAL footer) reads against the painted scene — in the
		     v3 playtest the small dim footer was never legible on the
		     busy background. -->
		<Rectangle
			x={-8}
			y={listTop - 7}
			width={BOARD_WIDTH + 16}
			height={rows * pitch + 38}
			borderRadius={10}
			backgroundColor={0x06070f}
			backgroundAlpha={0.8}
		/>
	{/if}
	{#each wins as win, i}
		{@const col = twoCol ? Math.floor(i / rows) : 0}
		{@const row = twoCol ? i % rows : i}
		<Text
			x={col === 0 ? 4 : BOARD_WIDTH / 2 + 12}
			y={listTop + row * pitch}
			anchor={{ x: 0, y: 0 }}
			text={`${SYMBOL_INFO[win.symbol].name.toUpperCase()} ×${win.length} — ${win.ways.toLocaleString('en-US')} WAYS — ${bookEventAmountToCurrencyString(win.amount)}`}
			style={{ fontFamily: 'proxima-nova', fontSize: twoCol ? 15 : 16, fontWeight: '700', letterSpacing: 1, fill: 0xffe9a8 }}
		/>
	{/each}
	{#if wins.length > 0 && listComplete}
		{@const linesSum = allWins.reduce((sum, win) => sum + win.amount, 0)}
		<!-- V5: the footer must be UNMISTAKABLE — v4's footer matched the
		     lines' size/colour and read as just another line. Gold rule
		     above it, bigger saturated gold, no em-dash. -->
		<Rectangle
			x={4}
			y={listTop + rows * pitch + 2}
			width={BOARD_WIDTH - 8}
			height={2}
			backgroundColor={0xd9a441}
			backgroundAlpha={0.9}
		/>
		<Text
			x={4}
			y={listTop + rows * pitch + 8}
			anchor={{ x: 0, y: 0 }}
			text={linesSum === context.stateGame.currentSpinWin
				? `TOTAL ${bookEventAmountToCurrencyString(context.stateGame.currentSpinWin)}`
				: `TOTAL AFTER 20,000× CAP ${bookEventAmountToCurrencyString(context.stateGame.currentSpinWin)}`}
			style={{ fontFamily: 'proxima-nova', fontSize: 19, fontWeight: '800', letterSpacing: 2, fill: 0xffd24a }}
		/>
	{/if}
</Container>
