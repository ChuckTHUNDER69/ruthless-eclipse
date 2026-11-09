import { createEventEmitter } from 'utils-event-emitter';
import type { EmitterEventHotKey } from 'components-shared';
import type { EmitterEventUi } from 'components-ui-pixi';

import type { EmitterEventGame, EmitterEventModal } from './typesEmitterEvent';

// NB: EmitterEventModal is defined in THIS app (typesEmitterEvent.ts),
// not imported from components-ui-html — Eclipse owns its modal layer
// end to end, event types included.
export type EmitterEvent =
	| EmitterEventHotKey
	| EmitterEventUi
	| EmitterEventModal
	| EmitterEventGame;

export const { eventEmitter } = createEventEmitter<EmitterEvent>();
