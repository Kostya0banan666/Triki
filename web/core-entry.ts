// Bundled by CI (esbuild) into web/core.js as `window.Triki`, so the web page
// runs exactly the same parser and motion engine as the native app.
export { TrikiFrameParser } from '../src/bluetooth/TrikiFrameParser';
export { GestureEngine } from '../src/gestures/GestureEngine';
export { GESTURE_INFO, MAPPABLE_GESTURES } from '../src/gestures/types';
export { startCommand } from '../src/bluetooth/constants';
