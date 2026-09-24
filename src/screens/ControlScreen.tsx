import React, { useState } from 'react';
import { Linking, Platform, Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { triki } from '../bluetooth/TrikiBLE';
import { useApp } from '../hooks/AppContext';
import { GESTURE_INFO, MAPPABLE_GESTURES } from '../gestures/types';
import { ACTION_LABEL } from '../profiles/profiles';
import { openAccessibilitySettings, openAppSettings, systemControlSupported } from '../system/SystemControl';
import { AppHeader, StepPills } from '../components/Header';
import { CapStage } from '../components/CapStage';
import { LiveMeters, useLiveSnapshot } from '../components/LiveMeters';
import { Badge, Card, GlowButton, Row, Screen, T, Txt } from '../components/ui';
import { GESTURE_ICON, type IconName } from '../components/theme';

export type TabId = 'control' | 'moves' | 'mapping' | 'advanced' | 'web';

export function ControlScreen({ go }: { go: (tab: TabId) => void }) {
  const { status, profile, profiles, setActiveProfileId, output, setOutput, serviceOn, refreshService } = useApp();
  const [led, setLed] = useState(false);
  const streaming = status.state === 'streaming';
  const connected = streaming || status.state === 'connected';
  const android = Platform.OS === 'android';
  const outputReady = android ? systemControlSupported && serviceOn && output : true;

  const steps = [
    { label: 'Connect', done: streaming },
    { label: 'Choose app', done: streaming },
    { label: 'Turn on', done: streaming && outputReady },
    { label: 'Play!', done: false },
  ];

  const led$ = (on: boolean) => {
    setLed(on);
    triki.setLed(on);
  };

  return (
    <Screen>
      <AppHeader subtitle="Motion controller for your phone" />
      <StepPills steps={steps} />

      <Card title="Your cap live" badge={<Badge label={streaming ? 'live' : connected ? 'paused' : 'offline'} color={streaming ? T.green : T.faint} />}>
        <CapStage led={led} />
        <NowChip />
        <View style={{ height: 14 }} />
        <LiveMeters />
      </Card>

      <Card title="Step 1 — Connect">
        <ConnectButton />
      </Card>

      <Card title="Step 2 — Choose app" badge={<Badge label={profile.name} color={T.green} />}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {profiles.map((p) => {
            const sel = p.id === profile.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setActiveProfileId(p.id)}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  padding: 14,
                  borderRadius: 20,
                  backgroundColor: sel ? 'rgba(255,61,203,0.08)' : T.inset,
                  borderWidth: sel ? 2 : 1,
                  borderColor: sel ? T.magenta : T.insetBorder,
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <MaterialCommunityIcons name={p.icon as IconName} size={36} color={sel ? p.color : T.purple} />
                <Txt weight="bold" style={{ fontSize: 17 }}>
                  {p.name}
                </Txt>
                <Txt style={{ color: T.dim, fontSize: 12, textAlign: 'center' }}>{p.subtitle}</Txt>
                {sel ? (
                  <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: T.magenta, borderRadius: 11, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                    <MaterialCommunityIcons name="check-bold" size={14} color="#fff" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card title="Step 3 — Output">
        {android && systemControlSupported ? (
          serviceOn ? (
            <>
              <GlowButton big label={output ? '● ON' : '○ OFF'} kind={output ? 'green' : 'dark'} active={output} onPress={() => setOutput(!output)} />
              <Txt style={{ color: T.dim, fontSize: 13, marginTop: 10, textAlign: 'center' }}>
                {output ? `Moves control ${profile.name} while this app is in the background.` : 'Output is off. Moves are only shown here.'}
              </Txt>
            </>
          ) : (
            <View style={{ gap: 10 }}>
              <Txt style={{ color: T.amber }}>
                Android needs your OK before any app may swipe for you. Turn on <Txt weight="bold" style={{ color: T.amber }}>Triki Controller</Txt> in Accessibility.
              </Txt>
              <GlowButton big label="Enable phone control" icon="gesture-swipe-vertical" onPress={openAccessibilitySettings} />
              <Pressable onPress={openAppSettings}>
                <Txt style={{ color: T.cyan, fontSize: 13 }}>
                  Greyed out / “Restricted setting”? Open App info → ⋮ → Allow restricted settings, then try again.
                </Txt>
              </Pressable>
              <Pressable onPress={refreshService}>
                <Txt style={{ color: T.dim, fontSize: 13 }}>Already enabled? Tap to re-check.</Txt>
              </Pressable>
            </View>
          )
        ) : android ? (
          <Txt style={{ color: T.amber }}>This build is missing the Android control module. Rebuild the app with EAS.</Txt>
        ) : (
          <View style={{ gap: 10 }}>
            <Txt style={{ color: T.dim }}>
              iPhone does not let any app swipe inside TikTok. Use the built-in player: your moves control videos there.
            </Txt>
            <GlowButton label="Open web player" icon="web" onPress={() => go('web')} />
          </View>
        )}
      </Card>

      <Card title="Step 4 — Play!">
        {android && profile.openUrl ? (
          <GlowButton
            label={`Open ${profile.name}`}
            icon="open-in-new"
            kind="cyan"
            onPress={() => Linking.openURL(profile.openUrl!).catch(() => Linking.openURL('https://www.tiktok.com'))}
          />
        ) : null}
        <View style={{ marginTop: 12, gap: 8 }}>
          {MAPPABLE_GESTURES.filter((g) => profile.mappings[g] && profile.mappings[g] !== 'NONE').map((g) => (
            <View key={g} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: T.chip, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name={GESTURE_ICON[g]} size={19} color={T.cyan} />
              </View>
              <Txt weight="semibold" style={{ flex: 1 }}>
                {GESTURE_INFO[g].label}
              </Txt>
              <Txt weight="semibold" style={{ color: T.green }}>
                {ACTION_LABEL[profile.mappings[g]!]}
              </Txt>
            </View>
          ))}
        </View>
        <Pressable onPress={() => go('moves')} style={{ marginTop: 12 }}>
          <Txt style={{ color: T.cyan }}>Not sure how to do a move? Open the moves guide ›</Txt>
        </Pressable>
      </Card>

      <Row>
        <GlowButton
          label="Test LED"
          icon="lightbulb-on-outline"
          kind="dark"
          disabled={!connected}
          onPressIn={() => led$(true)}
          onPressOut={() => led$(false)}
          style={{ flex: 1 }}
        />
        <GlowButton label="Advanced" icon="tune-variant" kind="dark" onPress={() => go('advanced')} style={{ flex: 1 }} />
      </Row>

      <Txt style={{ color: T.faint, fontSize: 12, textAlign: 'center' }}>
        {streaming ? `UART ready · streaming · start=${triki.startCommandHex}` : `Bluetooth: ${status.state}`}
      </Txt>
    </Screen>
  );
}

function ConnectButton() {
  const { status } = useApp();
  const st = status.state;
  const streaming = st === 'streaming';
  const connected = streaming || st === 'connected';
  const busy = st === 'scanning' || st === 'connecting' || st === 'reconnecting';
  const label = streaming
    ? 'Connected'
    : st === 'connected'
      ? 'Start sensor'
      : st === 'scanning'
        ? 'Searching…'
        : st === 'connecting'
          ? 'Connecting…'
          : st === 'reconnecting'
            ? 'Reconnecting…'
            : 'Connect';
  return (
    <View style={{ gap: 12 }}>
      <GlowButton
        big
        label={label}
        icon={streaming ? 'bluetooth-connect' : 'bluetooth'}
        active={streaming}
        disabled={busy || st === 'bluetooth-off'}
        onPress={() => {
          if (st === 'connected') triki.startSensor().catch(() => {});
          else if (!streaming) triki.quickConnect();
        }}
      />
      {status.device && (connected || busy) ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Txt weight="bold" style={{ fontSize: 17 }}>
              {status.device.name}
            </Txt>
            <Txt style={{ color: T.dim, fontSize: 13 }}>
              {status.rssi != null ? `Signal ${status.rssi} dBm` : 'Signal —'}
              {status.battery != null ? ` · Battery ${status.battery}%` : ''}
            </Txt>
          </View>
          <GlowButton label="Disconnect" kind="danger" onPress={() => triki.disconnect()} />
        </View>
      ) : null}
      {st === 'scanning' ? <Txt style={{ color: T.dim, textAlign: 'center' }}>Wake the cap: press its button once.</Txt> : null}
      {status.error ? <Txt style={{ color: T.amber, textAlign: 'center' }}>{status.error}</Txt> : null}
      {status.stalled ? <Txt style={{ color: T.amber, textAlign: 'center' }}>No data. The cap may be asleep; press its button.</Txt> : null}
    </View>
  );
}

/** Current move, big and green like "IDLE" on TRIKI Control, plus what it does in the active app. */
function NowChip() {
  const { lastGesture, profile, status } = useApp();
  const { state } = useLiveSnapshot(8);
  const streaming = status.state === 'streaming';
  const fresh = lastGesture && Date.now() - lastGesture.t < 1500 ? lastGesture : null;
  const live = state.action !== 'IDLE' && state.action !== 'SETTLING' ? state.action : null;
  const move = fresh?.type ?? live;
  const title = !streaming
    ? 'OFFLINE'
    : state.action === 'SETTLING'
      ? 'HOLD STILL…'
      : move
        ? GESTURE_INFO[move].label.toUpperCase()
        : 'IDLE';
  const action = move ? profile.mappings[move] : undefined;
  return (
    <View style={{ alignItems: 'center', marginTop: 14, gap: 2 }}>
      <Txt weight="bold" style={{ fontSize: 30, color: streaming ? T.green : T.faint, letterSpacing: 1 }}>
        {title}
      </Txt>
      <Txt style={{ color: T.dim, fontSize: 14 }}>
        {state.action === 'SETTLING' && streaming
          ? 'Learning the cap’s rest position'
          : action && action !== 'NONE'
            ? `→ ${ACTION_LABEL[action]}`
            : streaming
              ? 'Ready'
              : 'Connect the cap below'}
      </Txt>
    </View>
  );
}
