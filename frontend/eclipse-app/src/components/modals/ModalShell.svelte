<script lang="ts">
	import type { Snippet } from 'svelte';

	// Eclipse-owned modal shell: painted stone panel (scene stone tile +
	// bronze rim, the dial plate family). The modal components' state
	// contracts (stateModal / stateBet / stateUi) are unchanged.
	type Props = {
		title: string;
		persistent?: boolean;
		onclose?: () => void;
		children: Snippet;
	};

	const props: Props = $props();
	const close = () => {
		if (!props.persistent) props.onclose?.();
	};
</script>

<div class="overlay" role="presentation" onclick={close}>
	<div
		class="panel"
		role="dialog"
		aria-modal="true"
		aria-label={props.title}
		onclick={(e) => e.stopPropagation()}
	>
		<div class="head">
			<h2>{props.title}</h2>
			{#if !props.persistent}
				<button class="x" aria-label="Close" onclick={close}>×</button>
			{/if}
		</div>
		<div class="body">
			{@render props.children()}
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 500;
		background: rgba(3, 8, 18, 0.78);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 18px;
		font-family: 'proxima-nova', Arial, sans-serif;
	}
	.panel {
		width: min(620px, 94vw);
		max-height: 88vh;
		overflow-y: auto;
		/* painted family: the scene's dark stone, bronze rim — no gradients */
		background-color: #0c1219;
		background-image: url('assets/sprites/scene/stone_tile.webp');
		border: 1px solid #8a7648;
		border-radius: 16px;
		box-shadow: 0 24px 65px rgba(0, 0, 0, 0.55);
		color: #eae9e4;
		padding: 22px 24px;
	}
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
	}
	h2 {
		margin: 0;
		font-family: 'Cinzel Decorative', 'Cinzel', serif;
		font-size: 22px;
		letter-spacing: 3px;
		color: #f2e0bb;
		font-weight: 700;
	}
	.x {
		background: none;
		border: 0;
		color: #9eafb8;
		font-size: 26px;
		line-height: 1;
		cursor: pointer;
		padding: 0 2px;
	}
	.x:hover {
		color: #ffe9a8;
	}
	.body {
		font-size: 14px;
		line-height: 1.55;
	}
</style>
