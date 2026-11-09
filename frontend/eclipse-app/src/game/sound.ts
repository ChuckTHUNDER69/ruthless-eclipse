import { createSound } from 'utils-sound';

// Sound names are the contract the presentation layer broadcasts against.
// Phase 2b wired the ANIMATION_SPEC event list to a PROVISIONAL
// synthesized mp3 audiosprite (see art/production/make_sounds.py and
// PORT_NOTES "PHASE 2B"): same names, one format (mp3), when the
// produced mix arrives it only replaces the sprite media.
export type MusicName = 'bgm_main' | 'bgm_freespin';

export type SoundEffectName =
	| 'sfx_btn_general' // ui_click
	| 'sfx_btn_spin' // dial_press
	| 'sfx_land_1' // reel lands, pitched stone, descending per reel
	| 'sfx_land_2'
	| 'sfx_land_3'
	| 'sfx_land_4'
	| 'sfx_land_5'
	| 'sfx_land_6'
	| 'sfx_core_1' // core-light chimes, pitch rising with the lit count
	| 'sfx_core_2'
	| 'sfx_core_3'
	| 'sfx_core_4'
	| 'sfx_core_5'
	| 'sfx_core_6'
	| 'sfx_surge'
	| 'sfx_fracture'
	| 'sfx_echo'
	| 'sfx_eclipse' // eclipse stage-boundary corona swell
	| 'sfx_tick' // win roll-up ticks
	| 'sfx_win_small'
	| 'sfx_win_big'
	| 'sfx_win_mega'
	| 'sfx_bigwin_coinloop'
	| 'sfx_buy_confirm'
	| 'sfx_fs_intro'
	| 'sfx_fs_end';

export type SoundName = MusicName | SoundEffectName;

/** pitched core-light chime for the n-th lit core of a spin (1-based) */
export const coreChimeName = (litCount: number): SoundEffectName =>
	`sfx_core_${Math.min(6, Math.max(1, litCount))}` as SoundEffectName;

/** pitched reel-land thump for a reel (0-based) */
export const landSoundName = (reel: number): SoundEffectName =>
	`sfx_land_${Math.min(6, Math.max(1, reel + 1))}` as SoundEffectName;

const sound = createSound<SoundName>();

export { sound };
