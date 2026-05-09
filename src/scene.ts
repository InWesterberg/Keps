import type { Glass, Layout } from './types';

const GLASS_COUNT = 5;

export function buildLayout(width: number, height: number): Layout {
  const trayCenterX = width / 2;
  const trayTop = Math.round(height * 0.26);
  const trayBottom = Math.round(height * 0.84);
  const trayLength = trayBottom - trayTop;

  // Perspective taper: tray narrower at top (away from viewer), wider at bottom.
  const trayWidthBottom = Math.min(width * 0.78, 360);
  const trayWidthTop = trayWidthBottom * 0.62;

  const marginY = Math.max(36, trayLength * 0.08);
  const usableLength = trayLength - marginY * 2;
  const step = usableLength / (GLASS_COUNT - 1);

  // Glass radius scales by perspective: bigger near player (high index in screen y), smaller far away.
  const baseRadiusNear = Math.min(width * 0.06, 30);
  const baseRadiusFar = baseRadiusNear * 0.62;

  const glasses: Glass[] = [];
  for (let i = 0; i < GLASS_COUNT; i++) {
    // i = 0 closest to player (largest, lowest on screen = high y)
    const t = i / (GLASS_COUNT - 1); // 0 at player end, 1 at opponent end
    const cy = trayBottom - marginY - i * step;
    const radius = baseRadiusNear * (1 - t) + baseRadiusFar * t;
    glasses.push({
      index: i,
      center: { x: trayCenterX, y: cy },
      mouthRadius: radius,
    });
  }

  const opponentImageRadius = Math.min(width * 0.18, height * 0.09, 80);
  const opponentImageCenter = {
    x: trayCenterX,
    y: Math.max(opponentImageRadius + 24, trayTop - opponentImageRadius - 18),
  };

  return {
    width,
    height,
    trayTop,
    trayBottom,
    trayCenterX,
    trayWidthTop,
    trayWidthBottom,
    glasses,
    playerLaunch: { x: trayCenterX, y: height + 30 },
    opponentLaunch: { x: trayCenterX, y: trayTop - 60 },
    opponentImageCenter,
    opponentImageRadius,
  };
}
