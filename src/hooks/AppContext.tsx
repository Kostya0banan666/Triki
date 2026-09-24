import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { triki, type TrikiStatus } from '../bluetooth/TrikiBLE';
import { GestureEngine } from '../gestures/GestureEngine';
import { DEFAULT_THRESHOLDS, type GestureEvent, type GestureThresholds } from '../gestures/types';
import { DEFAULT_PROFILES, type Profile } from '../profiles/profiles';
import { load, save } from '../utils/storage';

interface AppCtx {
  status: TrikiStatus;
  engine: GestureEngine;
  thresholds: GestureThresholds;
  setThresholds: (t: GestureThresholds) => void;
  profiles: Profile[];
  setProfiles: (p: Profile[]) => void;
  activeProfileId: string;
  setActiveProfileId: (id: string) => void;
  lastGesture: GestureEvent | null;
  /** Android: drive the foreground app via the accessibility service */
  systemControl: boolean;
  setSystemControl: (v: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const engineRef = useRef(new GestureEngine());
  const engine = engineRef.current;
  const [status, setStatus] = useState<TrikiStatus>(triki.status);
  const [thresholds, setThr] = useState<GestureThresholds>(DEFAULT_THRESHOLDS);
  const [profiles, setProf] = useState<Profile[]>(DEFAULT_PROFILES);
  const [activeProfileId, setActive] = useState('tiktok');
  const [systemControl, setSys] = useState(false);
  const [lastGesture, setLastGesture] = useState<GestureEvent | null>(null);

  useEffect(() => {
    (async () => {
      const t = await load('thresholds', DEFAULT_THRESHOLDS);
      const merged = { ...DEFAULT_THRESHOLDS, ...t };
      setThr(merged);
      engine.setThresholds(merged);
      setProf(await load('profiles', DEFAULT_PROFILES));
      setActive(await load('activeProfile', 'tiktok'));
      setSys(await load('systemControl', false));
    })();
  }, [engine]);

  useEffect(() => {
    const offStatus = triki.onStatus(setStatus);
    const offFrame = triki.onFrame((f, t) => engine.process(f, t));
    const offGesture = engine.on(setLastGesture);
    // resolve timed gestures (hold / single-click) even if frames pause
    const iv = setInterval(() => engine.tick(Date.now()), 50);
    return () => {
      offStatus();
      offFrame();
      offGesture();
      clearInterval(iv);
    };
  }, [engine]);

  const value = useMemo<AppCtx>(
    () => ({
      status,
      engine,
      thresholds,
      setThresholds: (t) => {
        setThr(t);
        engine.setThresholds(t);
        save('thresholds', t);
      },
      profiles,
      setProfiles: (p) => {
        setProf(p);
        save('profiles', p);
      },
      activeProfileId,
      setActiveProfileId: (id) => {
        setActive(id);
        save('activeProfile', id);
      },
      lastGesture,
      systemControl,
      setSystemControl: (v) => {
        setSys(v);
        save('systemControl', v);
      },
    }),
    [status, engine, thresholds, profiles, activeProfileId, lastGesture, systemControl],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside AppProvider');
  return c;
}
