# TRIKI Control (phone)

Turn the **Żabka Triki / HOPX** Bluetooth bottle cap into a remote for your phone:
twist the cap to scroll TikTok, knock it to pause, flip it to mute.

| | Android | iPhone |
|---|---|---|
| Control the real TikTok / Shorts / Reels apps | ✅ (Accessibility service: real swipes and taps) | ❌ Apple allows no app to touch other apps |
| Media keys (Spotify etc.): play/pause, next, previous | ✅ | ❌ |
| Built-in web player controlled by the cap | – | ✅ (native app needs a paid Apple account; free route is the Bluefy web page) |
| Price | Free: download the APK | Paid Apple Developer account, or free web page |

## Install on Android (free, no computer)

1. On the phone, open **https://github.com/Kostya0banan666/Triki/releases/latest/download/triki-controller.apk**
   (built automatically by GitHub Actions on every change). Allow “install unknown apps” for your browser.
   If you installed an EAS-built copy before, uninstall it first (different signature).
2. Open **TRIKI Control** and follow the 4 steps on the main screen:
   1. **Connect**: press the cap's button once to wake it, tap Connect, allow *Nearby devices*.
   2. **Choose app**: TikTok, Shorts, Reels, Music or Custom.
   3. **Output**: tap *Enable phone control* and switch on **Triki Controller** in Accessibility.
      Android 13+ may say *Restricted setting*: App info → ⋮ → *Allow restricted settings*, then try again.
   4. **Play!**: tap *Open TikTok* and use the cap. A notification shows while Triki is in control.
3. If Android kills it in the background: App info → Battery → **Unrestricted**.

## The moves

The cap is round and has **no compass**, so it can never know which way is “up” or “left”.
Every move is therefore *heading-free*: it works however the cap is turned
(this is why the old “flick up/left” gestures were unreliable and were removed).
The **Moves** tab shows each one animated and lets you practise.

| Move | How | TikTok default |
|---|---|---|
| Twist right / left | Flat on the table, twist like a dial | Next / previous video |
| Tap | Knock it straight down once | Pause / play |
| Double tap | Knock-knock | Like |
| Slide | Push it flat across the table | Next video |
| Flip | Turn it upside-down | Mute |
| Tilt & hold | Lean it any direction and hold | (free) |
| Button click / double / hold | The cap's button | Pause / Like / Back |

Holding a twist repeats, so in the **Music** profile the cap is a volume knob.
Every mapping is editable (Mapping tab) and each profile has its own tuning (Advanced tab).

## iPhone

- **Free:** the web version in [`web/`](web/index.html) runs in the **Bluefy** browser (Web Bluetooth),
  published by GitHub Pages at `https://kostya0banan666.github.io/Triki/` once Pages is enabled
  (repo Settings → Pages → Source: GitHub Actions). It shows the cap live, teaches the moves and controls videos on that page only.
- **Native app:** needs the paid Apple Developer Program ($99/yr) because EAS cannot sign iOS apps with a free Apple ID.
  Then `npx eas-cli build --platform ios --profile preview` from a Codespace. On iPhone the cap controls the in-app Web tab.

## Build it yourself

Everything builds in the cloud; no Mac or PC needed.

- **GitHub Actions** (free, automatic): `.github/workflows/android-apk.yml` builds the APK on each push to `main`;
  `ci.yml` runs the TypeScript check and unit tests and deploys the web page.
- **EAS** (optional): in a Codespace, `export EXPO_TOKEN=…` (expo.dev → Access tokens), then
  `npx eas-cli@latest build --platform android --profile preview`.

## Code map

```
App.tsx                         fonts, tabs
src/bluetooth/TrikiBLE.ts       scan / one-tap connect / reconnect / LED / stream start (~53 Hz)
src/bluetooth/TrikiFrameParser  byte-stream → 14-byte frames (fragment-safe), unit tested
src/gestures/GestureEngine.ts   heading-free motion engine + tap/button timing, unit tested
src/profiles/profiles.ts        TikTok / Shorts / Reels / Music / Custom mappings + tuning
src/system/SystemControl.ts     actions → Android swipes, taps, volume, media keys
modules/triki-accessibility/    Kotlin: AccessibilityService, foreground service, media keys
src/screens/                    Control, Moves, Mapping, Advanced
src/components/                 cap mascot (SVG), live stage, move demos, neon UI kit
src/webController/              iPhone in-app web player
web/                            Bluefy web version (uses the same engine, bundled by CI)
```

Protocol: Nordic UART `6E400001…`; write `20 10 00 D0 07 34 00 03` to RX (`…0002`) after subscribing to TX (`…0003`);
14-byte frames `22 <button> gyroXYZ accelXYZ` (int16 LE); LED on/off = write `01`/`00` to `…0004`.

## Credits

The motion engine and protocol details are adapted from **[TRIKI Control](https://github.com/koksny/TRIKI-Control)**
by Wojciech “Koksny” Górny (MIT), which also inspired the look. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
Not affiliated with Żabka or Caps Apps.
