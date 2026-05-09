import { flightArc, flightPosition, flightProgress } from './physics';
import type { FlightAnimation } from './physics';
import type { GameState, Glass, Layout } from './types';

const TRAY_FILL_TOP = '#2c1c12';
const TRAY_FILL_MID = '#3a2418';
const TRAY_FILL_BOTTOM = '#46291a';
const TRAY_RIM = '#5b3a25';
const GLASS_RIM = 'rgba(220, 230, 240, 0.95)';
const GLASS_INSIDE = 'rgba(0, 0, 0, 0.55)';
const GLASS_BODY = 'rgba(180, 220, 240, 0.18)';
const TARGET_GLOW = 'rgba(224, 192, 104, 0.35)';
const SHADOW = 'rgba(0, 0, 0, 0.45)';

// Pripps Blå inspired palette.
const PRIPPS_BLUE_DARK = '#062a6e';
const PRIPPS_BLUE = '#0c3aa0';
const PRIPPS_BLUE_LIGHT = '#1f57c8';
const PRIPPS_WHITE = '#f4f6ff';

export interface Sprites {
  opponentImage: HTMLImageElement | null;
  opponentImageReady: boolean;
  capImage: HTMLImageElement | null;
  capImageReady: boolean;
}

export function clearCanvas(ctx: CanvasRenderingContext2D, layout: Layout): void {
  // Vertical gradient background.
  const grad = ctx.createLinearGradient(0, 0, 0, layout.height);
  grad.addColorStop(0, '#1f1614');
  grad.addColorStop(0.5, '#15100e');
  grad.addColorStop(1, '#0e0a09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, layout.width, layout.height);
}

export function drawOpponent(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  sprites: Sprites,
  losses: number,
): void {
  const { x, y } = layout.opponentImageCenter;
  const r = layout.opponentImageRadius;

  // Drop shadow.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y + 6, r, 0, Math.PI * 2);
  ctx.fillStyle = SHADOW;
  ctx.filter = 'blur(8px)';
  ctx.fill();
  ctx.restore();

  // Image clipped to circle.
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (sprites.opponentImageReady && sprites.opponentImage) {
    const img = sprites.opponentImage;
    const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  } else {
    // Placeholder: dark circle with face glyph.
    ctx.fillStyle = '#3a2c24';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = '#e5dccb';
    ctx.font = `${Math.round(r * 1.1)}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🙂', x, y + 2);
  }
  ctx.restore();

  // Ring around image.
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4a3a2a';
  ctx.stroke();

  drawScoreDots(ctx, x, y - r - 16, losses);
}

export function drawTray(ctx: CanvasRenderingContext2D, layout: Layout): void {
  const { x: cx, y: cy } = layout.trayCenter;
  const rx = layout.trayRadiusX;
  const ry = layout.trayRadiusY;

  // Drop shadow under the round tray.
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.filter = 'blur(18px)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 14, rx + 8, ry + 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tray surface — round (ellipse for perspective).
  const grad = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  grad.addColorStop(0, TRAY_FILL_TOP);
  grad.addColorStop(0.5, TRAY_FILL_MID);
  grad.addColorStop(1, TRAY_FILL_BOTTOM);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim.
  ctx.lineWidth = 4;
  ctx.strokeStyle = TRAY_RIM;
  ctx.stroke();

  // Inner highlight ring (subtle ellipse highlight on the upper edge).
  ctx.beginPath();
  ctx.ellipse(cx, cy - 2, rx - 6, ry - 4, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = 'rgba(255, 220, 170, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export function drawGlasses(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  state: GameState,
  highlightTarget: number | null,
): void {
  // Draw far → near so near glasses overlap far ones.
  const ordered = [...layout.glasses].sort((a, b) => a.center.y - b.center.y);
  for (const glass of ordered) {
    if (!state.glasses[glass.index]) continue;
    drawGlass(ctx, glass, glass.index === highlightTarget);
  }
}

function drawGlass(ctx: CanvasRenderingContext2D, glass: Glass, highlight: boolean): void {
  const { x, y } = glass.center;
  const r = glass.mouthRadius;
  const ry = r * 0.42; // squashed because we look at the rim from a low angle
  const bodyHeight = r * 1.6;

  // Highlight glow.
  if (highlight) {
    ctx.save();
    ctx.fillStyle = TARGET_GLOW;
    ctx.filter = 'blur(10px)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 1.5, ry * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Shadow under glass.
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.filter = 'blur(4px)';
  ctx.beginPath();
  ctx.ellipse(x, y + bodyHeight + 4, r * 0.95, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Glass body (sides).
  ctx.fillStyle = GLASS_BODY;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x - r * 0.85, y + bodyHeight);
  ctx.lineTo(x + r * 0.85, y + bodyHeight);
  ctx.lineTo(x + r, y);
  ctx.closePath();
  ctx.fill();

  // Bottom of glass.
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.beginPath();
  ctx.ellipse(x, y + bodyHeight, r * 0.85, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inside (mouth — dark hollow).
  ctx.fillStyle = GLASS_INSIDE;
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim.
  ctx.strokeStyle = GLASS_RIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r, ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Highlight on rim.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25, y - ry * 0.2, r * 0.55, ry * 0.5, 0, Math.PI * 0.9, Math.PI * 1.6);
  ctx.stroke();
}

export function drawCapInFlight(
  ctx: CanvasRenderingContext2D,
  flight: FlightAnimation,
  sprites: Sprites,
  now: number,
): void {
  const t = flightProgress(flight, now);
  const pos = flightPosition(flight, t);
  const arc = flightArc(t);
  const sizeBoost = 1 + arc * 0.45;
  const r = flight.capRadius * sizeBoost;

  // Shadow on tray (no arc, just the ground projection).
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.filter = 'blur(3px)';
  ctx.beginPath();
  ctx.ellipse(pos.x, pos.y + 6, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const drawY = pos.y - arc * flight.arcHeight;
  const size = r * 2;

  if (sprites.capImageReady && sprites.capImage) {
    ctx.drawImage(sprites.capImage, pos.x - r, drawY - r, size, size);
  } else {
    drawProceduralPrippsCap(ctx, pos.x, drawY, r);
  }
}

/** Fallback if cap.png hasn't loaded yet — Pripps Blå styled crown cap. */
function drawProceduralPrippsCap(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): void {
  // Crimped crown edge.
  const teeth = 22;
  ctx.beginPath();
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.9;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = PRIPPS_BLUE_LIGHT;
  ctx.fill();

  // Inner disc.
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.fillStyle = PRIPPS_BLUE;
  ctx.fill();
  ctx.strokeStyle = PRIPPS_BLUE_DARK;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Wordmark "P".
  ctx.fillStyle = PRIPPS_WHITE;
  ctx.font = `bold ${Math.round(r * 0.95)}px -apple-system, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', cx, cy + r * 0.05);
}

export function drawPlayerHud(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  losses: number,
  state: GameState,
): void {
  const cx = layout.trayCenter.x;
  const trayBottom = layout.trayCenter.y + layout.trayRadiusY;
  const y = Math.min(layout.height - 70, trayBottom + 28);
  drawScoreDots(ctx, cx, y, losses);

  if (!state.gameOver && state.thrower === 'player') {
    ctx.fillStyle = 'rgba(245,245,245,0.55)';
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Svep upp för att kasta', cx, y + 26);
  }
}

function drawScoreDots(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  losses: number,
): void {
  const total = 3;
  const r = 5;
  const gap = 14;
  const totalWidth = (total - 1) * gap;
  const startX = cx - totalWidth / 2;

  for (let i = 0; i < total; i++) {
    const x = startX + i * gap;
    const isLost = i < losses;
    ctx.beginPath();
    ctx.arc(x, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = isLost ? '#cc4a3a' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.strokeStyle = isLost ? '#7a2a20' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
