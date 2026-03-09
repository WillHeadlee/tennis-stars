import Phaser from 'phaser';
import { BALL_RADIUS, COURT_FLOOR, BOUNCE_Y, BOUNCE_X, NET_X, NET_Y, NET_HEIGHT, BALL_OUT_LEFT, BALL_OUT_RIGHT, POWER_TRAIL_LENGTH, BALL_TRAIL_LENGTH, BALL_GRAVITY } from '@shared/constants';
import { ShotType } from '@shared/types';
import { createDustBurst, createNetRipple } from '../utils/effects';

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Ball {
  private scene: Phaser.Scene;
  public graphics: Phaser.GameObjects.Graphics;
  private trailGraphics: Phaser.GameObjects.Graphics;

  public x: number = 160;
  public y: number = 100;
  public vx: number = 0;
  public vy: number = 0;

  public shotType: ShotType = 'flat';
  public lastHitBy: string = ''; // 'p1' or 'p2'
  public inPlay: boolean = false;
  public bounceCount: number = 0;
  public lastBounceBy: string = ''; // 'p1side' or 'p2side'

  private trail: TrailPoint[] = [];
  private trailUpdateTimer: number = 0;

  public ownerColor: number = 0xffffff;
  public hideTrail: boolean = false; // Phantom passive

  // Net cord animation flag
  private netRippleTriggered: boolean = false;

  // Court color for dust
  public courtColor: number = 0x2d6ca2;

  // Bounce modifier (for courts)
  public bounceYMod: number = 1.0;
  public speedMod: number = 1.0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.trailGraphics = scene.add.graphics();
    this.trailGraphics.setDepth(9);
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(10);
  }

  reset(x: number = 160, y: number = 80, vx: number = 0, vy: number = 0): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.trail = [];
    this.bounceCount = 0;
    this.lastBounceBy = '';
    this.netRippleTriggered = false;
    this.inPlay = false;
    this.shotType = 'flat';
    this.lastHitBy = '';
    this.redraw();
  }

  serve(fromRight: boolean): void {
    this.inPlay = true;
    this.bounceCount = 0;
    this.lastBounceBy = '';
    this.shotType = 'flat';
    const dir = fromRight ? -1 : 1;
    this.vx = 100 * dir;
    this.vy = -280;
    this.trail = [];
  }

  update(dt: number): 'none' | 'floor' | 'out_left' | 'out_right' | 'net_blocked' | 'net_clip' {
    if (!this.inPlay) return 'none';

    // Apply gravity
    this.vy += BALL_GRAVITY * dt;

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Update trail every ~2 frames
    this.trailUpdateTimer += dt;
    if (this.trailUpdateTimer >= 0.033) {
      this.trailUpdateTimer = 0;
      const maxLen = this.shotType === 'power' || this.shotType === 'signature'
        ? POWER_TRAIL_LENGTH
        : BALL_TRAIL_LENGTH;

      if (!this.hideTrail) {
        this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
        if (this.trail.length > maxLen) {
          this.trail.shift();
        }
      }
    }

    // Fade trail alphas
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i + 1) / this.trail.length * 0.7;
    }

    let result: 'none' | 'floor' | 'out_left' | 'out_right' | 'net_blocked' | 'net_clip' = 'none';

    // Floor collision
    if (this.y >= COURT_FLOOR) {
      this.y = COURT_FLOOR;
      this.vy = -Math.abs(this.vy) * BOUNCE_Y * this.bounceYMod;
      this.vx *= BOUNCE_X;
      this.bounceCount++;

      // Determine which side
      const side = this.x < NET_X ? 'p1side' : 'p2side';
      if (side === this.lastBounceBy) {
        // Double bounce on same side → point awarded
        // (handled by GameScene)
      }
      this.lastBounceBy = side;

      // Dust effect
      createDustBurst(this.scene, this.x, this.y, this.courtColor);

      // Check out of bounds
      if (this.x < BALL_OUT_LEFT) return 'out_left';
      if (this.x > BALL_OUT_RIGHT) return 'out_right';

      result = 'floor';
    }

    // Net collision
    const netLeft = NET_X - 1;
    const netRight = NET_X + 1;

    if (this.x + BALL_RADIUS > netLeft && this.x - BALL_RADIUS < netRight) {
      if (this.y + BALL_RADIUS >= NET_Y && this.y < COURT_FLOOR) {
        const hitTopPixels = Math.abs((this.y + BALL_RADIUS) - NET_Y) <= 3;

        if (!this.netRippleTriggered) {
          this.netRippleTriggered = true;
          createNetRipple(this.scene, NET_X, NET_Y);

          if (hitTopPixels) {
            if (Math.random() < 0.3) {
              // Clip over net
              this.vy = -40;
              result = 'net_clip';
            } else {
              this.vx = -this.vx * 0.3;
              this.vy = Math.abs(this.vy) * 0.3;
              result = 'net_blocked';
            }
          } else {
            // Solid net
            this.vx = -this.vx * 0.3;
            this.vy = Math.abs(this.vy) * 0.4;
            result = 'net_blocked';
          }
        }
      } else {
        this.netRippleTriggered = false;
      }
    } else {
      this.netRippleTriggered = false;
    }

    // Wall bounds (safety)
    if (this.x < 0) { this.x = 0; this.vx = Math.abs(this.vx); return 'out_left'; }
    if (this.x > 320) { this.x = 320; this.vx = -Math.abs(this.vx); return 'out_right'; }

    this.redraw();
    return result;
  }

  redraw(): void {
    // Draw trail
    this.trailGraphics.clear();
    if (!this.hideTrail) {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const size = Math.max(1, BALL_RADIUS * (i / this.trail.length));
        this.trailGraphics.fillStyle(this.ownerColor, t.alpha);
        this.trailGraphics.fillCircle(t.x, t.y, size);
      }
    }

    // Draw ball
    this.graphics.clear();
    // Shadow
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillEllipse(this.x, this.y + 1, BALL_RADIUS * 3, BALL_RADIUS);

    // Ball body
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillCircle(this.x, this.y, BALL_RADIUS);

    // Ball highlight
    this.graphics.fillStyle(0xaaaaaa, 0.5);
    this.graphics.fillCircle(this.x - 1, this.y - 1, 1);

    // Power shot glow
    if (this.shotType === 'power' || this.shotType === 'signature') {
      this.graphics.lineStyle(1, this.ownerColor, 0.6);
      this.graphics.strokeCircle(this.x, this.y, BALL_RADIUS + 2);
    }
  }

  applyHit(
    vx: number,
    vy: number,
    type: ShotType,
    hitBy: string,
    color: number,
    hideTrail: boolean = false
  ): void {
    this.vx = vx * this.speedMod;
    this.vy = vy;
    this.shotType = type;
    this.lastHitBy = hitBy;
    this.ownerColor = color;
    this.hideTrail = hideTrail;
    this.inPlay = true;
    this.netRippleTriggered = false;
    this.bounceCount = 0;
    this.lastBounceBy = hitBy === 'p1' ? 'p1side' : 'p2side';
  }

  /** Apply Phantom's signature — return phantom ball data */
  createPhantomBall(): { x: number; y: number; vx: number; vy: number } {
    return { x: this.x, y: this.y, vx: this.vx * 0.9, vy: this.vy * 1.05 };
  }

  destroy(): void {
    this.graphics.destroy();
    this.trailGraphics.destroy();
  }
}
