import type { GestureThresholds, GestureType } from '../gestures/types';

export type ActionType =
  | 'NONE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'PLAY_PAUSE'
  | 'LIKE'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'MUTE'
  | 'MEDIA_PLAY_PAUSE'
  | 'MEDIA_NEXT'
  | 'MEDIA_PREVIOUS'
  | 'BACK';

export const ALL_ACTIONS: ActionType[] = [
  'NONE',
  'NEXT',
  'PREVIOUS',
  'PLAY_PAUSE',
  'LIKE',
  'VOLUME_UP',
  'VOLUME_DOWN',
  'MUTE',
  'MEDIA_PLAY_PAUSE',
  'MEDIA_NEXT',
  'MEDIA_PREVIOUS',
  'BACK',
];

export const ACTION_LABEL: Record<ActionType, string> = {
  NONE: 'Off',
  NEXT: 'Next video',
  PREVIOUS: 'Previous video',
  PLAY_PAUSE: 'Pause / play (tap screen)',
  LIKE: 'Like (double-tap screen)',
  VOLUME_UP: 'Volume up',
  VOLUME_DOWN: 'Volume down',
  MUTE: 'Mute / unmute',
  MEDIA_PLAY_PAUSE: 'Media play / pause',
  MEDIA_NEXT: 'Next track',
  MEDIA_PREVIOUS: 'Previous track',
  BACK: 'Back',
};

/** Actions that keep firing while a twist/tilt is held (like a knob). */
export const REPEATABLE: ReadonlySet<ActionType> = new Set<ActionType>(['VOLUME_UP', 'VOLUME_DOWN']);

export interface Profile {
  id: string;
  name: string;
  subtitle: string;
  /** MaterialCommunityIcons name */
  icon: string;
  color: string;
  /** id of a WebTarget in webController/targets.ts (iPhone fallback) */
  targetId: string;
  /** deep link used by "Open app" */
  openUrl?: string;
  mappings: Partial<Record<GestureType, ActionType>>;
  /** per-profile tuning overrides */
  tuning?: Partial<GestureThresholds>;
}

const SHORT_VIDEO: Profile['mappings'] = {
  TWIST_RIGHT: 'NEXT',
  TWIST_LEFT: 'PREVIOUS',
  SLIDE: 'NEXT',
  TAP: 'PLAY_PAUSE',
  DOUBLE_TAP: 'LIKE',
  FLIP: 'MUTE',
  CLICK: 'PLAY_PAUSE',
  DOUBLE_CLICK: 'LIKE',
  HOLD: 'BACK',
};

export const DEFAULT_PROFILES: Profile[] = [
  {
    id: 'tiktok',
    name: 'TikTok',
    subtitle: 'Twist to scroll',
    icon: 'music-note',
    color: '#FF3D9A',
    targetId: 'tiktok',
    openUrl: 'snssdk1233://',
    mappings: { ...SHORT_VIDEO },
  },
  {
    id: 'shorts',
    name: 'Shorts',
    subtitle: 'YouTube Shorts',
    icon: 'youtube',
    color: '#FF4B4B',
    targetId: 'shorts',
    openUrl: 'vnd.youtube://shorts',
    mappings: { ...SHORT_VIDEO },
  },
  {
    id: 'reels',
    name: 'Reels',
    subtitle: 'Instagram Reels',
    icon: 'instagram',
    color: '#C86BFF',
    targetId: 'reels',
    openUrl: 'instagram://reels',
    mappings: { ...SHORT_VIDEO },
  },
  {
    id: 'music',
    name: 'Music',
    subtitle: 'Volume knob & tracks',
    icon: 'music-circle',
    color: '#3DE8A0',
    targetId: 'custom',
    mappings: {
      TWIST_RIGHT: 'VOLUME_UP',
      TWIST_LEFT: 'VOLUME_DOWN',
      TAP: 'MEDIA_PLAY_PAUSE',
      SLIDE: 'MEDIA_NEXT',
      DOUBLE_TAP: 'MEDIA_PREVIOUS',
      FLIP: 'MUTE',
      CLICK: 'MEDIA_PLAY_PAUSE',
    },
    tuning: { turnThreshold: 580 },
  },
  {
    id: 'custom',
    name: 'Custom',
    subtitle: 'Your own mapping',
    icon: 'tune-variant',
    color: '#4DD8F0',
    targetId: 'custom',
    mappings: {},
  },
];
