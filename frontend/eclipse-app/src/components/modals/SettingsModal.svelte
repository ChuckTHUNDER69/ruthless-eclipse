<script lang="ts">
	import { stateBet, stateBetDerived, stateModal, stateSound } from 'state-shared';

	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned settings surface (replaces the shared SDK sample
	// ModalSettings). EclipseControls toggles sound/turbo inline; this
	// covers the 'settings' stateModal value with the same switches.
	const soundOn = $derived(stateSound.volumeValueMaster !== 0);
</script>

{#if stateModal.modal?.name === 'settings'}
	<ModalShell title="SETTINGS" onclose={() => (stateModal.modal = null)}>
		<div class="row">
			<span>SOUND</span>
			<button
				class="toggle"
				onclick={() => (stateSound.volumeValueMaster = soundOn ? 0 : 50)}
			>
				{soundOn ? 'ON' : 'OFF'}
			</button>
		</div>
		<div class="row">
			<span>TURBO</span>
			<button
				class="toggle"
				onclick={() => stateBetDerived.updateIsTurbo(!stateBet.isTurbo, { persistent: true })}
			>
				{stateBet.isTurbo ? 'ON' : 'OFF'}
			</button>
		</div>
	</ModalShell>
{/if}

<style>
	.row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0;
		border-bottom: 1px solid #2b3648;
		letter-spacing: 2px;
		font-weight: 700;
	}
	.toggle {
		min-width: 76px;
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid #465064;
		background: #151c29;
		color: #78eee4;
		font-weight: 800;
		cursor: pointer;
	}
</style>
