<script lang="ts">
	import {
		stateBet,
		stateBetDerived,
		stateModal,
		stateUi,
		AUTO_SPINS_TEXT_OPTIONS,
		LOSS_LIMIT_TEXT_OPTIONS,
		SINGLE_WIN_LIMIT_TEXT_OPTIONS,
		AUTO_SPINS_TEXT_OPTION_MAP,
		AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP,
		AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP,
	} from 'state-shared';

	import { getContext } from '../../game/context';
	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned autoplay panel (replaces the shared SDK sample
	// ModalAutoSpin). The start contract is the shared one's, verbatim:
	// counter + limit amounts from the stateUi selections, buy modes fall
	// back to BASE, 'autoBet' broadcast, close.
	const context = getContext();

	const startAutoBet = () => {
		stateBet.autoSpinsCounter = AUTO_SPINS_TEXT_OPTION_MAP[stateUi.autoSpinsText];
		stateBet.autoSpinsLossLimitAmount =
			stateBet.betAmount * AUTO_SPINS_LOSS_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsLossLimitText];
		stateBet.autoSpinsSingleWinLimitAmount =
			stateBet.betAmount *
			AUTO_SPINS_SINGLE_WIN_LIMIT_MULTIPLIER_MAP[stateUi.autoSpinsSingleWinLimitText];
		if (stateBetDerived.activeBetMode().type === 'buy') stateBet.activeBetModeKey = 'BASE';
		context.eventEmitter.broadcast({ type: 'soundPressGeneral' });
		context.eventEmitter.broadcast({ type: 'autoBet' });
		stateModal.modal = null;
	};
</script>

{#if stateModal.modal?.name === 'autoSpin'}
	<ModalShell title="AUTO PLAY" onclose={() => (stateModal.modal = null)}>
		<div class="label">NUMBER OF ROUNDS</div>
		<div class="grid">
			{#each AUTO_SPINS_TEXT_OPTIONS as option}
				<button
					class="opt"
					class:selected={stateUi.autoSpinsText === option}
					onclick={() => (stateUi.autoSpinsText = option)}
				>
					{option}
				</button>
			{/each}
		</div>

		<div class="label">STOP ON LOSS LIMIT</div>
		<div class="grid">
			{#each LOSS_LIMIT_TEXT_OPTIONS as option}
				<button
					class="opt"
					class:selected={stateUi.autoSpinsLossLimitText === option}
					onclick={() => (stateUi.autoSpinsLossLimitText = option)}
				>
					{option}
				</button>
			{/each}
		</div>

		<div class="label">STOP ON SINGLE WIN LIMIT</div>
		<div class="grid">
			{#each SINGLE_WIN_LIMIT_TEXT_OPTIONS as option}
				<button
					class="opt"
					class:selected={stateUi.autoSpinsSingleWinLimitText === option}
					onclick={() => (stateUi.autoSpinsSingleWinLimitText = option)}
				>
					{option}
				</button>
			{/each}
		</div>

		<button class="start" disabled={!stateBetDerived.isBetCostAvailable()} onclick={startAutoBet}>
			START AUTO PLAY
		</button>
	</ModalShell>
{/if}

<style>
	.label {
		font-size: 11px;
		letter-spacing: 2px;
		color: #9eafb8;
		margin: 14px 0 7px;
	}
	.grid {
		display: flex;
		flex-wrap: wrap;
		gap: 7px;
	}
	.opt {
		min-width: 52px;
		padding: 8px 10px;
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
	.start {
		width: 100%;
		padding: 13px;
		margin-top: 20px;
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
	.start:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
