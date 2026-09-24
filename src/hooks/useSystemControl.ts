import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useApp } from './AppContext';
import { runSystemAction, systemControlSupported } from '../system/SystemControl';
import { log } from '../utils/log';

/**
 * Routes recognised gestures to system-wide swipes/taps (Android) using the
 * active profile. Only fires while our app is in the background, so it drives
 * TikTok/Shorts/Reels and never swipes our own UI.
 */
export function useSystemControl(): void {
  const { engine, profiles, activeProfileId, systemControl } = useApp();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => (appState.current = s));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!systemControlSupported || !systemControl) return;
    const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
    return engine.on((e) => {
      const action = profile.mappings[e.type];
      if (!action || action === 'NONE') return;
      if (appState.current === 'active') {
        log(`${e.type} -> ${action} skipped (Triki app is on screen; switch to TikTok)`);
        return;
      }
      const ok = runSystemAction(action);
      log(`${e.type} -> ${action} ${ok ? 'sent' : 'FAILED'}`, ok ? 'info' : 'warn');
    });
  }, [engine, profiles, activeProfileId, systemControl]);
}
