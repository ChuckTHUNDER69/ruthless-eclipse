<script lang="ts">
	import { MainContainer, OnPressFullScreen } from 'components-layout';
	import { OnHotkey } from 'components-shared';
	import { Text } from 'pixi-svelte';
	import { onMount } from 'svelte';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY } from '../game/constants';

	type Props = {
		onpress: () => void;
	};

	const props: Props = $props();
	const context = getContext();

	// Placeholder press-to-continue: pulsing text (component-level $state
	// primitive), replaced by final art treatment later.
	let pulse = $state(0.85);
	onMount(() => {
		let raf = 0;
		let dead = false;
		const loop = (t: number) => {
			if (dead) return;
			pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(t / 420));
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			dead = true;
			cancelAnimationFrame(raf);
		};
	});
</script>

<MainContainer alignVertical="bottom">
	<Text
		anchor={{ x: 0.5, y: 1 }}
		x={context.stateLayoutDerived.mainLayout().width * 0.5}
		y={context.stateLayoutDerived.mainLayout().height - 24}
		alpha={pulse}
		text="PRESS TO CONTINUE"
		style={{
			fontFamily: DISPLAY_FONT_FAMILY,
			fontSize: 34,
			fontWeight: '700',
			letterSpacing: 4,
			fill: 0xffe9a8,
			align: 'center',
		}}
	/>
</MainContainer>
<OnHotkey hotkey="Space" onpress={() => props.onpress()} />
<OnPressFullScreen onpress={() => props.onpress()} />
