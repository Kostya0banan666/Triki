export type GestureType =
  | 'BUTTON_PRESS'
  | 'BUTTON_RELEASE'
  | 'SINGLE_CLICK'
  | 'DOUBLE_CLICK'
  | 'HOLD'
  | 'FLICK_UP'
  | 'FLICK_DOWN'
  | 'FLICK_LEFT'
  | 'FLICK_RIGHT'
  | 'TWIST_CW'
  | 'TWIST_CCW'
  | 'TILT'
  | 'KNOCK';

export const ALL_GESTURES: GestureType[] = [
  'BUTTON_PRESS',
  'BUTTON_RELEASE',
  'SINGLE_CLICK',
  'DOUBLE_CLICK',
  'HOLD',
  'FLICK_UP',
  'FLICK_DOWN',
  'FLICK_LEFT',
  'FLICK_RIGHT',
  'TWIST_CW',
  'TWIST_CCW',
  'TILT',
  'KNOCK',
];

export const GESTURE_LABEL: Record<GestureType, string> = {
  BUTTON_PRESS: 'Button Press',
  BUTTON_RELEASE: 'Button Release',
  SINGLE_CLICK: 'Single Click',
  DOUBLE_CLICK: 'Double Click',
  HOLD: 'Hold',
  FLICK_UP: 'Flick Up',
  FLICK_DOWN: 'Flick Down',
  FLICK_LEFT: 'Flick Left',
  FLICK_RIGHT: 'Flick Right',
  TWIST_CW: 'Twist Clockwise',
  TWIST_CCW: 'Twist Counter-clockwise',
  TILT: 'Tilt',
  KNOCK: 'Knock',
};

export interface GestureEvent {
  type: GestureType;
  confidence: number;
  /** peak |accel| in g during the gesture */
  peakAccel: number;
  /** peak angular rate in deg/s during the gesture (0 for button gestures) */
  peakGyro: number;
  t: number;
  detail?: string;
}

export type Axis = 'x' | 'y' | 'z';
export interface AxisMap {
  axis: Axis;
  invert: boolean;
}

export interface GestureThresholds {
  clickMaxMs: number;
  doubleClickGapMs: number;
  holdMs: number;
  /** deg/s a rotation must exceed to count as flick/twist */
  flickRate: number;
  twistRate: number;
  /** max duration of a flick/twist motion */
  motionMaxMs: number;
  /** high-pass accel spike in g for a knock */
  knockG: number;
  /** degrees from the rest orientation */
  tiltDeg: number;
  cooldownMs: number;
  /** gyro axis mapping; calibrate from the Debug screen */
  upDown: AxisMap;
  leftRight: AxisMap;
  twist: AxisMap;
}

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  clickMaxMs: 350,
  doubleClickGapMs: 300,
  holdMs: 650,
  flickRate: 220,
  twistRate: 260,
  motionMaxMs: 450,
  knockG: 1.6,
  tiltDeg: 40,
  cooldownMs: 350,
  upDown: { axis: 'x', invert: false },
  leftRight: { axis: 'z', invert: false },
  twist: { axis: 'y', invert: false },
};
