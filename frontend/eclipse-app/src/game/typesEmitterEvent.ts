import type { EmitterEventSound } from '../components/Sound.svelte';

// Modal/control emitter contracts, owned by this app (the buy menu's
// card click broadcasts 'buyBonusConfirm'; Game opens the confirm modal).
export type EmitterEventModal =
	| { type: 'soundPressGeneral' }
	| { type: 'buyBonusConfirm' }
	| { type: 'bet' }
	| { type: 'autoBet' };

// Eclipse presentation is state-driven (components read stateGame), so
// the only game-level emitter events are the sound contracts. Bet / stop
// / ui events come from the SDK emitter types (see eventEmitter).
export type EmitterEventGame = EmitterEventSound;
