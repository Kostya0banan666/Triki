import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useApp } from './AppContext';
import { runSystemAction, systemControlSupported } from '../system/SystemControl';

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
      if (appState.current === 'active') return;
      const action = profile.mappings[e.type];
      if (action && action !== 'NONE') runSystemAction(action);
    });
  }, [engine, profiles, activeProfileId, systemControl]);
}
