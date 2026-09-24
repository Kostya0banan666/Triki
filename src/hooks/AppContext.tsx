import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { triki, type TrikiStatus } from '../bluetooth/TrikiBLE';
import { DEFAULT_RATE, type StreamRate } from '../bluetooth/constants';
import { GestureEngine } from '../gestures/GestureEngine';
import { DEFAULT_THRESHOLDS, type GestureEvent, type GestureThresholds } from '../gestures/types';
import { DEFAULT_PROFILES, type Profile } from '../profiles/profiles';
import { isSystemServiceEnabled, setKeepAlive, systemControlSupported } from '../system/SystemControl';
import { load, save } from '../utils/storage';

interface AppCtx {
  status: TrikiStatus;
  engine: GestureEngine;
  profiles: Profile[];
  setProfiles: (p: Profile[]) => void;
  profile: Profile;
  setActiveProfileId: (id: string) => void;
  /** effective tuning of the active profile */
  thresholds: GestureThresholds;
  setThresholds: (t: Partial<GestureThresholds>) => void;
  resetThresholds: () => void;
  lastGesture: GestureEvent | null;
  /** master switch: send actions to other apps (Android) */
  output: boolean;
  setOutput: (v: boolean) => void;
  /** Android accessibility service is enabled */
  serviceOn: boolean;
  refreshService: () => void;
  streamRate: StreamRate;
  setStreamRate: (r: StreamRate) => void;
}

const Ctx = createContext<AppCtx | null>(null);

// v2: moves were redesigned (heading-free), old v1 mappings are not compatible
const K_PROFILES = 'profiles.v2';
const K_ACTIVE = 'activeProfile.v2';
const K_OUTPUT = 'output.v2';
const K_RATE = 'streamRate';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef(new GestureEngine());
  const engine = engineRef.current;
  const [status, setStatus] = useState<TrikiStatus>(triki.status);
  const [profiles, setProf] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeId, setActive] = useState('tiktok');
  const [output, setOut] = useState(true);
  const [serviceOn, setServiceOn] = useState(isSystemServiceEnabled());
  const [streamRate, setRate] = useState<StreamRate>(DEFAULT_RATE);
  const [lastGesture, setLastGesture] = useState<GestureEvent | null>(null);

  const profile = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const thresholds = useMemo(() => ({ ...DEFAULT_THRESHOLDS, ...profile.tuning }), [profile]);

  // load saved settings
  useEffect(() => {
    (async () => {
      const saved = await load<Profile[]>(K_PROFILES, DEFAULT_PROFILES);
      // keep new built-in profiles/fields when the app updates
      setProf(DEFAULT_PROFILES.map((d) => ({ ...d, ...(saved.find((s) => s.id === d.id) ?? {}) })));
      setActive(await load(K_ACTIVE, 'tiktok'));
      setOut(await load(K_OUTPUT, true));
      const rate = await load<StreamRate>(K_RATE, DEFAULT_RATE);
      setRate(rate);
      triki.streamRate = rate;
    })();
  }, []);

  // apply tuning + tap mode of the active profile to the engine
  useEffect(() => {
    engine.setThresholds(thresholds);
    const dt = profile.mappings.DOUBLE_TAP;
    engine.deferTap = !!dt && dt !== 'NONE';
  }, [engine, thresholds, profile]);

  useEffect(() => {
    let prev = triki.status.state;
    const offStatus = triki.onStatus((s) => {
      // fresh stream -> re-learn the cap's rest pose
      if (s.state === 'streaming' && prev !== 'streaming') engine.reset();
      prev = s.state;
      setStatus(s);
    });
    const offFrame = triki.onFrame((f, t) => engine.process(f, t));
    const offGesture = engine.on((e) => {
      if (!e.repeat && e.type !== 'BUTTON_PRESS' && e.type !== 'BUTTON_RELEASE') setLastGesture(e);
    });
    // resolve timed gestures (single tap/click, hold) even if frames pause
    const iv = setInterval(() => engine.tick(Date.now()), 50);
    const sub = AppState.addEventListener('change', (st) => st === 'active' && setServiceOn(isSystemServiceEnabled()));
    return () => {
      offStatus();
      offFrame();
      offGesture();
      clearInterval(iv);
      sub.remove();
    };
  }, [engine]);

  // Android: foreground service while controlling other apps
  const connected = status.state === 'connected' || status.state === 'streaming' || status.state === 'reconnecting';
  const keepAlive = systemControlSupported && output && serviceOn && connected;
  useEffect(() => {
    if (!systemControlSupported) return;
    setKeepAlive(keepAlive, 'Triki is controlling your phone. Tap to open.');
  }, [keepAlive]);

  const value = useMemo<AppCtx>(() => {
    const updateProfile = (p: Profile) => {
      const next = profiles.map((x) => (x.id === p.id ? p : x));
      setProf(next);
      save(K_PROFILES, next);
    };
    return {
      status,
      engine,
      profiles,
      setProfiles: (p) => {
        setProf(p);
        save(K_PROFILES, p);
      },
      profile,
      setActiveProfileId: (id) => {
        setActive(id);
        save(K_ACTIVE, id);
      },
      thresholds,
      setThresholds: (t) => updateProfile({ ...profile, tuning: { ...profile.tuning, ...t } }),
      resetThresholds: () =>
        updateProfile({ ...profile, tuning: DEFAULT_PROFILES.find((d) => d.id === profile.id)?.tuning }),
      lastGesture,
      output,
      setOutput: (v) => {
        setOut(v);
        save(K_OUTPUT, v);
        if (v && Platform.OS === 'android' && Number(Platform.Version) >= 33) {
          // lets the "Triki is controlling your phone" notification show
          PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch(() => {});
        }
      },
      serviceOn,
      refreshService: () => setServiceOn(isSystemServiceEnabled()),
      streamRate,
      setStreamRate: (r) => {
        setRate(r);
        save(K_RATE, r);
        triki.streamRate = r;
      },
    };
  }, [status, engine, profiles, profile, thresholds, lastGesture, output, serviceOn, streamRate]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
