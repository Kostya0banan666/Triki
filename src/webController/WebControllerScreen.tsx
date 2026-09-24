import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { useApp } from '../hooks/AppContext';
import { ACTION_LABEL } from '../profiles/profiles';
import { GESTURE_LABEL } from '../gestures/types';
import { WEB_TARGETS, scriptFor } from './targets';
import { Btn, C, Row, s } from '../components/ui';

/**
 * Fallback controller: the web service runs INSIDE our own WebView, so Triki
 * gestures can scroll/play/pause it via injected JavaScript. This does not and
 * cannot control the native TikTok app.
 */
export function WebControllerScreen() {
  const { engine, profiles, activeProfileId, status } = useApp();
  const profile = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
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
        web.current?.injectJavaScript(scriptFor(target, action));
        Haptics.selectionAsync().catch(() => {});
        setLast(`${GESTURE_LABEL[e.type]} → ${ACTION_LABEL[action]}`);
      }),
    [engine, profile, target],
  );

  const run = (a: Parameters<typeof scriptFor>[1]) => web.current?.injectJavaScript(scriptFor(target, a));

  return (
    <View style={[s.screen, { paddingTop: 54 }]}>
      <View style={{ paddingHorizontal: 12, gap: 6, paddingBottom: 6 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => setUrl(/^https?:\/\//.test(draft) ? draft : `https://${draft}`)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={{ backgroundColor: C.card, color: C.text, borderRadius: 10, padding: 9 }}
        />
        <Text style={s.dim}>
          {profile.name} · {status.state === 'streaming' ? 'Triki live' : 'Triki not streaming'} {last ? `· ${last}` : ''}
        </Text>
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
      <Row style={{ padding: 10, paddingBottom: 96, backgroundColor: C.bg }}>
        <Btn label="▲" onPress={() => run('PREVIOUS')} />
        <Btn label="▶︎❚❚" onPress={() => run('PLAY_PAUSE')} />
        <Btn label="▼" onPress={() => run('NEXT')} />
      </Row>
    </View>
  );
}
