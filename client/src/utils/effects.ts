import Phaser from 'phaser';
import {
  SCREENSHAKE_AMOUNT,
  SCREENSHAKE_FRAMES,
  HIT_FREEZE_FRAMES,
  SLOW_MO_SCALE,
  SLOW_MO_DURATION,
  DUST_PARTICLE_COUNT,
} from '@shared/constants';

/** Screenshake state */
let shakeFrames = 0;
let shakeAmount = SCREENSHAKE_AMOUNT;

/** Hit freeze state */
let freezeFrames = 0;

/** Slow-mo state */
let slowMoTimer = 0;
let originalTimeScale = 1;

/**
 * Trigger a camera screenshake.
 * amount is in native pixels (320px wide canvas).
 */
export function triggerScreenshake(scene: Phaser.Scene, amount: number = SCREENSHAKE_AMOUNT, frames: number = SCREENSHAKE_FRAMES): void {
  // Convert pixel amount to viewport fraction (Phaser uses 0–1 range)
  const intensity = amount / 320;
  scene.cameras.main.shake(frames * (1000 / 60), intensity);
}

/**
 * Trigger a hit freeze (visual stutter — no-op for Phaser physics since
 * this game uses custom physics; freeze is tracked via freezeFrames and
 * checked in GameScene.update before advancing game logic).
 */
export function triggerHitFreeze(_scene: Phaser.Scene, frames: number = HIT_FREEZE_FRAMES): void {
  freezeFrames = frames;
}

/**
 * Update freeze countdown — call in scene update.
 * Returns true if still frozen.
 */
export function updateHitFreeze(_scene: Phaser.Scene): boolean {
  if (freezeFrames > 0) {
    freezeFrames--;
    return true;
  }
  return false;
}

/** Returns true if a hit freeze is currently active */
export function isHitFrozen(): boolean {
  return freezeFrames > 0;
}

/**
 * Trigger slow motion for match point or special moves.
 */
export function triggerSlowMo(scene: Phaser.Scene, scale: number = SLOW_MO_SCALE, duration: number = SLOW_MO_DURATION): void {
  scene.time.timeScale = scale;
  originalTimeScale = scale;
  slowMoTimer = duration;
}

/**
 * Update slow-mo countdown — call in scene update with real delta.
 */
export function updateSlowMo(scene: Phaser.Scene, realDeltaMs: number): void {
  if (slowMoTimer > 0) {
    slowMoTimer -= realDeltaMs;
    if (slowMoTimer <= 0) {
      scene.time.timeScale = 1;
      slowMoTimer = 0;
    }
  }
}

/**
 * Create a dust burst particle effect at a position.
 */
export function createDustBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number = 0xc8a870,
  count: number = DUST_PARTICLE_COUNT
): void {
  const particles: Phaser.GameObjects.Graphics[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 20 + Math.random() * 20;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 20;

    const dot = scene.add.graphics();
    dot.fillStyle(color, 1);
    dot.fillRect(0, 0, 2, 2);
    dot.setPosition(x, y);
    dot.setDepth(20);
    particles.push(dot);

    let elapsed = 0;
    const life = 300 + Math.random() * 200;
    let px = x;
    let pvy = vy;

    scene.time.addEvent({
      delay: 16,
      repeat: Math.floor(life / 16),
      callback: () => {
        elapsed += 16;
        px += vx * 0.016;
        pvy += 800 * 0.016; // gravity
        dot.y += pvy * 0.016;
        dot.x = px;
        dot.setAlpha(1 - elapsed / life);
        if (elapsed >= life) {
          dot.destroy();
        }
      },
    });
  }
}

/**
 * Create a screen flash (white overlay that fades quickly).
 */
export function createScreenFlash(scene: Phaser.Scene, color: number = 0xffffff, duration: number = 150): void {
  const flash = scene.add.graphics();
  flash.fillStyle(color, 0.8);
  flash.fillRect(0, 0, 320, 180);
  flash.setDepth(100);
  flash.setScrollFactor(0);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    duration: duration,
    ease: 'Linear',
    onComplete: () => flash.destroy(),
  });
}

/**
 * Create a score popup text that bounces down from the top.
 */
export function createScorePopup(scene: Phaser.Scene, text: string, color: string = '#ffffff'): void {
  const popup = scene.add.text(160, -20, text, {
    fontFamily: '"Press Start 2P"',
    fontSize: '10px',
    color: color,
    stroke: '#000000',
    strokeThickness: 2,
  });
  popup.setOrigin(0.5, 0.5);
  popup.setDepth(50);
  popup.setScrollFactor(0);

  scene.tweens.add({
    targets: popup,
    y: 60,
    duration: 400,
    ease: 'Bounce.Out',
    onComplete: () => {
      scene.time.delayedCall(800, () => {
        scene.tweens.add({
          targets: popup,
          y: -20,
          alpha: 0,
          duration: 300,
          ease: 'Power2',
          onComplete: () => popup.destroy(),
        });
      });
    },
  });
}

/**
 * Create character-specific power burst particles on signature move.
 */
export function createSignatureBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  color: number,
  count: number = 12
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 40 + Math.random() * 40;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const dot = scene.add.graphics();
    dot.fillStyle(color, 1);
    dot.fillRect(0, 0, 3, 3);
    dot.setPosition(x, y);
    dot.setDepth(30);

    let elapsed = 0;
    const life = 500;
    let px = x;
    let py = y;

    scene.time.addEvent({
      delay: 16,
      repeat: Math.floor(life / 16),
      callback: () => {
        elapsed += 16;
        px += vx * 0.016;
        py += vy * 0.016;
        dot.x = px;
        dot.y = py;
        dot.setAlpha(1 - elapsed / life);
        const s = 1 - elapsed / life;
        dot.setScale(s);
        if (elapsed >= life) dot.destroy();
      },
    });
  }
}

/**
 * Create a net ripple effect.
 */
export function createNetRipple(scene: Phaser.Scene, netX: number, netY: number): void {
  const ripple = scene.add.graphics();
  ripple.setDepth(15);
  let frame = 0;

  const timer = scene.time.addEvent({
    delay: 50,
    repeat: 4,
    callback: () => {
      ripple.clear();
      const offset = frame % 2 === 0 ? 1 : -1;
      ripple.lineStyle(1, 0xffffff, 0.8 - frame * 0.15);
      ripple.strokeRect(netX - 1 + offset, netY, 2, 22);
      frame++;
      if (frame >= 4) {
        ripple.destroy();
        timer.destroy();
      }
    },
  });
}

/**
 * Create a "stamp" text label (for WIN / OUT / NET etc.)
 */
export function createStampText(scene: Phaser.Scene, text: string, x: number, y: number, color: string = '#ffff00'): Phaser.GameObjects.Text {
  const stamp = scene.add.text(x, y, text, {
    fontFamily: '"Press Start 2P"',
    fontSize: '8px',
    color: color,
    stroke: '#000000',
    strokeThickness: 2,
  });
  stamp.setOrigin(0.5, 0.5);
  stamp.setDepth(50);
  stamp.setScrollFactor(0);
  stamp.setAlpha(0);

  scene.tweens.add({
    targets: stamp,
    alpha: 1,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 150,
    ease: 'Power2',
    yoyo: false,
    onComplete: () => {
      scene.time.delayedCall(1000, () => {
        scene.tweens.add({
          targets: stamp,
          alpha: 0,
          duration: 300,
          onComplete: () => stamp.destroy(),
        });
      });
    },
  });

  return stamp;
}
