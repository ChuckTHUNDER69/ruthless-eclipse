<script lang="ts">
	import { type Snippet, onMount } from 'svelte';
	import { GlobalStyle } from 'components-ui-html';
	import { Authenticate, LoadI18n } from 'components-shared';
	import Game from '../components/Game.svelte';
	import LoaderEclipse from '../components/LoaderEclipse.svelte';
	import { setContext } from '../game/context';

	import messagesMap from '../i18n/messagesMap';

	type Props = { children: Snippet };

	const props: Props = $props();

	let showYourLoader = $state(false);
	let loaderFading = $state(false);
	let loaderGone = $state(false);

	// Preload the self-hosted display font (see the @font-face rules in
	// this file's <style>) so pixi text in headers/banners/win amounts
	// renders in Cinzel Decorative from its first frame, not in fallback.
	onMount(() => {
		document.fonts?.load('900 40px "Cinzel Decorative"');
		document.fonts?.load('700 40px "Cinzel Decorative"');
	});

	// The branded loader mirrors LoaderBase's contract: show ~2s, fade, unmount.
	$effect(() => {
		if (showYourLoader) {
			const fadeTimer = setTimeout(() => (loaderFading = true), 1600);
			const goneTimer = setTimeout(() => (loaderGone = true), 2000);
			return () => {
				clearTimeout(fadeTimer);
				clearTimeout(goneTimer);
			};
		}
	});

	setContext();
</script>

<GlobalStyle>
	<Authenticate>
		<LoadI18n {messagesMap}>
			<Game />
		</LoadI18n>
	</Authenticate>
</GlobalStyle>

<LoaderEclipse oncomplete={() => (showYourLoader = true)} />

{#if showYourLoader && !loaderGone}
	<div class="ff-loader" class:fading={loaderFading}>
		<div class="ff-loader-shade"></div>
		<img class="ff-loader-wordmark" src="assets/sprites/scene/wordmark.webp" alt="RUTHLESS ECLIPSE" />
		<span class="ff-loader-text">LOADING</span>
	</div>
{/if}

<style lang="scss">
	/* Display font, self-hosted (no runtime requests): Cinzel Decorative
	   by Natanael Gama, SIL Open Font License 1.1 — files + license text
	   in static/assets/fonts/. Used for headers, win amounts, banners
	   and modal titles; body text stays in proxima-nova. */
	@font-face {
		font-family: 'Cinzel Decorative';
		src: url('assets/fonts/cinzel-decorative-latin-700.woff2') format('woff2');
		font-weight: 700;
		font-style: normal;
		font-display: swap;
	}

	@font-face {
		font-family: 'Cinzel Decorative';
		src: url('assets/fonts/cinzel-decorative-latin-900.woff2') format('woff2');
		font-weight: 900;
		font-style: normal;
		font-display: swap;
	}

	.ff-loader {
		position: fixed;
		inset: 0;
		z-index: 999;
		background: #090d19 url('assets/eclipse_cover.jpg') center / cover no-repeat;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 10px;
		padding-bottom: 9vh;
		transition: opacity 0.4s ease;

		&.fading {
			opacity: 0;
			pointer-events: none;
		}
	}

	.ff-loader-shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(10, 5, 22, 0.25) 55%, rgba(10, 5, 22, 0.88));
	}

	.ff-loader-wordmark {
		position: relative;
		width: min(560px, 78vw);
		height: auto;
		filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.8));
	}

	.ff-loader-text {
		position: relative;
		color: #e8dcc0;
		font-family: 'Cinzel Decorative', 'Cinzel', serif;
		font-weight: 700;
		font-size: 14px;
		letter-spacing: 6px;
		animation: ff-loader-pulse 1.2s ease-in-out infinite;
	}

	@keyframes ff-loader-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.45;
		}
	}
</style>

{@render props.children()}