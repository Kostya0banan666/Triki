import { BleManager, State, type Device, type Subscription } from 'react-native-ble-plx';
import { decode as atob, encode as btoa } from 'base-64';
import { AppState, type AppStateStatus } from 'react-native';
import type { ConnectionState, FoundDevice, TrikiFrame } from '../types/triki';
import { TrikiFrameParser, bytesToHex } from './TrikiFrameParser';
import {
  BATTERY_LEVEL,
  BATTERY_SERVICE,
  CONNECT_TIMEOUT_MS,
  DEVICE_NAME_MATCH,
  MAX_RECONNECT_ATTEMPTS,
  NUS_RX,
  NUS_SERVICE,
  NUS_TX,
  SCAN_TIMEOUT_MS,
  STALL_MS,
  START_COMMAND,
  SUBSCRIBE_SETTLE_MS,
} from './constants';
import { log } from '../utils/log';

export interface TrikiStatus {
  state: ConnectionState;
  device: FoundDevice | null;
  battery: number | null;
  rssi: number | null;
  error: string | null;
  stalled: boolean;
}

type FrameListener = (f: TrikiFrame, t: number) => void;
type StatusListener = (s: TrikiStatus) => void;

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64 = (b: number[]): string => btoa(String.fromCharCode(...b));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * BLE service for the Triki/HOPX controller. Frames are delivered through
 * `onFrame` callbacks (not React state) so 100 Hz data never forces renders.
 */
export class TrikiBLE {
  private manager = new BleManager();
  private parser = new TrikiFrameParser();
  private device: Device | null = null;
  private txSub: Subscription | null = null;
  private disconnectSub: Subscription | null = null;
  private frameListeners = new Set<FrameListener>();
  private statusListeners = new Set<StatusListener>();
  private scanTimer: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private lastDataAt = 0;
  private userDisconnect = false;
  private wantStreaming = false;
  private reconnectAttempts = 0;
  private found = new Map<string, FoundDevice>();
  private foundListeners = new Set<(d: FoundDevice[]) => void>();

  status: TrikiStatus = { state: 'idle', device: null, battery: null, rssi: null, error: null, stalled: false };

  constructor() {
    this.manager.onStateChange((s) => {
      log(`Bluetooth state: ${s}`);
      if (s === State.PoweredOff) this.setStatus({ state: 'bluetooth-off', error: 'Bluetooth is turned off' });
      else if (s === State.Unauthorized) this.setStatus({ state: 'unauthorized', error: 'Bluetooth permission denied. Enable it in Settings › Triki Controller.' });
      else if (s === State.PoweredOn && (this.status.state === 'bluetooth-off' || this.status.state === 'unauthorized'))
        this.setStatus({ state: 'idle', error: null });
    }, true);
    AppState.addEventListener('change', this.onAppState);
  }

  // ---------- listeners ----------
  onFrame(l: FrameListener): () => void {
    this.frameListeners.add(l);
    return () => this.frameListeners.delete(l);
  }
  onStatus(l: StatusListener): () => void {
    this.statusListeners.add(l);
    l(this.status);
    return () => this.statusListeners.delete(l);
  }
  onDevicesFound(l: (d: FoundDevice[]) => void): () => void {
    this.foundListeners.add(l);
    l([...this.found.values()]);
    return () => this.foundListeners.delete(l);
  }
  private setStatus(p: Partial<TrikiStatus>) {
    this.status = { ...this.status, ...p };
    this.statusListeners.forEach((l) => l(this.status));
  }

  // ---------- scanning ----------
  async scan(): Promise<void> {
    const s = await this.manager.state();
    if (s !== State.PoweredOn) {
      this.setStatus({ state: s === State.Unauthorized ? 'unauthorized' : 'bluetooth-off', error: `Bluetooth not ready (${s})` });
      return;
    }
    this.stopScan();
    this.found.clear();
    this.foundListeners.forEach((l) => l([]));
    this.setStatus({ state: 'scanning', error: null });
    log('Scanning for Triki…');
    this.manager.startDeviceScan(null, { allowDuplicates: false }, (err, d) => {
      if (err) {
        log(`Scan error: ${err.message}`, 'error');
        this.stopScan();
        this.setStatus({ state: 'error', error: err.message });
        return;
      }
      const name = d?.name ?? d?.localName ?? '';
      if (!d || !name.toLowerCase().includes(DEVICE_NAME_MATCH)) return;
      if (!this.found.has(d.id)) log(`Found ${name} (${d.id}) RSSI ${d.rssi}`);
      this.found.set(d.id, { id: d.id, name, rssi: d.rssi });
      const list = [...this.found.values()];
      this.foundListeners.forEach((l) => l(list));
    });
    this.scanTimer = setTimeout(() => {
      this.stopScan();
      if (this.status.state === 'scanning') {
        this.setStatus({ state: 'idle', error: this.found.size ? null : 'No Triki found. Press its button to wake it and scan again.' });
      }
    }, SCAN_TIMEOUT_MS);
  }

  stopScan(): void {
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.scanTimer = null;
    this.manager.stopDeviceScan();
  }

  // ---------- connection ----------
  async connect(target: FoundDevice): Promise<void> {
    this.stopScan();
    this.userDisconnect = false;
    this.setStatus({ state: 'connecting', device: target, error: null, stalled: false });
    log(`Connecting to ${target.name}…`);
    try {
      const d = await this.manager.connectToDevice(target.id, { timeout: CONNECT_TIMEOUT_MS });
      log('Connected. Discovering services…');
      await d.discoverAllServicesAndCharacteristics();
      const services = await d.services();
      log(`Services: ${services.map((s) => s.uuid.slice(4, 8)).join(', ')}`);
      if (!services.some((s) => s.uuid.toLowerCase() === NUS_SERVICE)) throw new Error('Nordic UART Service not found on device');
      this.device = d;
      this.reconnectAttempts = 0;
      this.disconnectSub?.remove();
      this.disconnectSub = d.onDisconnected((e) => this.handleDisconnect(e?.message));
      this.setStatus({ state: 'connected' });
      this.readExtras();
      if (this.wantStreaming) await this.startSensor();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`Connect failed: ${msg}`, 'error');
      this.setStatus({ state: 'error', error: `Connect failed: ${msg}` });
      throw e;
    }
  }

  private async readExtras() {
    const d = this.device;
    if (!d) return;
    try {
      const withRssi = await d.readRSSI();
      this.setStatus({ rssi: withRssi.rssi });
    } catch {
      /* optional */
    }
    try {
      const c = await d.readCharacteristicForService(BATTERY_SERVICE, BATTERY_LEVEL);
      if (c.value) {
        const level = b64ToBytes(c.value)[0];
        log(`Battery ${level}%`);
        this.setStatus({ battery: level });
      }
    } catch {
      log('Battery service not available on this device');
    }
  }

  async startSensor(): Promise<void> {
    const d = this.device;
    this.wantStreaming = true;
    if (!d) return;
    this.parser.reset();
    this.txSub?.remove();
    log('Subscribing to TX notifications…');
    this.txSub = d.monitorCharacteristicForService(NUS_SERVICE, NUS_TX, (err, c) => {
      if (err) {
        // ble-plx reports cancelled monitors as errors; ignore those on purpose
        if (!/cancel/i.test(err.message)) log(`Notify error: ${err.message}`, 'warn');
        return;
      }
      if (!c?.value) return;
      const bytes = b64ToBytes(c.value);
      const now = Date.now();
      if (this.lastDataAt === 0) log(`First notification: ${bytesToHex(bytes)}`);
      this.lastDataAt = now;
      if (this.status.stalled) this.setStatus({ stalled: false });
      for (const f of this.parser.push(bytes)) this.frameListeners.forEach((l) => l(f, now));
    });
    await sleep(SUBSCRIBE_SETTLE_MS);
    log('Writing start command 20 10 00 D0 07 68 00 03');
    try {
      await d.writeCharacteristicWithResponseForService(NUS_SERVICE, NUS_RX, bytesToB64(START_COMMAND));
    } catch (e) {
      log(`Write with response failed (${String(e)}), retrying without response`, 'warn');
      await d.writeCharacteristicWithoutResponseForService(NUS_SERVICE, NUS_RX, bytesToB64(START_COMMAND));
    }
    this.lastDataAt = 0;
    this.setStatus({ state: 'streaming' });
    this.startWatchdog();
  }

  /** There is no documented stop command; we stop by unsubscribing from TX. */
  stopSensor(): void {
    this.wantStreaming = false;
    this.txSub?.remove();
    this.txSub = null;
    this.stopWatchdog();
    if (this.device) this.setStatus({ state: 'connected', stalled: false });
    log('Sensor stream stopped (unsubscribed)');
  }

  async disconnect(): Promise<void> {
    this.userDisconnect = true;
    this.wantStreaming = false;
    this.stopSensor();
    const d = this.device;
    this.device = null;
    if (d) {
      try {
        await d.cancelConnection();
      } catch {
        /* already gone */
      }
    }
    this.setStatus({ state: 'idle', battery: null, rssi: null, stalled: false });
    log('Disconnected by user');
  }

  private handleDisconnect(reason?: string) {
    this.txSub?.remove();
    this.txSub = null;
    this.stopWatchdog();
    this.device = null;
    if (this.userDisconnect) return;
    log(`Unexpected disconnect${reason ? `: ${reason}` : ''} (Triki asleep or out of range?)`, 'warn');
    this.reconnect();
  }

  private async reconnect() {
    const target = this.status.device;
    if (!target || this.userDisconnect) return;
    while (this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS && !this.userDisconnect) {
      this.reconnectAttempts++;
      this.setStatus({ state: 'reconnecting', error: `Reconnecting (${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…` });
      await sleep(1000 * this.reconnectAttempts);
      try {
        await this.connect(target);
        log('Reconnected');
        return;
      } catch {
        /* next attempt */
      }
    }
    this.setStatus({ state: 'idle', error: 'Lost connection. Wake Triki (press the button) and tap Scan.' });
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.watchdog = setInterval(async () => {
      const d = this.device;
      if (!d) return;
      if (this.lastDataAt && Date.now() - this.lastDataAt > STALL_MS && !this.status.stalled) {
        log('No data for a while — re-sending start command', 'warn');
        this.setStatus({ stalled: true });
        d.writeCharacteristicWithResponseForService(NUS_SERVICE, NUS_RX, bytesToB64(START_COMMAND)).catch(() => {});
      }
      try {
        const r = await d.readRSSI();
        this.setStatus({ rssi: r.rssi });
      } catch {
        /* ignore */
      }
    }, 2000);
  }

  private stopWatchdog() {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
  }

  private onAppState = async (s: AppStateStatus) => {
    if (s !== 'active') return;
    const target = this.status.device;
    if (!target || this.userDisconnect) return;
    const connected = this.device ? await this.device.isConnected().catch(() => false) : false;
    if (!connected && this.status.state !== 'connecting' && this.status.state !== 'reconnecting') {
      log('App returned to foreground; connection lost, reconnecting');
      this.reconnectAttempts = 0;
      this.reconnect();
    }
  };
}

export const triki = new TrikiBLE();
