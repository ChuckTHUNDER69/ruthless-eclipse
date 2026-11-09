<script lang="ts">
	import { stateModal } from 'state-shared';

	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned error surface (replaces the shared SDK sample
	// ModalError; opened by the SDK bet machine on RGS errors).
	const error = $derived(stateModal.modal?.name === 'error' ? stateModal.modal.error : null);
</script>

{#if stateModal.modal?.name === 'error'}
	<ModalShell title="ERROR" persistent>
		<p>Sorry, something went wrong.</p>
		<div class="error-text">
			{#if error}
				{#if error?.error && error?.message}
					<span>{JSON.stringify(error.error || 'unknown')}</span>
					<p>{JSON.stringify(error.message || 'unknown')}</p>
				{:else}
					<p>{error}</p>
				{/if}
			{:else}
				<span>unknown error</span>
			{/if}
		</div>
		<button class="dismiss" onclick={() => (stateModal.modal = null)}>DISMISS</button>
	</ModalShell>
{/if}

<style>
	.error-text {
		max-height: 140px;
		overflow-y: auto;
		border: 1px solid #b0523c;
		border-radius: 8px;
		padding: 10px 12px;
		white-space: normal;
		word-break: break-word;
	}
	.dismiss {
		width: 100%;
		padding: 11px;
		margin-top: 14px;
		border-radius: 8px;
		border: 1px solid #eac98a;
		background: #1a252c;
		color: #ffe9a8;
		font-weight: 800;
		letter-spacing: 2px;
		cursor: pointer;
	}
</style>
