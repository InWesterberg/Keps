import { playApplause, playFanfare, playSplash, unlockAudio } from './audio';
import { createGame, resolveThrow, targetIndexFor } from './game';
import {
  aiLanding,
  buildFlight,
  isHit,
  landingFromSwipe,
} from './physics';
import type { FlightAnimation } from './physics';
import {
  clearCanvas,
  drawCapInFlight,
  drawGlasses,
  drawOpponent,
  drawPlayerHud,
  drawTray,
  type Sprites,
} from './render';
import { buildLayout } from './scene';
import type { GameState, Layout, ThrowEvent, Vec2 } from './types';

const AI_ACCURACY = 0.72; // ~72% chance to land in glass
const AI_MIN_DELAY_MS = 700;
const AI_MAX_DELAY_MS = 1300;
const MIN_SWIPE_PX = 40;

type Phase = 'awaitingPlayer' | 'awaitingAi' | 'throwing' | 'gameOver';

interface Runtime {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  layout: Layout;
  state: GameState;
  sprites: Sprites;
  phase: Phase;
  flight: FlightAnimation | null;
  pendingFlightHit: boolean;
  statusEl: HTMLElement;
  restartBtn: HTMLButtonElement;
  aiTimer: number | null;
}

function init(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  const statusEl = document.getElementById('status')!;
  const restartBtn = document.getElementById('restart') as HTMLButtonElement;

  const sprites: Sprites = { opponentImage: null, opponentImageReady: false };
  const img = new Image();
  img.onload = () => {
    sprites.opponentImage = img;
    sprites.opponentImageReady = true;
  };
  img.onerror = () => {
    // Fallback handled in renderer.
  };
  img.src = '/opponent.jpg';

  const runtime: Runtime = {
    canvas,
    ctx,
    layout: buildLayout(window.innerWidth, window.innerHeight),
    state: createGame(),
    sprites,
    phase: 'awaitingPlayer',
    flight: null,
    pendingFlightHit: false,
    statusEl,
    restartBtn,
    aiTimer: null,
  };

  resizeCanvas(runtime);
  window.addEventListener('resize', () => resizeCanvas(runtime));
  window.addEventListener('orientationchange', () => resizeCanvas(runtime));

  attachSwipeInput(runtime);
  restartBtn.addEventListener('click', () => restart(runtime));

  setStatus(runtime, 'Din tur — svep upp för att kasta');
  requestAnimationFrame((t) => loop(runtime, t));
}

function resizeCanvas(runtime: Runtime): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  runtime.canvas.width = Math.round(w * dpr);
  runtime.canvas.height = Math.round(h * dpr);
  runtime.canvas.style.width = `${w}px`;
  runtime.canvas.style.height = `${h}px`;
  runtime.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  runtime.layout = buildLayout(w, h);
}

function loop(runtime: Runtime, now: number): void {
  render(runtime, now);

  if (runtime.phase === 'throwing' && runtime.flight) {
    if (now - runtime.flight.startTime >= runtime.flight.durationMs) {
      finishFlight(runtime);
    }
  }

  requestAnimationFrame((t) => loop(runtime, t));
}

function render(runtime: Runtime, now: number): void {
  const { ctx, layout, state, sprites } = runtime;
  clearCanvas(ctx, layout);
  drawOpponent(ctx, layout, sprites, state.losses.opponent);
  drawTray(ctx, layout);

  const highlight =
    runtime.phase === 'awaitingPlayer' && state.thrower === 'player'
      ? targetIndexFor(state, 'player')
      : null;
  drawGlasses(ctx, layout, state, highlight);

  if (runtime.flight) {
    drawCapInFlight(ctx, runtime.flight, now);
  }

  drawPlayerHud(ctx, layout, state.losses.player, state);
}

function attachSwipeInput(runtime: Runtime): void {
  let start: { x: number; y: number; t: number } | null = null;

  runtime.canvas.addEventListener('pointerdown', (e) => {
    unlockAudio();
    if (runtime.phase !== 'awaitingPlayer') return;
    runtime.canvas.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
  });

  runtime.canvas.addEventListener('pointerup', (e) => {
    if (!start) return;
    const s = start;
    start = null;
    if (runtime.phase !== 'awaitingPlayer') return;

    const swipe: Vec2 = { x: e.clientX - s.x, y: e.clientY - s.y };
    const len = Math.sqrt(swipe.x * swipe.x + swipe.y * swipe.y);
    if (len < MIN_SWIPE_PX || swipe.y > -MIN_SWIPE_PX * 0.6) {
      // Not a real upward swipe — ignore.
      return;
    }
    launchPlayerThrow(runtime, swipe);
  });

  runtime.canvas.addEventListener('pointercancel', () => {
    start = null;
  });
}

function launchPlayerThrow(runtime: Runtime, swipe: Vec2): void {
  const { state, layout } = runtime;
  const targetIdx = targetIndexFor(state, 'player');
  if (targetIdx === null) return;
  const target = layout.glasses[targetIdx];
  const landing = landingFromSwipe(layout.playerLaunch, swipe);
  const hit = isHit(landing, target);
  startFlight(runtime, 'player', landing, hit);
}

function scheduleAiThrow(runtime: Runtime): void {
  if (runtime.aiTimer !== null) {
    clearTimeout(runtime.aiTimer);
  }
  const delay = AI_MIN_DELAY_MS + Math.random() * (AI_MAX_DELAY_MS - AI_MIN_DELAY_MS);
  setStatus(runtime, 'Motståndarens tur…');
  runtime.aiTimer = window.setTimeout(() => {
    runtime.aiTimer = null;
    if (runtime.phase !== 'awaitingAi') return;
    aiThrow(runtime);
  }, delay);
}

function aiThrow(runtime: Runtime): void {
  const { state, layout } = runtime;
  const targetIdx = targetIndexFor(state, 'opponent');
  if (targetIdx === null) return;
  const target = layout.glasses[targetIdx];
  // sigma = (1 - accuracy) * mouthRadius * 1.6 → ~accuracy hit rate
  const sigma = (1 - AI_ACCURACY) * target.mouthRadius * 1.6;
  const landing = aiLanding(target, sigma);
  const hit = isHit(landing, target);
  startFlight(runtime, 'opponent', landing, hit);
}

function startFlight(
  runtime: Runtime,
  thrower: 'player' | 'opponent',
  landing: Vec2,
  willHit: boolean,
): void {
  runtime.phase = 'throwing';
  runtime.pendingFlightHit = willHit;
  runtime.flight = buildFlight(runtime.layout, thrower, landing, performance.now());
  setStatus(runtime, thrower === 'player' ? 'Du kastar…' : 'Motståndaren kastar…');
}

function finishFlight(runtime: Runtime): void {
  const hit = runtime.pendingFlightHit;
  runtime.flight = null;

  if (hit) playSplash();

  const event = resolveThrow(runtime.state, hit);

  if (event.kind === 'roundLost' && event.winner === 'player') {
    playApplause();
  }

  if (runtime.state.gameOver) {
    runtime.phase = 'gameOver';
    runtime.restartBtn.hidden = false;
    if (runtime.state.winner === 'player') playFanfare();
    setStatus(
      runtime,
      runtime.state.winner === 'player' ? 'Match slut — du vann! 🏆' : 'Match slut — du förlorade',
    );
    return;
  }

  if (runtime.state.thrower === 'player') {
    runtime.phase = 'awaitingPlayer';
    setStatusForAwaitingPlayer(runtime, event);
  } else {
    runtime.phase = 'awaitingAi';
    scheduleAiThrow(runtime);
  }
}

function setStatusForAwaitingPlayer(runtime: Runtime, event: ThrowEvent): void {
  switch (event.kind) {
    case 'hit':
      setStatus(runtime, 'Motståndaren satte den — din tur!');
      break;
    case 'turnPass':
      setStatus(runtime, 'Motståndaren missade — din tur att starta');
      break;
    case 'roundLost':
      setStatus(runtime, 'Du förlorade rundan — du börjar nästa');
      break;
    case 'gameOver':
      break;
  }
}

function setStatus(runtime: Runtime, text: string): void {
  runtime.statusEl.textContent = text;
}

function restart(runtime: Runtime): void {
  if (runtime.aiTimer !== null) {
    clearTimeout(runtime.aiTimer);
    runtime.aiTimer = null;
  }
  runtime.state = createGame();
  runtime.phase = 'awaitingPlayer';
  runtime.flight = null;
  runtime.restartBtn.hidden = true;
  setStatus(runtime, 'Din tur — svep upp för att kasta');
}

init();
