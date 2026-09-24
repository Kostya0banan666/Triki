import React, { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { useApp } from '../hooks/AppContext';
import { ACTION_LABEL, REPEATABLE, type ActionType } from '../profiles/profiles';
import { GESTURE_INFO } from '../gestures/types';
import { WEB_TARGETS, scriptFor } from './targets';
import { GlowButton, Row, T, Txt } from '../components/ui';
import { F } from '../components/theme';

/**
 * Fallback controller (iPhone): the web service runs INSIDE our own WebView,
 * so Triki moves can scroll/play/pause it via injected JavaScript. This does
 * not and cannot control the native TikTok app.
 */
export function WebControllerScreen() {
  const { engine, profile, status } = useApp();
  const target = WEB_TARGETS.find((t) => t.id === profile.targetId) ?? WEB_TARGETS[0];
  const web = useRef<WebView>(null);
  const [url, setUrl] = useState(target.url);
  const [draft, setDraft] = useState(target.url);
  const [last, setLast] = useState('');

  useEffect(() => {
    setUrl(target.url);
    setDraft(target.url);
  }, [target.url]);

  useEffect(
    () =>
      engine.on((e) => {
        const action = profile.mappings[e.type];
        if (!action || action === 'NONE') return;
        if (e.repeat && !REPEATABLE.has(action)) return;
        web.current?.injectJavaScript(scriptFor(target, action));
        Haptics.selectionAsync().catch(() => {});
        setLast(`${GESTURE_INFO[e.type].label} → ${ACTION_LABEL[action]}`);
      }),
    [engine, profile, target],
  );

  const run = (a: ActionType) => web.current?.injectJavaScript(scriptFor(target, a));

  return (
    <View style={{ flex: 1, backgroundColor: T.bgMid, paddingTop: 54 }}>
      <View style={{ paddingHorizontal: 12, gap: 6, paddingBottom: 8 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => setUrl(/^https?:\/\//.test(draft) ? draft : `https://${draft}`)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{ backgroundColor: T.chip, color: T.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: F.medium }}
        />
        <Txt style={{ color: T.dim, fontSize: 13 }}>
          {profile.name} · {status.state === 'streaming' ? 'cap live' : 'cap not streaming'} {last ? `· ${last}` : ''}
        </Txt>
      </View>
      <WebView
        ref={web}
        source={{ uri: url }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
        onLoadEnd={() => web.current?.injectJavaScript(scriptFor(target, 'NONE'))}
      />
      <Row style={{ padding: 10, paddingBottom: 100, backgroundColor: T.bgMid }}>
        <GlowButton label="▲" kind="dark" onPress={() => run('PREVIOUS')} style={{ flex: 1 }} />
        <GlowButton label="▶︎ ❚❚" kind="dark" onPress={() => run('PLAY_PAUSE')} style={{ flex: 1 }} />
        <GlowButton label="▼" kind="dark" onPress={() => run('NEXT')} style={{ flex: 1 }} />
      </Row>
    </View>
  );
}
