import type { Glass, Layout, Side, Vec2 } from './types';

const HIT_TOLERANCE = 0.95;

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isHit(landing: Vec2, target: Glass): boolean {
  return distance(landing, target.center) <= target.mouthRadius * HIT_TOLERANCE;
}

/**
 * Convert a player swipe to a landing point on the tray.
 * The cap travels the same vector the finger swept (1:1), so a swipe whose
 * length matches launch→target distance lands the cap exactly on target.
 */
export function landingFromSwipe(launch: Vec2, swipe: Vec2): Vec2 {
  return { x: launch.x + swipe.x, y: launch.y + swipe.y };
}

/**
 * AI throws towards the target with Gaussian noise around it.
 * sigmaPx controls accuracy (smaller = more accurate).
 */
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
