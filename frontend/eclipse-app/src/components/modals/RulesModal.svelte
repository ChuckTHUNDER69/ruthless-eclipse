<script lang="ts">
	import { stateMeta, stateModal } from 'state-shared';

	import ModalShell from './ModalShell.svelte';

	// Eclipse-owned rules + paytable surfaces (replace the shared SDK
	// sample ModalGameRules / ModalPayTable). Content is the game's own
	// stateMeta.gameRuleMeta, authored in game/meta.ts; EclipseControls
	// refreshes the paytable amounts to the current bet before opening.
	const kind = $derived(
		stateModal.modal?.name === 'payTable'
			? 'payTable'
			: stateModal.modal?.name === 'gameRules'
				? 'gameRules'
				: null,
	);
	const sections = $derived(kind ? stateMeta.gameRuleMeta[kind] : []);
	const ordered = (containers: (typeof sections)[number]['containers']) =>
		[...containers].sort((a, b) => a.row - b.row || a.column - b.column);
</script>

{#if kind}
	<ModalShell
		title={kind === 'payTable' ? 'PAYS' : 'GAME RULES'}
		onclose={() => (stateModal.modal = null)}
	>
		{#each sections as section (section.title)}
			<h3>{section.title}</h3>
			{#each ordered(section.containers) as container (container.title)}
				<div class="row" class:top={container.imagePosition === 'top'}>
					{#if container.image}
						<img src={container.image} alt="" width="64" height="64" />
					{/if}
					<div>
						<div class="row-title">{container.title}</div>
						<div class="row-text">{container.text}</div>
					</div>
				</div>
			{/each}
		{/each}
		<p class="version">RUTHLESS ECLIPSE · BUILD 0.1.0-SCAFFOLD</p>
	</ModalShell>
{/if}

<style>
	h3 {
		color: #85d7d3;
		letter-spacing: 2px;
		font-size: 15px;
		margin: 18px 0 8px;
	}
	.row {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 8px 0;
		border-bottom: 1px solid #2b3648;
	}
	.row.top {
		flex-direction: column;
	}
	.row-title {
		font-weight: 800;
		letter-spacing: 1px;
		color: #f2e0bb;
	}
	.row-text {
		color: #c9d4dc;
		white-space: pre-line;
	}
	.version {
		margin-top: 18px;
		font-size: 11px;
		letter-spacing: 2px;
		color: #63717f;
		text-align: center;
	}
</style>
