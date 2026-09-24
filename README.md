# Triki Controller (iPhone)

An iPhone app plus a Web Bluetooth page for the **Żabka Triki / HOPX** BLE motion controller.
You do **not** need a Mac. Builds run on Expo's EAS cloud servers.

| Part | Path | What it is |
|---|---|---|
| Native app | `App.tsx`, `src/` | Expo SDK 57 + React Native + `react-native-ble-plx`, built with EAS |
| Web fallback | `web/index.html` | Single page for the **Bluefy** browser (Web Bluetooth). Hosted free on GitHub Pages |
| Tests | `__tests__/` | Jest tests for the stream parser and gesture engine. They run in GitHub Actions |

---

## 1. Apple account: what you actually need

| | Free Apple ID | Apple Developer Program ($99/yr) |
|---|---|---|
| EAS cloud build of a signed `.ipa` for a real iPhone | ❌ EAS cannot sign with a free account. Free "personal team" signing only works through Xcode on a Mac | ✅ |
| Install over the air (EAS "internal distribution", ad hoc) | ❌ | ✅ (after you register your iPhone's UDID) |
| TestFlight | ❌ | ✅ |
| Sideloading tools such as AltStore/Sideloadly | These need a computer and re-sign every 7 days. Not covered here | — |

**Bottom line:** without a Mac, the native app needs the **paid Apple Developer Program**.
If you don't have it, use the **Triki Web Controller** (section 4). It's free and runs in Bluefy.

---

## 2. What iOS allows and what it doesn't

### Supported (implemented here)
- BLE connection to Triki, a live IMU stream, and gesture recognition (CoreBluetooth through ble-plx)
- Controlling video **inside this app**. The **Web** tab loads TikTok, YouTube Shorts, Instagram Reels or any site in a WKWebView, and injects JavaScript to scroll to the next or previous video, play/pause, change volume and mute
- Keeping BLE alive in the background (`bluetooth-central` background mode). This keeps the connection only. It can't act on other apps

### Possible with public APIs, but not controlling TikTok (not implemented)
- **MediaPlayer / MPRemoteCommandCenter** only works when *your* app is the one playing audio. An app can't send play/pause or next commands to another app
- **Shortcuts / App Intents** let the user run *your* app's actions from Shortcuts. They can't trigger gestures in TikTok
- **URL schemes** can *open* TikTok or YouTube (e.g. `snssdk1233://`). They can't scroll or like inside those apps
- **GameController framework** is only for reading game controllers inside your own app. Triki isn't an MFi or HID gamepad

### Not possible with public iOS APIs
- Injecting touches or swipes into another app such as the native TikTok app. There's no public API for this; `UIEvent` synthesis and private frameworks are App Store violations
- Pretending to be a Bluetooth keyboard or HID device from an iPhone app. iOS apps can't advertise the HID-over-GATT profile
- Accessibility **Switch Control** can scan and tap other apps using a *Bluetooth switch*. But Triki only speaks Nordic UART, not the HID switch profile, and an app can't feed Switch Control. The one real system-wide route is hardware: re-flash Triki, or add a relay such as an ESP32 acting as a BLE HID keyboard or switch. That's out of scope

---

## 3. Native app: iPhone-only build steps

Everything runs in the browser on your iPhone. A GitHub Codespace gives you a cloud Linux terminal.

1. **Accounts.** Sign up at github.com and expo.dev. Join the Apple Developer Program at developer.apple.com/programs.
2. **Repository.** Create an empty GitHub repo called `triki-controller` and upload this folder's contents. The easiest way is the GitHub website's "Add file → Upload files", or I can push it for you.
3. **Open a Codespace.** On the repo page, go to **Code → Codespaces → Create codespace on main**. Safari works; use landscape. Then run in the terminal:
   ```bash
   npm install
   npm test
   npx eas-cli@latest login
   ```
4. **Set a unique bundle ID.** In `app.json`, change `com.CHANGEME.trikicontroller` to something like `com.yourname.trikicontroller`.
5. **Link to EAS:**
   ```bash
   npx eas-cli@latest init
   ```
6. **Register your iPhone:**
   ```bash
   npx eas-cli@latest device:create
   ```
   Choose "Website", open the link **on your iPhone in Safari**, and install the profile (Settings → Profile Downloaded → Install).
7. **Build in the cloud:**
   ```bash
   npx eas-cli@latest build --platform ios --profile preview
   ```
   Log in with your Apple ID when asked and let EAS create the certificates and provisioning profile. The build takes about 15–25 min on Expo's Macs.
8. **Install.** Open the build link from the terminal, or expo.dev → your project → Builds, on your iPhone and tap **Install**.
9. **Enable Developer Mode** (iOS 16+). Go to Settings → Privacy & Security → Developer Mode → On, restart, then confirm.
10. **Launch and connect.** Open *Triki Controller*, allow Bluetooth, and press Triki's button to wake it. Tap **Scan for Triki**, then **Connect**, then **Start Sensor**.

Later builds can run without a terminal. Add the `EXPO_TOKEN` repo secret, then go to **Actions → EAS iOS build → Run workflow**.

> The `preview` profile is a standalone app, which is what you want. `development` builds a dev client that needs a Metro server (`npx expo start --tunnel` in Codespaces). Use it only for live code editing.

### If a build fails
Open the build page on expo.dev, read the failing step's log, fix it, and rebuild. The dependency most likely to need a version bump is `react-native-ble-plx` if a newer Expo SDK changes native APIs. `npx expo install --check` lists mismatches.

---

## 4. Web fallback (no paid account)

1. In the repo, go to **Settings → Pages → Source: GitHub Actions**. The `CI` workflow deploys `web/` on every push to `main`.
2. On iPhone, install **Bluefy – Web BLE Browser** from the App Store.
3. In Bluefy, open `https://<your-github-user>.github.io/triki-controller/`.
4. Tap **Scan for Triki**, pick the device, then tap **Start Sensor**.

The page shows the live button, gyro and accelerometer data, detects gestures, and lets you tune thresholds. It can drive a video player *on the page itself* (paste `.mp4` links). It can't control other apps. TikTok also blocks embedding, so TikTok can't be controlled from the web fallback at all.

---

## 5. Protocol and architecture

- NUS service `6E400001-…`, RX (write) `6E400002-…`, TX (notify) `6E400003-…`
- Start sequence: subscribe to TX, wait 300 ms, then write `20 10 00 D0 07 68 00 03` to RX. No stop command is documented, so **Stop Sensor** unsubscribes
- Frame: 14 bytes. The header is `0x22`, followed by the button byte (`00`/`01`), then gyro XYZ and accel XYZ as int16 LE. gyro/131 gives °/s; accel/2048 gives g

```
src/
  bluetooth/  TrikiBLE.ts (scan/connect/reconnect/watchdog), TrikiFrameParser.ts, constants.ts
  gestures/   GestureEngine.ts (pure TS, platform-free), types.ts (thresholds, axis mapping)
  profiles/   profiles.ts (TikTok / Shorts / Reels / Media / Custom, editable, saved)
  webController/ targets.ts (per-site JS actions: add a site here), WebControllerScreen.tsx
  hooks/      AppContext.tsx, useLiveFrame.ts (samples frames at 15 Hz, so ~100 Hz data never re-renders the app)
  screens/    Home, Debug, Profiles, Settings
  components/ ConnectionCard, LivePanel, ui
web/index.html  Bluefy version (same parser and gesture algorithms, ported to plain JS)
```

**Gesture axes:** which gyro axis counts as "up/down" depends on how you hold Triki. Flick it with the **Debug** tab open, see which axis spikes, and set it in **Settings → Axis mapping**.
