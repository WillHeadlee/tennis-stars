import { CourtData, CourtId } from '@shared/types';

export const COURTS: Record<CourtId, CourtData> = {
  stadium: {
    id: 'stadium',
    name: 'PIXEL STADIUM',
    floorColor: 0x2d6ca2,    // Blue court
    bgColor: 0x1a1a2e,       // Dark blue bg
    netColor: 0xffffff,
    ballSpeedMod: 1.0,
    bounceHeightMod: 1.0,
    unlocked: true,
  },
  night: {
    id: 'night',
    name: 'NIGHT COURT',
    floorColor: 0x1a1a1a,    // Dark court
    bgColor: 0x000022,       // Night sky
    netColor: 0x00ffff,      // Neon
    ballSpeedMod: 1.1,
    bounceHeightMod: 1.0,
    unlocked: false,
  },
  ruins: {
    id: 'ruins',
    name: 'ANCIENT RUINS',
    floorColor: 0x7a5c44,    // Stone
    bgColor: 0x3b2712,       // Earth
    netColor: 0xc8a870,
    ballSpeedMod: 1.0,
    bounceHeightMod: 1.2,
    unlocked: false,
  },
};

export const COURT_ORDER: CourtId[] = ['stadium', 'night', 'ruins'];

/**
 * Draw the court background for a given court.
 * Uses Phaser Graphics primitives only.
 */
export function drawCourt(gfx: Phaser.GameObjects.Graphics, courtId: CourtId): void {
  const court = COURTS[courtId];
  gfx.clear();

  // Sky / background
  gfx.fillStyle(court.bgColor, 1);
  gfx.fillRect(0, 0, 320, 148);

  // Draw court-specific background details
  switch (courtId) {
    case 'stadium':
      drawStadiumBg(gfx);
      break;
    case 'night':
      drawNightBg(gfx);
      break;
    case 'ruins':
      drawRuinsBg(gfx);
      break;
  }

  // Court floor
  gfx.fillStyle(court.floorColor, 1);
  gfx.fillRect(0, 148, 320, 32); // floor stripe

  // Floor line (baseline/service lines)
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(10, 148, 1, 8);   // left baseline
  gfx.fillRect(309, 148, 1, 8);  // right baseline
  gfx.fillRect(10, 148, 300, 1); // back of court top line
  gfx.fillRect(10, 155, 300, 1); // service line
  gfx.fillRect(160, 148, 1, 8);  // center mark

  // Shadow under court
  gfx.fillStyle(0x000000, 0.3);
  gfx.fillRect(0, 148, 320, 2);
}

function drawStadiumBg(gfx: Phaser.GameObjects.Graphics): void {
  // Bleachers (tiled pattern)
  gfx.fillStyle(0x3a4a6b, 1);
  gfx.fillRect(0, 20, 320, 80);

  // Bleacher rows
  for (let row = 0; row < 6; row++) {
    gfx.fillStyle(row % 2 === 0 ? 0x2a3a5b : 0x4a5a7b, 1);
    gfx.fillRect(0, 20 + row * 13, 320, 12);
  }

  // Pixel crowd (simplified — colored dots in rows)
  const crowdColors = [0xff0000, 0x0000ff, 0xffff00, 0x00ff00, 0xffffff, 0xff8800];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 80; col++) {
      if (Math.random() > 0.3) {
        gfx.fillStyle(crowdColors[(col + row) % crowdColors.length], 1);
        gfx.fillRect(col * 4, 25 + row * 12, 3, 6);
      }
    }
  }

  // Stadium rim / overhang
  gfx.fillStyle(0x555577, 1);
  gfx.fillRect(0, 18, 320, 4);
  gfx.fillStyle(0x666699, 1);
  gfx.fillRect(0, 17, 320, 2);

  // Scoreboard
  gfx.fillStyle(0x111122, 1);
  gfx.fillRect(130, 5, 60, 14);
  gfx.fillStyle(0xff8800, 1);
  gfx.fillRect(131, 6, 58, 12);
  gfx.fillStyle(0x000000, 1);
  gfx.fillRect(132, 7, 56, 10);
}

function drawNightBg(gfx: Phaser.GameObjects.Graphics): void {
  // Stars
  const starPositions = [
    [10, 5], [30, 12], [60, 3], [90, 8], [120, 15], [150, 4],
    [180, 9], [210, 6], [240, 13], [270, 2], [300, 10], [315, 7],
    [45, 18], [75, 11], [100, 20], [200, 16], [280, 14],
  ];
  gfx.fillStyle(0xffffff, 1);
  for (const [sx, sy] of starPositions) {
    gfx.fillRect(sx, sy, 1, 1);
  }

  // City skyline silhouette
  gfx.fillStyle(0x111133, 1);
  const buildings = [
    [0, 60, 20, 90], [18, 50, 15, 100], [30, 70, 12, 80],
    [40, 40, 18, 110], [55, 65, 10, 85], [63, 55, 22, 95],
    [82, 72, 14, 78], [94, 45, 20, 105], [110, 60, 16, 90],
    [240, 65, 14, 85], [252, 50, 18, 100], [268, 70, 12, 80],
    [278, 42, 20, 108], [296, 58, 24, 92],
  ];
  for (const [bx, by, bw, bh] of buildings) {
    gfx.fillRect(bx, by, bw, bh);
    // Windows
    gfx.fillStyle(0xffff00, 0.8);
    for (let wy = by + 5; wy < by + bh - 5; wy += 8) {
      for (let wx = bx + 3; wx < bx + bw - 3; wx += 5) {
        if (Math.random() > 0.4) {
          gfx.fillRect(wx, wy, 2, 3);
        }
      }
    }
    gfx.fillStyle(0x111133, 1);
  }

  // Neon signs
  gfx.fillStyle(0xff00ff, 1);
  gfx.fillRect(50, 68, 10, 2);
  gfx.fillStyle(0x00ffff, 1);
  gfx.fillRect(270, 62, 8, 2);
}

function drawRuinsBg(gfx: Phaser.GameObjects.Graphics): void {
  // Ancient stone sky gradient (dithered)
  for (let y = 0; y < 100; y++) {
    const c = y < 50 ? 0x3b2712 : 0x5a3d20;
    if (y % 2 === 0) {
      gfx.fillStyle(c, 1);
      gfx.fillRect(0, y, 320, 1);
    }
  }

  // Crumbling pillars
  const pillarPositions = [10, 50, 100, 220, 270, 300];
  for (const px of pillarPositions) {
    gfx.fillStyle(0x8b6344, 1);
    gfx.fillRect(px, 30, 12, 120);
    // Pillar cap
    gfx.fillStyle(0xa07050, 1);
    gfx.fillRect(px - 2, 28, 16, 6);
    // Stone texture
    gfx.fillStyle(0x7a5233, 1);
    for (let sy = 35; sy < 130; sy += 10) {
      gfx.fillRect(px + 2, sy, 8, 1);
    }
    // Broken top
    if (Math.random() > 0.5) {
      gfx.fillStyle(0x3b2712, 1);
      gfx.fillRect(px + 2, 28, 4, 8);
    }
  }

  // Torches
  const torchPositions = [35, 75, 135, 185, 245, 285];
  for (const tx of torchPositions) {
    // Torch body
    gfx.fillStyle(0x8b4513, 1);
    gfx.fillRect(tx, 60, 3, 10);
    // Flame (orange/yellow)
    gfx.fillStyle(0xff6600, 1);
    gfx.fillRect(tx - 1, 55, 5, 6);
    gfx.fillStyle(0xffcc00, 1);
    gfx.fillRect(tx, 54, 3, 4);
  }

  // Ancient mosaic floor decoration
  gfx.fillStyle(0xa07050, 1);
  gfx.fillRect(0, 140, 320, 10);
  gfx.fillStyle(0x7a5233, 1);
  for (let mx = 0; mx < 320; mx += 16) {
    gfx.fillRect(mx, 140, 1, 10);
  }
}
