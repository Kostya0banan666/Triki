import { Platform } from 'react-native';
import { TrikiAccessibility } from '../../modules/triki-accessibility';
import type { ActionType } from '../profiles/profiles';
import { log } from '../utils/log';

/**
 * System-wide control of the foreground app. Android only: backed by an
 * AccessibilityService (public API) plus media keys. iOS has no equivalent.
 */
export const systemControlSupported = Platform.OS === 'android' && TrikiAccessibility != null;

export function isSystemServiceEnabled(): boolean {
  try {
    return TrikiAccessibility?.isServiceEnabled() ?? false;
  } catch {
    return false;
  }
}

export function openAccessibilitySettings(): void {
  TrikiAccessibility?.openAccessibilitySettings();
}

export function openAppSettings(): void {
  TrikiAccessibility?.openAppSettings();
}

/** Keeps the app process alive in the background (Android foreground service). */
export function setKeepAlive(on: boolean, text = 'Triki is controlling your phone'): void {
  try {
    if (on) TrikiAccessibility?.startKeepAlive('Triki Controller', text);
    else TrikiAccessibility?.stopKeepAlive();
  } catch (e) {
    log(`Keep-alive ${on ? 'start' : 'stop'} failed: ${String(e)}`, 'warn');
  }
}

// Android KeyEvent codes
const KEY_MEDIA_PLAY_PAUSE = 85;
const KEY_MEDIA_NEXT = 87;
const KEY_MEDIA_PREVIOUS = 88;

/** Screen-fraction coordinates tuned for full-screen vertical video feeds. */
const CENTER = { x: 0.5, y: 0.45 };
const SWIPE_MS = 170;

export function runSystemAction(action: ActionType): boolean {
  const m = TrikiAccessibility;
  if (!m || action === 'NONE') return false;
  switch (action) {
    case 'NEXT':
      return m.swipe(0.5, 0.74, 0.5, 0.26, SWIPE_MS);
    case 'PREVIOUS':
      return m.swipe(0.5, 0.26, 0.5, 0.74, SWIPE_MS);
    case 'PLAY_PAUSE':
      return m.tap(CENTER.x, CENTER.y, 1);
    case 'LIKE':
      return m.tap(CENTER.x, CENTER.y, 2);
    case 'VOLUME_UP':
      return m.adjustVolume(1);
    case 'VOLUME_DOWN':
      return m.adjustVolume(-1);
    case 'MUTE':
      return m.adjustVolume(0);
    case 'MEDIA_PLAY_PAUSE':
      return m.mediaKey(KEY_MEDIA_PLAY_PAUSE);
    case 'MEDIA_NEXT':
      return m.mediaKey(KEY_MEDIA_NEXT);
    case 'MEDIA_PREVIOUS':
      return m.mediaKey(KEY_MEDIA_PREVIOUS);
    case 'BACK':
      return m.globalAction('back');
  }
  return false;
}
