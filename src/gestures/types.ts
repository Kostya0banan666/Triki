/**
 * Every move is "heading-free": the cap is round and has no compass, so it can
 * never know which way is up/left/right in the room. These moves work however
 * the cap is turned (see Moves screen / README).
 */
export type GestureType =
  | 'TWIST_RIGHT'
  | 'TWIST_LEFT'
  | 'TAP'
  | 'DOUBLE_TAP'
  | 'TILT'
  | 'FLIP'
  | 'SLIDE'
  | 'CLICK'
  | 'DOUBLE_CLICK'
  | 'HOLD'
  | 'BUTTON_PRESS'
  | 'BUTTON_RELEASE';

/** Gestures that can be mapped to actions (raw press/release are debug-only). */
export const MAPPABLE_GESTURES: GestureType[] = [
  'TWIST_RIGHT',
  'TWIST_LEFT',
  'TAP',
  'DOUBLE_TAP',
  'TILT',
  'FLIP',
  'SLIDE',
  'CLICK',
  'DOUBLE_CLICK',
  'HOLD',
];

export interface GestureInfo {
  label: string;
  /** one line: what to physically do */
  how: string;
  /** common mistake / tip */
  tip: string;
}

export const GESTURE_INFO: Record<GestureType, GestureInfo> = {
  TWIST_RIGHT: {
    label: 'Twist right',
    how: 'Lay the cap flat and twist it clockwise, like turning a dial.',
    tip: 'Keep it flat. Holding the twist repeats (great for volume).',
  },
  TWIST_LEFT: {
    label: 'Twist left',
    how: 'Lay the cap flat and twist it counter-clockwise.',
    tip: 'Twist or tilt, not both at once.',
  },
  TAP: {
    label: 'Tap',
    how: 'Knock the cap straight down onto the table, once.',
    tip: 'A short, square knock. Twisting while tapping reads as a twist.',
  },
  DOUBLE_TAP: {
    label: 'Double tap',
    how: 'Knock-knock: two taps about half a second apart.',
    tip: 'Not too fast; let the cap settle between knocks.',
  },
  TILT: {
    label: 'Tilt & hold',
    how: 'Lean the cap in any direction and hold it there.',
    tip: 'Direction does not matter, only how far it leans.',
  },
  FLIP: {
    label: 'Flip',
    how: 'Turn the cap upside-down and leave it for a moment.',
    tip: 'Face-down = quiet. Flip back to reset.',
  },
  SLIDE: {
    label: 'Slide',
    how: 'Push the cap flat across the table in a straight line.',
    tip: 'Glide it; do not lift or tilt it.',
  },
  CLICK: {
    label: 'Button click',
    how: 'Press the cap’s button once, quickly.',
    tip: 'Waits a moment to make sure it is not a double click.',
  },
  DOUBLE_CLICK: {
    label: 'Button double click',
    how: 'Press the button twice quickly.',
    tip: '',
  },
  HOLD: {
    label: 'Button hold',
    how: 'Press and hold the button for about a second.',
    tip: '',
  },
  BUTTON_PRESS: { label: 'Button down', how: '', tip: '' },
  BUTTON_RELEASE: { label: 'Button up', how: '', tip: '' },
};

export interface GestureEvent {
  type: GestureType;
  /** 0..1, how clearly the move was performed */
  confidence: number;
  /** peak |accel| in g during the move */
  peakAccel: number;
  /** peak angular rate in deg/s during the move */
  peakGyro: number;
  t: number;
  /** true for auto-repeat while a twist/tilt is held */
  repeat?: boolean;
}

/** Continuous engine state, for live visuals. */
export type MotionAction = 'SETTLING' | 'IDLE' | 'TWIST_RIGHT' | 'TWIST_LEFT' | 'TILT' | 'FLIP' | 'SLIDE' | 'TAP';

export interface MotionState {
  action: MotionAction;
  /** 0..1 */
  strength: number;
  /** raw units, + = right */
  twist: number;
  spin: number;
  tilt: number;
}

export interface GestureThresholds {
  /** raw gyro units a twist must exceed (400..1600, lower = touchier) */
  turnThreshold: number;
  /** 0..100, how forgiving the twist detector is */
  turnSensitivity: number;
  /** swap twist left/right (false = clockwise seen from above is right) */
  invertTurn: boolean;
  /** raw accel units of vertical impact for a tap */
  tapImpact: number;
  /** raw tilt amount needed for Tilt & hold */
  tiltAmount: number;
  /** window for a second tap */
  doubleTapMs: number;
  /** auto-repeat period while twisting/tilting */
  repeatMs: number;
  clickMaxMs: number;
  doubleClickGapMs: number;
  holdMs: number;
}

export const DEFAULT_THRESHOLDS: GestureThresholds = {
  turnThreshold: 1000,
  turnSensitivity: 50,
  invertTurn: false,
  tapImpact: 380,
  tiltAmount: 200,
  doubleTapMs: 600,
  repeatMs: 280,
  clickMaxMs: 350,
  doubleClickGapMs: 300,
  holdMs: 650,
};
