export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface TrikiFrame {
  button: boolean;
  /** degrees / second */
  gyro: Vec3;
  /** g */
  accel: Vec3;
}

export type ConnectionState =
  | 'idle'
  | 'bluetooth-off'
  | 'unauthorized'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'streaming'
  | 'reconnecting'
  | 'error';

export interface FoundDevice {
  id: string;
  name: string;
  rssi: number | null;
}
