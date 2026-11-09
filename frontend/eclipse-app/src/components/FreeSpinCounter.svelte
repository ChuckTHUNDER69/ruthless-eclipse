<script lang="ts">
	import { Container, Sprite, Text } from 'pixi-svelte';
	import { bookEventAmountToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../game/context';
	import { DISPLAY_FONT_FAMILY, TEXTURE_KEYS } from '../game/constants';

	const context = getContext();
	const show = $derived(context.stateGame.fsActive);
</script>

<!-- V5: top-LEFT — at top-right the panel sat under the player's own
     sound control and its text clipped. Top-left is clear scene. -->
{#if show}
	<Container x={14} y={14}>
		<Sprite key={TEXTURE_KEYS.plateWide} x={0} width={196} height={86} alpha={0.96} />
		<Text
			x={14}
			y={10}
			text="FREE SPINS"
			style={{ fontFamily: 'proxima-nova', fontSize: 12, fontWeight: '800', letterSpacing: 2, fill: 0x86eee3 }}
		/>
		<Text
			x={14}
			y={30}
			text={`${context.stateGame.fsSpinsPlayed} / ${context.stateGame.fsTotalSpins} · ${(context.stateGame.fsFeature ?? '').toUpperCase()}`}
			style={{ fontFamily: 'proxima-nova', fontSize: 19, fontWeight: '800', fill: 0xffffff }}
		/>
		<Text
			x={14}
			y={58}
			text={`FEATURE WIN ${bookEventAmountToCurrencyString(context.stateGame.fsWinTotal)}`}
			style={{ fontFamily: DISPLAY_FONT_FAMILY, fontSize: 13, fontWeight: '700', fill: 0xffe9a8 }}
		/>
	</Container>
{/if}
