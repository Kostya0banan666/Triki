import { Platform } from 'react-native';
import { TrikiAccessibility } from '../../modules/triki-accessibility';
import type { ActionType } from '../profiles/profiles';
import { log } from '../utils/log';

/**
 * System-wide control of the foreground app. Android only: backed by an
 * AccessibilityService (public API). iOS has no equivalent, so this is a no-op there.
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

/** Screen-fraction coordinates tuned for full-screen vertical video feeds. */
const CENTER = { x: 0.5, y: 0.45 };
const SWIPE_MS = 160;

export function runSystemAction(action: ActionType): boolean {
  const m = TrikiAccessibility;
  if (!m || action === 'NONE') return false;
  let ok = false;
  switch (action) {
    case 'NEXT':
      ok = m.swipe(0.5, 0.75, 0.5, 0.25, SWIPE_MS);
      break;
    case 'PREVIOUS':
      ok = m.swipe(0.5, 0.25, 0.5, 0.75, SWIPE_MS);
      break;
    case 'PLAY_PAUSE':
      ok = m.tap(CENTER.x, CENTER.y, 1);
      break;
    case 'LIKE':
      ok = m.tap(CENTER.x, CENTER.y, 2);
      break;
    case 'VOLUME_UP':
      ok = m.adjustVolume(1);
      break;
    case 'VOLUME_DOWN':
      ok = m.adjustVolume(-1);
      break;
    case 'MUTE':
      ok = m.adjustVolume(0);
      break;
  }
  if (!ok) log(`System action ${action} failed (accessibility service off?)`, 'warn');
  return ok;
}
