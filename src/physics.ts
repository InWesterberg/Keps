import type { Glass, Layout, Side, Vec2 } from './types';

// Effective hit area = mouthRadius * HIT_TOLERANCE.
// >1 means landing slightly outside the rim still counts (forgiving).
const HIT_TOLERANCE = 1.45;

// Multiplies the player's finger swipe vector to the cap's throw vector,
// so a comfortable mid-screen swipe is enough to reach the far glass.
const PLAYER_SWIPE_SCALE = 2.6;

export function effectiveHitRadius(target: Glass): number {
  return target.mouthRadius * HIT_TOLERANCE;
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isHit(landing: Vec2, target: Glass): boolean {
  return distance(landing, target.center) <= effectiveHitRadius(target);
}

/**
 * Player swipe → landing point. Scales the finger vector so a moderate
 * swipe reaches the far end of the tray.
 */
export function landingFromSwipe(launch: Vec2, swipe: Vec2): Vec2 {
  return {
    x: launch.x + swipe.x * PLAYER_SWIPE_SCALE,
    y: launch.y + swipe.y * PLAYER_SWIPE_SCALE,
  };
}

/**
 * AI throws towards the target with Gaussian noise sized so the resulting
 * hit probability matches `hitRate` for the given effective hit radius.
 *   P(land in disc of radius R) = 1 - exp(-R²/(2σ²))
 *   σ = R / sqrt(-2·ln(1 - hitRate))
 */
export function aiSigmaForHitRate(target: Glass, hitRate: number): number {
  const r = effectiveHitRadius(target);
  return r / Math.sqrt(-2 * Math.log(1 - hitRate));
}

export function aiLanding(target: Glass, sigmaPx: number, rand = Math.random): Vec2 {
  return {
    x: target.center.x + gaussian(rand) * sigmaPx,
    y: target.center.y + gaussian(rand) * sigmaPx,
  };
}

function gaussian(rand: () => number): number {
  // Box–Muller
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface FlightAnimation {
  launch: Vec2;
  landing: Vec2;
  startTime: number;
  durationMs: number;
  thrower: Side;
  arcHeight: number;
  /** Capsule launch radius in px (visual size at apex). */
  capRadius: number;
}

export function buildFlight(layout: Layout, thrower: Side, landing: Vec2, now: number): FlightAnimation {
  const launch = thrower === 'player' ? layout.playerLaunch : layout.opponentLaunch;
  const dist = distance(launch, landing);
  const durationMs = clamp(360 + dist * 0.6, 380, 900);
  // Higher arc when throwing further. Arc shown via scale change (visual cue).
  const arcHeight = clamp(dist * 0.15, 30, 90);
  return {
    launch,
    landing,
    startTime: now,
    durationMs,
    thrower,
    arcHeight,
    capRadius: 11,
  };
}

export function flightProgress(flight: FlightAnimation, now: number): number {
  return clamp((now - flight.startTime) / flight.durationMs, 0, 1);
}

export function flightPosition(flight: FlightAnimation, t: number): Vec2 {
  return {
    x: flight.launch.x + (flight.landing.x - flight.launch.x) * t,
    y: flight.launch.y + (flight.landing.y - flight.launch.y) * t,
  };
}

/** 0 at launch/landing, 1 at apex. */
export function flightArc(t: number): number {
  return Math.sin(t * Math.PI);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
