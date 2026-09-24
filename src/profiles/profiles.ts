import type { GestureType } from '../gestures/types';

export type ActionType = 'NONE' | 'NEXT' | 'PREVIOUS' | 'PLAY_PAUSE' | 'LIKE' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'MUTE';

export const ALL_ACTIONS: ActionType[] = ['NONE', 'NEXT', 'PREVIOUS', 'PLAY_PAUSE', 'LIKE', 'VOLUME_UP', 'VOLUME_DOWN', 'MUTE'];

export const ACTION_LABEL: Record<ActionType, string> = {
  NONE: '—',
  NEXT: 'Next video',
  PREVIOUS: 'Previous video',
  PLAY_PAUSE: 'Play / Pause',
  LIKE: 'Like',
  VOLUME_UP: 'Volume up',
  VOLUME_DOWN: 'Volume down',
  MUTE: 'Mute / Unmute',
};

export interface Profile {
  id: string;
  name: string;
  /** id of a WebTarget in webController/targets.ts */
  targetId: string;
  mappings: Partial<Record<GestureType, ActionType>>;
}

const SHORT_VIDEO: Profile['mappings'] = {
  FLICK_UP: 'NEXT',
  FLICK_DOWN: 'PREVIOUS',
  SINGLE_CLICK: 'PLAY_PAUSE',
  DOUBLE_CLICK: 'LIKE',
  TWIST_CW: 'VOLUME_UP',
  TWIST_CCW: 'VOLUME_DOWN',
  HOLD: 'MUTE',
};

export const DEFAULT_PROFILES: Profile[] = [
  { id: 'tiktok', name: 'TikTok', targetId: 'tiktok', mappings: { ...SHORT_VIDEO } },
  { id: 'shorts', name: 'YouTube Shorts', targetId: 'shorts', mappings: { ...SHORT_VIDEO } },
  { id: 'reels', name: 'Instagram Reels', targetId: 'reels', mappings: { ...SHORT_VIDEO } },
  {
    id: 'media',
    name: 'Media',
    targetId: 'custom',
    mappings: { SINGLE_CLICK: 'PLAY_PAUSE', FLICK_RIGHT: 'NEXT', FLICK_LEFT: 'PREVIOUS', TWIST_CW: 'VOLUME_UP', TWIST_CCW: 'VOLUME_DOWN' },
  },
  { id: 'custom', name: 'Custom', targetId: 'custom', mappings: {} },
];
