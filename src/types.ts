export type Side = 'player' | 'opponent';

export interface GameState {
  glasses: boolean[];
  losses: Record<Side, number>;
  thrower: Side;
  duelActive: boolean;
  starter: Side;
  gameOver: boolean;
  winner: Side | null;
}

export type ThrowEvent =
  | { kind: 'hit'; thrower: Side; targetIndex: number; nextThrower: Side; duelStarted: boolean }
  | { kind: 'turnPass'; missedBy: Side; nextThrower: Side }
  | { kind: 'roundLost'; loser: Side; winner: Side; removedGlassIndex: number; nextStarter: Side }
  | { kind: 'gameOver'; loser: Side; winner: Side; removedGlassIndex: number };

export interface Vec2 {
  x: number;
  y: number;
}

export interface Glass {
  index: number;
  center: Vec2;
  mouthRadius: number;
}

export interface Layout {
  width: number;
  height: number;
  trayCenter: Vec2;
  /** Horizontal half-axis of the round tray (perspective ellipse). */
  trayRadiusX: number;
  /** Vertical half-axis of the round tray. */
  trayRadiusY: number;
  glasses: Glass[];
  playerLaunch: Vec2;
  opponentLaunch: Vec2;
  opponentImageCenter: Vec2;
  opponentImageRadius: number;
}
