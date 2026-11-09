<script lang="ts">
	// EclipseModals — the game's OWN modal layer (Keith, 2026-11-08).
	// The shared SDK sample Modals (components-ui-html) are NOT part of
	// this app: every surface below is an Eclipse-owned component driven
	// by the same stateModal contract. See PORT_NOTES.md.
	import AutoSpinMessageModal from './AutoSpinMessageModal.svelte';
	import AutoSpinModal from './AutoSpinModal.svelte';
	import BetAmountMenuModal from './BetAmountMenuModal.svelte';
	import BuyBonusConfirmModal from './BuyBonusConfirmModal.svelte';
	import BuyBonusModal from './BuyBonusModal.svelte';
	import ErrorModal from './ErrorModal.svelte';
	import RulesModal from './RulesModal.svelte';
	import SettingsModal from './SettingsModal.svelte';
</script>

<ErrorModal />
<BetAmountMenuModal />
<BuyBonusModal />
<BuyBonusConfirmModal />
<AutoSpinModal />
<AutoSpinMessageModal />
<RulesModal />
<SettingsModal />
