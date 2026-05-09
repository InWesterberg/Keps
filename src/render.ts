import { flightArc, flightPosition, flightProgress } from './physics';
import type { FlightAnimation } from './physics';
import type { GameState, Glass, Layout } from './types';

const TRAY_FILL = '#3a2418';
const TRAY_RIM = '#5b3a25';
const TRAY_HIGHLIGHT = 'rgba(255, 220, 170, 0.08)';
const GLASS_RIM = 'rgba(220, 230, 240, 0.95)';
const GLASS_INSIDE = 'rgba(0, 0, 0, 0.55)';
const GLASS_BODY = 'rgba(180, 220, 240, 0.18)';
const CAP_FACE = '#d9c47a';
const CAP_EDGE = '#7a6230';
const TARGET_GLOW = 'rgba(224, 192, 104, 0.35)';
const SHADOW = 'rgba(0, 0, 0, 0.45)';

export interface Sprites {
  opponentImage: HTMLImageElement | null;
  opponentImageReady: boolean;
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
  const cx = layout.trayCenterX;
  const wTop = layout.trayWidthTop;
  const wBot = layout.trayWidthBottom;
  const yTop = layout.trayTop;
  const yBot = layout.trayBottom;

  const xTopL = cx - wTop / 2;
  const xTopR = cx + wTop / 2;
  const xBotL = cx - wBot / 2;
  const xBotR = cx + wBot / 2;

  // Tray shadow.
  ctx.save();
  ctx.fillStyle = SHADOW;
  ctx.filter = 'blur(18px)';
  ctx.beginPath();
  ctx.moveTo(xTopL - 6, yTop + 10);
  ctx.lineTo(xTopR + 6, yTop + 10);
  ctx.lineTo(xBotR + 8, yBot + 14);
  ctx.lineTo(xBotL - 8, yBot + 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Tray surface (trapezoid suggesting perspective).
  const grad = ctx.createLinearGradient(0, yTop, 0, yBot);
  grad.addColorStop(0, '#2c1c12');
  grad.addColorStop(0.5, TRAY_FILL);
  grad.addColorStop(1, '#46291a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(xTopL, yTop);
  ctx.lineTo(xTopR, yTop);
  ctx.lineTo(xBotR, yBot);
  ctx.lineTo(xBotL, yBot);
  ctx.closePath();
  ctx.fill();

  // Rim.
  ctx.lineWidth = 4;
  ctx.strokeStyle = TRAY_RIM;
  ctx.stroke();

  // Highlight along centerline.
  ctx.beginPath();
  ctx.moveTo(cx, yTop + 4);
  ctx.lineTo(cx, yBot - 4);
  ctx.strokeStyle = TRAY_HIGHLIGHT;
  ctx.lineWidth = 1;
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

  // The cap, lifted by arc * arcHeight in screen y.
  const drawY = pos.y - arc * flight.arcHeight;

  ctx.fillStyle = CAP_FACE;
  ctx.beginPath();
  ctx.arc(pos.x, drawY, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = CAP_EDGE;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle highlight.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(pos.x - r * 0.3, drawY - r * 0.3, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlayerHud(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  losses: number,
  state: GameState,
): void {
  const cx = layout.trayCenterX;
  const y = Math.min(layout.height - 70, layout.trayBottom + 28);
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
