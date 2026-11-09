<script lang="ts">
	import { stateModal } from 'state-shared';

	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned autoplay-stop notice (replaces the shared SDK sample
	// ModalAutoSpinMessage; opened by the SDK auto-bet machine).
	const MESSAGES = {
		insufficientFunds: 'Insufficient funds to continue auto play.',
		lossLimitReached: 'Loss limit reached.',
		singleWinLimitReached: 'Single win limit reached.',
	} as const;
</script>

{#if stateModal.modal?.name === 'autoSpinMessage'}
	<ModalShell title="NOTIFICATION" onclose={() => (stateModal.modal = null)}>
		<p>Auto play has stopped.</p>
		<p class="msg">{MESSAGES[stateModal.modal.message]}</p>
	</ModalShell>
{/if}

<style>
	.msg {
		border: 1px solid #465064;
		border-radius: 8px;
		padding: 12px;
		text-align: center;
	}
</style>
