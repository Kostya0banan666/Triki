import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useApp } from './AppContext';
import { runSystemAction, systemControlSupported } from '../system/SystemControl';
import { ACTION_LABEL, REPEATABLE } from '../profiles/profiles';
import { GESTURE_INFO } from '../gestures/types';
import { log } from '../utils/log';

/**
 * Routes recognised moves to system-wide swipes/taps/keys (Android) using the
 * active profile. Only fires while our app is in the background, so it drives
 * TikTok/Shorts/Reels and never swipes our own UI.
 */
export function useSystemControl(): void {
  const { engine, profile, output } = useApp();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => (appState.current = s));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!systemControlSupported || !output) return;
    return engine.on((e) => {
      const action = profile.mappings[e.type];
      if (!action || action === 'NONE') return;
      if (e.repeat && !REPEATABLE.has(action)) return;
      const label = `${GESTURE_INFO[e.type].label} → ${ACTION_LABEL[action]}`;
      if (appState.current === 'active') {
        if (!e.repeat) log(`${label}: not sent (Triki app is on screen, open ${profile.name})`);
        return;
      }
      const ok = runSystemAction(action);
      if (!e.repeat || !ok) log(`${label}: ${ok ? 'sent' : 'FAILED, accessibility service off?'}`, ok ? 'info' : 'warn');
    });
  }, [engine, profile, output]);
}
