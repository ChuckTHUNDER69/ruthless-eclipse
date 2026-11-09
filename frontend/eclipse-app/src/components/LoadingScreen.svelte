<script lang="ts">
	import { Container, Rectangle, Sprite, Text } from 'pixi-svelte';
	import { FadeContainer } from 'components-pixi';
	import { MainContainer } from 'components-layout';
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY, TEXTURE_KEYS } from '../game/constants';
	import PressToContinue from './PressToContinue.svelte';

	type Props = {
		onloaded: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	let loadingType = $state<'start' | 'transition'>('start');
	const main = $derived(context.stateLayoutDerived.mainLayout());

	// slow corona rotation behind the wordmark (component-level $state
	// primitive on rAF — the safe Svelte 5 tween pattern)
	let ringRotation = $state(0);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			ringRotation = (t / 14000) % (Math.PI * 2);
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});

	// cover-fit the 2048x1152 scene behind the wordmark
	const cover = $derived.by(() => {
		const scale = Math.max(main.width / 2048, main.height / 1152);
		return { width: 2048 * scale, height: 1152 * scale };
	});
	const wordmarkWidth = $derived(Math.min(620, main.width * 0.62));
</script>

<!-- Loading screen: the painted scene + luma-keyed wordmark over the
     slowly turning corona ring. (The Eclipse-owned DOM loader precedes
     this screen — LoaderEclipse in +layout; the stock Stake GIF is
     gone.) -->
<FadeContainer show={loadingType === 'start'}>
	<MainContainer>
		<Rectangle width={main.width} height={main.height} backgroundColor={0x090d19} />
		<Sprite
			key={TEXTURE_KEYS.backgroundBase}
			x={main.width / 2}
			y={main.height / 2}
			anchor={0.5}
			width={cover.width}
			height={cover.height}
		/>
		<Rectangle width={main.width} height={main.height} backgroundColor={0x05080f} backgroundAlpha={0.35} />
		<Container x={main.width * 0.5} y={main.height * 0.5}>
			<Sprite
				key={TEXTURE_KEYS.fx.coronaRing}
				anchor={0.5}
				y={-40}
				width={wordmarkWidth * 0.98}
				height={wordmarkWidth * 0.98}
				rotation={ringRotation}
				blendMode="add"
				alpha={0.9}
			/>
			<Sprite
				key={TEXTURE_KEYS.wordmark}
				anchor={0.5}
				y={-40}
				width={wordmarkWidth}
				height={wordmarkWidth / 2}
			/>
			{#if !context.stateApp.loaded}
				<Text
					anchor={0.5}
					y={wordmarkWidth / 4 + 26}
					text="LOADING"
					style={{
						fontFamily: DISPLAY_FONT_FAMILY,
						fontSize: 16,
						fontWeight: '700',
						letterSpacing: 6,
						fill: 0xc8ba94,
					}}
				/>
			{/if}
		</Container>
	</MainContainer>
</FadeContainer>

<FadeContainer show={loadingType === 'start' && context.stateApp.loaded}>
	<PressToContinue
		onpress={() => {
			loadingType = 'transition';
			setTimeout(() => props.onloaded(), 420);
		}}
	/>
</FadeContainer>

<FadeContainer show={loadingType === 'transition'}>
	<Rectangle {...context.stateLayoutDerived.canvasSizes()} backgroundColor={0x000000} />
</FadeContainer>
