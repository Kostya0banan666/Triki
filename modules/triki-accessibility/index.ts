import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Android-only native module backed by an AccessibilityService. Uses the public
 * AccessibilityService.dispatchGesture API (Android 7+) to perform swipes/taps
 * in whatever app is in the foreground. Null on iOS/web.
 */
interface TrikiAccessibilityNative {
  isServiceEnabled(): boolean;
  openAccessibilitySettings(): boolean;
  openAppSettings(): boolean;
  /** coordinates are fractions of the screen (0..1) */
  swipe(x1: number, y1: number, x2: number, y2: number, durationMs: number): boolean;
  tap(x: number, y: number, count: number): boolean;
  /** 'back' | 'home' | 'recents' */
  globalAction(name: string): boolean;
  /** 1 = up, -1 = down, 0 = toggle mute */
  adjustVolume(direction: number): boolean;
  /** Android KeyEvent keycode, e.g. 85 = play/pause */
  mediaKey(keyCode: number): boolean;
  /** foreground service that keeps the app alive while controlling other apps */
  startKeepAlive(title: string, text: string): boolean;
  stopKeepAlive(): boolean;
}

export const TrikiAccessibility = requireOptionalNativeModule<TrikiAccessibilityNative>('TrikiAccessibility');
