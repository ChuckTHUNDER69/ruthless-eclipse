<script lang="ts">
	import { fade } from 'svelte/transition';
	import { onMount } from 'svelte';

	// Eclipse-owned first loader — replaces the stock Stake Engine GIF
	// splash (stake-engine-loader.gif, 1.30 MB) in +layout. Mirrors the
	// LoaderStakeEngine/LoaderBase contract exactly: full-screen overlay,
	// ~2 s dwell once mounted, fade out, then oncomplete.
	// Art: the luma-keyed wordmark (269 KB, shared with the scene) over
	// the painted corona ring (35 KB standalone webp; the atlas frame
	// ships on black, so the ring renders with screen blending — the DOM
	// equivalent of the game's additive FX treatment). Loader art total
	// ≈ 305 KB, inside the art bible's ≤400 KB loader budget (§6).
	type Props = {
		oncomplete?: () => void;
	};

	const props: Props = $props();

	let loading = $state(true);

	onMount(() => {
		const timer = setTimeout(() => {
			loading = false;
			props.oncomplete?.();
		}, 2000);
		return () => clearTimeout(timer);
	});
</script>

{#if loading}
	<div class="wrap" transition:fade>
		<div class="stack">
			<div class="ring-wrap">
				<img class="ring" src="assets/sprites/scene/corona_ring.webp" alt="" />
				<img class="wordmark" src="assets/sprites/scene/wordmark.webp" alt="RUTHLESS ECLIPSE" />
			</div>
			<div class="bar"><div class="fill"></div></div>
			<span class="text">LOADING</span>
		</div>
	</div>
{/if}

<style lang="scss">
	.wrap {
		position: fixed;
		inset: 0;
		z-index: 999;
		background: #05080f;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.stack {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 18px;
	}

	.ring-wrap {
		position: relative;
		width: min(74vmin, 540px);
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.ring {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		mix-blend-mode: screen;
		animation: ring-spin 24s linear infinite;
	}

	.wordmark {
		position: relative;
		width: 82%;
		height: auto;
		filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.85));
	}

	.bar {
		width: min(240px, 52vw);
		height: 3px;
		border-radius: 2px;
		background: rgba(138, 118, 72, 0.35);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		width: 100%;
		background: #e8c87a;
		transform-origin: left;
		animation: fill-up 2s linear forwards;
	}

	.text {
		color: #e8dcc0;
		font-family: 'Cinzel Decorative', 'Cinzel', serif;
		font-weight: 700;
		font-size: 14px;
		letter-spacing: 6px;
		animation: text-pulse 1.2s ease-in-out infinite;
	}

	@keyframes ring-spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes fill-up {
		from {
			transform: scaleX(0);
		}
		to {
			transform: scaleX(1);
		}
	}

	@keyframes text-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}
</style>
