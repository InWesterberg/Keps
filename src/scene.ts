import type { Glass, Layout } from './types';

const GLASS_COUNT = 5;

export function buildLayout(width: number, height: number): Layout {
  // Round tray rendered as a perspective ellipse (rx > ry, looking from a low angle).
  const trayCenter = { x: width / 2, y: Math.round(height * 0.55) };
  const trayRadiusX = Math.min(width * 0.42, 200);
  const trayRadiusY = trayRadiusX * 0.55;

  // Glasses cluster tightly along the centerline of the tray.
  // Total cluster height ≈ 60% of the tray's vertical diameter (much tighter than before).
  const clusterHalf = trayRadiusY * 0.6;
  const step = (clusterHalf * 2) / (GLASS_COUNT - 1);

  // Glass radius (perspective): bigger near player, smaller toward opponent.
  // Smaller absolute size now since glasses sit closer together.
  const baseRadiusNear = Math.min(width * 0.045, 22);
  const baseRadiusFar = baseRadiusNear * 0.7;

  const glasses: Glass[] = [];
  for (let i = 0; i < GLASS_COUNT; i++) {
    // i = 0 closest to player (largest, lowest on screen = high y)
    const t = i / (GLASS_COUNT - 1); // 0 at player end, 1 at opponent end
    const cy = trayCenter.y + clusterHalf - i * step;
    const radius = baseRadiusNear * (1 - t) + baseRadiusFar * t;
    glasses.push({
      index: i,
      center: { x: trayCenter.x, y: cy },
      mouthRadius: radius,
    });
  }

  const opponentImageRadius = Math.min(width * 0.18, height * 0.09, 80);
  const opponentImageCenter = {
    x: trayCenter.x,
    y: Math.max(opponentImageRadius + 28, trayCenter.y - trayRadiusY - opponentImageRadius - 24),
  };

  return {
    width,
    height,
    trayCenter,
    trayRadiusX,
    trayRadiusY,
    glasses,
    playerLaunch: { x: trayCenter.x, y: height + 30 },
    opponentLaunch: { x: trayCenter.x, y: trayCenter.y - trayRadiusY - 60 },
    opponentImageCenter,
    opponentImageRadius,
  };
}
