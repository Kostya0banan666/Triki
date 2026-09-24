export const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
/** iPhone -> Triki (write) */
export const NUS_RX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
/** Triki -> iPhone (notify) */
export const NUS_TX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const NUS_EXTRA = '6e400004-b5a3-f393-e0a9-e50e24dcca9e';

export const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
export const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

/** Start IMU streaming. */
export const START_COMMAND = [0x20, 0x10, 0x00, 0xd0, 0x07, 0x68, 0x00, 0x03];

export const DEVICE_NAME_MATCH = 'triki';
export const SCAN_TIMEOUT_MS = 15000;
export const CONNECT_TIMEOUT_MS = 10000;
/** delay between subscribing to TX and writing the start command */
export const SUBSCRIBE_SETTLE_MS = 300;
/** no frames for this long while streaming -> treat as stalled/asleep */
export const STALL_MS = 4000;
export const MAX_RECONNECT_ATTEMPTS = 5;
