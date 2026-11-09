<script lang="ts">
	import { stateBet, stateBetDerived, stateConfig, stateModal } from 'state-shared';
	import { numberToCurrencyString } from 'utils-shared/amount';

	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned bet menu (replaces the shared SDK sample
	// ModalBetMenu). Nothing in EclipseControls opens it today (the
	// floating steppers cover bet changes); it exists so the
	// 'betAmountMenu' stateModal value always lands on an owned surface.
</script>

{#if stateModal.modal?.name === 'betAmountMenu'}
	<ModalShell title="BET MENU" onclose={() => (stateModal.modal = null)}>
		<p class="sub">Select your bet · active mode {stateBetDerived.activeBetMode()?.text.title ?? ''}</p>
		<div class="grid">
			{#each stateConfig.betAmountOptions as amount}
				<button
					class="opt"
					class:selected={stateBet.betAmount === amount}
					onclick={() => stateBetDerived.setBetAmount(amount)}
				>
					{numberToCurrencyString(amount)}
				</button>
			{/each}
		</div>
		<button class="confirm" onclick={() => (stateModal.modal = null)}>CONFIRM</button>
	</ModalShell>
{/if}

<style>
	.sub {
		color: #9eafb8;
		margin-top: 0;
	}
	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.opt {
		padding: 9px 12px;
		border-radius: 8px;
		border: 1px solid #465064;
		background: #151c29;
		color: #eae9e4;
		font-weight: 700;
		cursor: pointer;
	}
	.opt.selected {
		border-color: #78eee4;
		color: #78eee4;
	}
	.confirm {
		width: 100%;
		padding: 12px;
		margin-top: 18px;
		border-radius: 8px;
		border: 1px solid #eac98a;
		background: #1a252c;
		color: #ffe9a8;
		font-weight: 800;
		letter-spacing: 2px;
		cursor: pointer;
	}
</style>
