import _ from 'lodash';

import { stateBet } from 'state-shared';
import { createPrimaryMachines, createIntermediateMachines, createGameActor } from 'utils-xstate';
import { waitForTimeout } from 'utils-shared/wait';

import type { Bet } from './typesBookEvent';
import { stateXstateDerived } from './stateXstate';
import { playBet, convertToResumableBet } from './utils';
import { stateGame } from './stateGame.svelte';

const primaryMachines = createPrimaryMachines<Bet>({
	onResumeGameActive: (betToResume) => convertToResumableBet(betToResume),
	onResumeGameInactive: (betToResume) => {
		const lastSpinEvent = _.findLast(
			betToResume.state,
			(bookEvent) => bookEvent?.type === 'spin',
		);
		if (lastSpinEvent && lastSpinEvent.type === 'spin') {
			stateGame.board = lastSpinEvent.board;
			stateGame.cores = lastSpinEvent.cores;
		}
	},
	onNewGameStart: async () => {
		stateGame.skipRequested = false;
		if ((stateBet.isTurbo && stateXstateDerived.isAutoBetting()) || stateBet.isSpaceHold) return;
		stateBet.winBookEventAmount = 0;
		// placeholder roll while the RGS request is in flight; the first
		// spin event handler takes over and lands the `before` board
		stateGame.spinning = true;
		await waitForTimeout(420);
	},
	onNewGameError: () => {
		stateGame.spinning = false;
	},
	onPlayGame: async (bet) => await playBet(bet),
	// Eclipse books mark a bonus round with a bonusStart event (the SDK's
	// checkIsMultipleRevealEvents counts Vaultbreak-style `reveal`s and
	// would never fire here).
	checkIsBonusGame: (bet) => bet.state.some((bookEvent) => bookEvent.type === 'bonusStart'),
});

const intermediateMachines = createIntermediateMachines(primaryMachines);

export const gameActor = createGameActor(intermediateMachines);
