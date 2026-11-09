<script lang="ts">
	import { stateBet, stateMetaDerived, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import { getContext } from '../../game/context';
	import { stateBonus } from '../../game/stateBonus.svelte';
	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned feature-buy panel (replaces the shared SDK sample
	// ModalBuyBonus). Cards come from stateMeta.betModeMeta (type 'buy');
	// picking one records the selection and asks Game to open the confirm
	// step via the 'buyBonusConfirm' emitter event — same contract the
	// shared cards used, owned components on both ends now.
	const context = getContext();
	const buyList = $derived(stateMetaDerived.betModeMetaList().filter((item) => item.type === 'buy'));

	const pick = (mode: string) => {
		stateBonus.selectedBetModeKey = mode;
		context.eventEmitter.broadcast({ type: 'buyBonusConfirm' });
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
	};
</script>

{#if stateModal.modal?.name === 'buyBonus'}
	<ModalShell title="ENTER THE FORGE" onclose={() => (stateModal.modal = null)}>
		<p class="sub">Base bet {numberToCurrencyString(stateBet.betAmount)} · choose your reaction</p>
		<div class="cards">
			{#each buyList as mode (mode.mode)}
				{@const price = stateBet.betAmount * mode.costMultiplier}
				<div class="card">
					{#if mode.assets.icon}
						<img src={mode.assets.icon} alt="" width="54" height="54" />
					{/if}
					<div class="card-title">{mode.text.title}</div>
					<div class="card-desc">{mode.text.description}</div>
					<div class="card-price">{numberToCurrencyString(price)}</div>
					<button
						class="buy"
						disabled={stateBet.betAmount <= 0 || stateBet.balanceAmount < price}
						onclick={() => pick(mode.mode)}
					>
						{mode.text.button || 'BUY'}
					</button>
				</div>
			{/each}
		</div>
	</ModalShell>
{/if}

<style>
	.sub {
		color: #9eafb8;
		margin: 0 0 14px;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 12px;
	}
	.card {
		background: rgba(0, 0, 0, 0.45);
		border: 1px solid #465064;
		border-radius: 12px;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 7px;
		align-items: flex-start;
	}
	.card-title {
		font-family: 'Cinzel Decorative', 'Cinzel', serif;
		font-weight: 700;
		letter-spacing: 2px;
		color: #ffe9a8;
	}
	.card-desc {
		color: #b9c6cf;
		font-size: 12.5px;
		min-height: 2.4em;
	}
	.card-price {
		font-size: 18px;
		font-weight: 800;
		color: #fff6dd;
	}
	.buy {
		margin-top: auto;
		width: 100%;
		padding: 10px;
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
	.buy:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
