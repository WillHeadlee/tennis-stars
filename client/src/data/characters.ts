import { CharacterStats, CharacterId } from '@shared/types';

export const CHARACTERS: Record<CharacterId, CharacterStats> = {
  ace: {
    id: 'ace',
    name: 'ACE',
    speed: 5,
    power: 3,
    staminaRegen: 3,
    speedMultiplier: 1.25,
    powerMultiplier: 1.0,
    regenRate: 8,
    regenWhileMoving: false,
    color: 0x29adff,       // Blue
    accentColor: 0xffffff, // White
    description: 'Blazing speed & dash smash',
  },
  crusher: {
    id: 'crusher',
    name: 'CRUSHER',
    speed: 3,
    power: 5,
    staminaRegen: 2,
    speedMultiplier: 1.0,
    powerMultiplier: 1.15,
    regenRate: 5,
    regenWhileMoving: false,
    color: 0xff0000,       // Red
    accentColor: 0x222222, // Dark
    description: 'Unstoppable power shots',
  },
  phantom: {
    id: 'phantom',
    name: 'PHANTOM',
    speed: 4,
    power: 3,
    staminaRegen: 4,
    speedMultiplier: 1.1,
    powerMultiplier: 1.0,
    regenRate: 10,
    regenWhileMoving: false,
    color: 0x7e2553,       // Purple
    accentColor: 0x000000, // Black
    description: 'Tricky shadow clone move',
  },
  rally: {
    id: 'rally',
    name: 'RALLY',
    speed: 3,
    power: 3,
    staminaRegen: 5,
    speedMultiplier: 1.0,
    powerMultiplier: 1.0,
    regenRate: 15,
    regenWhileMoving: true,
    color: 0x00b543,       // Green
    accentColor: 0xffffff, // White
    description: 'Perfect Rally for 5 seconds',
  },
};

export const CHARACTER_ORDER: CharacterId[] = ['ace', 'crusher', 'phantom', 'rally'];

/**
 * Draw a character sprite using Phaser Graphics.
 * All sprites are 12px wide × 24px tall at native resolution.
 */
export function drawCharacterSprite(
  gfx: Phaser.GameObjects.Graphics,
  characterId: CharacterId,
  animFrame: number,
  facingRight: boolean,
  isGrounded: boolean
): void {
  const char = CHARACTERS[characterId];
  const primary = char.color;
  const accent = char.accentColor;
  const outline = 0x000000;

  gfx.clear();

  // Flip transform is handled by the parent container's scaleX
  // Draw at origin (0,0) centered

  const bobY = isGrounded ? Math.sin(animFrame * 0.3) * 1 : 0;

  // Outline pass (1px border simulation via slightly larger shapes)
  gfx.fillStyle(outline, 1);

  switch (characterId) {
    case 'ace':
      drawAce(gfx, primary, accent, outline, animFrame, bobY);
      break;
    case 'crusher':
      drawCrusher(gfx, primary, accent, outline, animFrame, bobY);
      break;
    case 'phantom':
      drawPhantom(gfx, primary, accent, outline, animFrame, bobY);
      break;
    case 'rally':
      drawRally(gfx, primary, accent, outline, animFrame, bobY);
      break;
  }
}

function drawAce(gfx: Phaser.GameObjects.Graphics, primary: number, accent: number, outline: number, frame: number, bobY: number): void {
  const ox = -6;
  const oy = -22 + bobY;

  // Outline
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox - 1, oy - 1, 14, 26);

  // Body (tracksuit)
  gfx.fillStyle(primary, 1);
  gfx.fillRect(ox, oy + 4, 12, 14); // torso + legs

  // Head
  gfx.fillStyle(0xffd700, 1); // skin
  gfx.fillRect(ox + 2, oy, 8, 7); // head

  // Spiky hair
  gfx.fillStyle(0x1d2b53, 1);
  gfx.fillRect(ox + 2, oy - 2, 8, 4);
  gfx.fillRect(ox + 1, oy - 3, 2, 2);
  gfx.fillRect(ox + 5, oy - 4, 2, 3);
  gfx.fillRect(ox + 8, oy - 3, 2, 2);

  // White stripes on suit
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox, oy + 4, 2, 14);
  gfx.fillRect(ox + 10, oy + 4, 2, 14);

  // Racket (thin)
  gfx.fillStyle(0xffcc00, 1);
  gfx.fillRect(ox + 11, oy + 2, 2, 10);
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox + 11, oy + 1, 2, 1);

  // Legs
  gfx.fillStyle(primary, 1);
  const legOffset = Math.sin(frame * 0.5) * 2;
  gfx.fillRect(ox + 1, oy + 16, 4, 6 + legOffset);
  gfx.fillRect(ox + 7, oy + 16, 4, 6 - legOffset);

  // Shoes
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox, oy + 20 + legOffset, 5, 3);
  gfx.fillRect(ox + 7, oy + 20 - legOffset, 5, 3);
}

function drawCrusher(gfx: Phaser.GameObjects.Graphics, primary: number, accent: number, outline: number, frame: number, bobY: number): void {
  const ox = -7;
  const oy = -22 + bobY;

  // Outline (stocky = wider)
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox - 1, oy - 1, 16, 26);

  // Body (bulky)
  gfx.fillStyle(primary, 1);
  gfx.fillRect(ox, oy + 4, 14, 16);

  // Head
  gfx.fillStyle(0xffd700, 1);
  gfx.fillRect(ox + 3, oy, 8, 7);

  // Headband
  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(ox + 3, oy + 1, 8, 2);

  // Dark outfit highlights
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox + 4, oy + 6, 6, 2);
  gfx.fillRect(ox + 4, oy + 12, 6, 2);

  // Oversized racket
  gfx.fillStyle(0x888888, 1);
  gfx.fillRect(ox + 13, oy, 4, 14);
  gfx.fillStyle(0xaaaaaa, 1);
  gfx.fillRect(ox + 13, oy, 3, 12);
  // Strings
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox + 14, oy, 1, 12);
  gfx.fillRect(ox + 13, oy + 4, 3, 1);
  gfx.fillRect(ox + 13, oy + 8, 3, 1);

  // Legs
  gfx.fillStyle(primary, 1);
  const legOffset = Math.sin(frame * 0.4) * 2;
  gfx.fillRect(ox + 1, oy + 18, 5, 5 + legOffset);
  gfx.fillRect(ox + 8, oy + 18, 5, 5 - legOffset);

  // Shoes
  gfx.fillStyle(0x333333, 1);
  gfx.fillRect(ox, oy + 21 + legOffset, 7, 3);
  gfx.fillRect(ox + 7, oy + 21 - legOffset, 7, 3);
}

function drawPhantom(gfx: Phaser.GameObjects.Graphics, primary: number, accent: number, outline: number, frame: number, bobY: number): void {
  const ox = -6;
  const oy = -24 + bobY; // taller

  // Outline
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox - 1, oy - 1, 14, 28);

  // Cloak (tall, purple/black)
  gfx.fillStyle(primary, 1);
  gfx.fillRect(ox, oy + 4, 12, 20);

  // Cloak bottom swish
  gfx.fillStyle(0x3b1f5c, 1);
  gfx.fillRect(ox - 1, oy + 20, 4, 4);
  gfx.fillRect(ox + 9, oy + 20, 4, 4);

  // Head with mask visor
  gfx.fillStyle(accent, 1); // black mask
  gfx.fillRect(ox + 2, oy, 8, 7);
  gfx.fillStyle(0x7e2553, 1); // purple visor
  gfx.fillRect(ox + 2, oy + 2, 8, 3);
  // Visor glint
  gfx.fillStyle(0x83769c, 1);
  gfx.fillRect(ox + 3, oy + 2, 2, 1);

  // Long racket
  gfx.fillStyle(0x5f574f, 1);
  gfx.fillRect(ox + 12, oy - 2, 2, 16);
  gfx.fillStyle(0x9badb7, 1);
  gfx.fillRect(ox + 12, oy - 2, 2, 14);

  // Cloak flutter
  const flutterOffset = Math.sin(frame * 0.3) * 1.5;
  gfx.fillStyle(0x3b1f5c, 1);
  gfx.fillRect(ox - 1, oy + 14, 3, 8 + flutterOffset);
  gfx.fillRect(ox + 10, oy + 14, 3, 8 - flutterOffset);
}

function drawRally(gfx: Phaser.GameObjects.Graphics, primary: number, accent: number, outline: number, frame: number, bobY: number): void {
  const ox = -6;
  const oy = -22 + bobY;

  // Outline
  gfx.fillStyle(outline, 1);
  gfx.fillRect(ox - 1, oy - 1, 14, 26);

  // Body (polo shirt)
  gfx.fillStyle(primary, 1);
  gfx.fillRect(ox, oy + 4, 12, 14);

  // White polo collar
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox + 4, oy + 4, 4, 3);

  // Head
  gfx.fillStyle(0xffd700, 1);
  gfx.fillRect(ox + 2, oy, 8, 7);

  // Sweatband
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox + 2, oy + 1, 8, 2);

  // Classic round racket
  gfx.fillStyle(0x8b4513, 1); // wood handle
  gfx.fillRect(ox + 12, oy + 8, 2, 8);
  gfx.fillStyle(0xc8a000, 1); // round frame
  gfx.fillRect(ox + 10, oy, 4, 10);
  gfx.fillStyle(accent, 1); // strings
  gfx.fillRect(ox + 11, oy, 2, 10);
  gfx.fillRect(ox + 10, oy + 3, 4, 1);
  gfx.fillRect(ox + 10, oy + 6, 4, 1);

  // Legs
  gfx.fillStyle(0xffffff, 1); // white shorts
  gfx.fillRect(ox + 1, oy + 16, 10, 4);

  gfx.fillStyle(primary, 1);
  const legOffset = Math.sin(frame * 0.45) * 2;
  gfx.fillRect(ox + 1, oy + 18, 4, 5 + legOffset);
  gfx.fillRect(ox + 7, oy + 18, 4, 5 - legOffset);

  // Shoes
  gfx.fillStyle(accent, 1);
  gfx.fillRect(ox, oy + 21 + legOffset, 5, 3);
  gfx.fillRect(ox + 7, oy + 21 - legOffset, 5, 3);
}

/**
 * Draw a small portrait (16×16) for the HUD.
 */
export function drawCharacterPortrait(gfx: Phaser.GameObjects.Graphics, characterId: CharacterId): void {
  const char = CHARACTERS[characterId];
  gfx.clear();

  // Background
  gfx.fillStyle(0x000000, 1);
  gfx.fillRect(0, 0, 16, 16);

  // Simple icon
  gfx.fillStyle(char.color, 1);
  gfx.fillRect(4, 4, 8, 10);

  // Head
  gfx.fillStyle(0xffd700, 1);
  gfx.fillRect(5, 2, 6, 5);

  // Border
  gfx.lineStyle(1, char.color, 1);
  gfx.strokeRect(0, 0, 16, 16);
}
