<script lang="ts">
	import { stateBet, stateMeta, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../../game/context';
	import { stateBonus } from '../../game/stateBonus.svelte';
	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned buy confirmation (replaces the shared SDK sample
	// ModalBuyBonusConfirm). Confirm contract mirrors the shared one:
	// set the active bet mode, broadcast 'bet' for buy modes, close.
	const context = getContext();
	const modeData = $derived(stateMeta.betModeMeta[stateBonus.selectedBetModeKey]);
	const price = $derived(modeData ? stateBet.betAmount * modeData.costMultiplier : 0);

	const confirm = () => {
		if (!modeData) return;
		stateBet.activeBetModeKey = stateBonus.selectedBetModeKey;
		if (modeData.type === 'buy') {
			context.eventEmitter.broadcast({ type: 'bet' });
		}
		// the forge-clang confirm (ANIMATION_SPEC sound list: buy_confirm)
		context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_buy_confirm' });
		stateModal.modal = null;
	};
</script>

{#if stateModal.modal?.name === 'buyBonusConfirm' && modeData}
	<ModalShell title={modeData.text.title} onclose={() => (stateModal.modal = { name: 'buyBonus' })}>
		<p>{modeData.text.dialog}</p>
		<p class="price">Enter this feature for <strong>{numberToCurrencyString(price)}</strong>?</p>
		<button class="confirm" disabled={stateBet.balanceAmount < price} onclick={confirm}>
			CONFIRM {numberToCurrencyString(price)}
		</button>
	</ModalShell>
{/if}

<style>
	.price {
		font-size: 16px;
	}
	.confirm {
		width: 100%;
		padding: 13px;
		margin-top: 10px;
		border-radius: 8px;
		border: 1px solid #8a7648;
		/* painted plate family (derived from the spin dial), no gradient */
		background-color: #241b0f;
		background-image: url('assets/plates/plate_wide.png');
		background-size: cover;
		background-position: center;
		color: #ffe9a8;
		font-weight: 800;
		letter-spacing: 2px;
		cursor: pointer;
	}
	.confirm:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
