import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { GestureType } from '../gestures/types';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Neon-on-deep-purple palette (inspired by TRIKI Control). */
export const T = {
  bgTop: '#1A1038',
  bgMid: '#100C26',
  bgBottom: '#0A1622',
  card: 'rgba(34, 27, 76, 0.62)',
  cardBorder: 'rgba(140, 120, 255, 0.20)',
  inset: '#120D2A',
  insetBorder: 'rgba(140, 120, 255, 0.16)',
  chip: '#221B4A',
  text: '#F5F2FF',
  dim: '#A39BD6',
  faint: '#6A62A0',
  cyan: '#4DE3F0',
  green: '#62F296',
  green2: '#2FDDA6',
  magenta: '#FF3DCB',
  pink: '#FF5C9A',
  amber: '#FFC24D',
  red: '#FF5C7A',
  purple: '#8C6CFF',
  ink: '#07140E',
};

export const F = {
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
};

export const GESTURE_ICON: Record<GestureType, IconName> = {
  TWIST_RIGHT: 'rotate-right',
  TWIST_LEFT: 'rotate-left',
  TAP: 'gesture-tap',
  DOUBLE_TAP: 'gesture-double-tap',
  TILT: 'angle-acute',
  FLIP: 'flip-vertical',
  SLIDE: 'gesture-swipe-horizontal',
  CLICK: 'gesture-tap-button',
  DOUBLE_CLICK: 'gesture-tap-button',
  HOLD: 'gesture-tap-hold',
  BUTTON_PRESS: 'radiobox-marked',
  BUTTON_RELEASE: 'radiobox-blank',
};
