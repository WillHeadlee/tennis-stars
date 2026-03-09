import Phaser from 'phaser';
import {
  PLAYER_SPEED_BASE,
  JUMP_VELOCITY,
  COURT_FLOOR,
  STAMINA_MAX,
  STAMINA_LOB_COST,
  STAMINA_POWER_COST,
  STAMINA_SIGNATURE_COST,
  P1_MIN_X, P1_MAX_X, P2_MIN_X, P2_MAX_X,
  RACKET_RANGE,
  SWING_ZONE_ABOVE,
  SWING_ZONE_BELOW,
  TIMING_PERFECT,
  TIMING_GOOD,
} from '@shared/constants';
import { CharacterId, AnimState, ShotType, TimingQuality } from '@shared/types';
import { CHARACTERS, drawCharacterSprite } from '../data/characters';

export interface SwingResult {
  hit: boolean;
  quality: TimingQuality;
  shotType: ShotType;
  vx: number;
  vy: number;
}

export class Player {
  private scene: Phaser.Scene;
  public graphics: Phaser.GameObjects.Graphics;
  public shadowGraphics: Phaser.GameObjects.Graphics;

  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;

  public isGrounded: boolean = true;
  public facingRight: boolean;
  public isP2: boolean;

  public stamina: number = 100;
  public animState: AnimState = 'idle';
  public animFrame: number = 0;
  private animTimer: number = 0;

  public isSwinging: boolean = false;
  private swingTimer: number = 0;
  private swingDuration: number = 0.3;

  public isCharging: boolean = false;
  public chargeTimer: number = 0;
  private readonly CHARGE_THRESHOLD = 1.0; // seconds to activate signature

  private readonly characterId: CharacterId;
  private readonly char: ReturnType<typeof CHARACTERS['ace']['id'] extends string ? () => typeof CHARACTERS['ace'] : never>;

  public minX: number;
  public maxX: number;

  // Signature state
  public signatureActive: boolean = false;
  public signatureTimer: number = 0;
  private readonly SIGNATURE_DURATION = 5.0; // Rally passive duration

  // Phantom clone state
  public cloneActive: boolean = false;

  // Celebrate/hurt state
  public celebrateTimer: number = 0;
  public hurtTimer: number = 0;

  // Perfect Rally passive window
  public rallyPassiveActive: boolean = false;
  public rallyPassiveTimer: number = 0;

  private _lastSwingTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, characterId: CharacterId, isP2: boolean = false) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.characterId = characterId;
    this.char = CHARACTERS[characterId] as typeof CHARACTERS[CharacterId];
    this.isP2 = isP2;
    this.facingRight = !isP2;

    this.minX = isP2 ? P2_MIN_X : P1_MIN_X;
    this.maxX = isP2 ? P2_MAX_X : P1_MAX_X;

    this.shadowGraphics = scene.add.graphics();
    this.shadowGraphics.setDepth(4);

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(5 + (isP2 ? 1 : 0));
  }

  get speedMult(): number {
    return this.char.speedMultiplier;
  }

  get powerMult(): number {
    return this.char.powerMultiplier;
  }

  moveLeft(): void {
    this.vx = -PLAYER_SPEED_BASE * this.speedMult;
    this.facingRight = false;
  }

  moveRight(): void {
    this.vx = PLAYER_SPEED_BASE * this.speedMult;
    this.facingRight = true;
  }

  stopHorizontal(): void {
    this.vx = 0;
  }

  jump(): void {
    if (this.isGrounded) {
      this.vy = JUMP_VELOCITY;
      this.isGrounded = false;
      this.animState = 'jump';
    }
  }

  startCharge(): void {
    if (!this.isSwinging) {
      this.isCharging = true;
      this.chargeTimer = 0;
      this.animState = 'charge';
    }
  }

  /** Returns true if signature should fire */
  updateCharge(dt: number): boolean {
    if (!this.isCharging) return false;
    this.chargeTimer += dt;
    return this.chargeTimer >= this.CHARGE_THRESHOLD;
  }

  releaseCharge(): boolean {
    const wasCharging = this.isCharging;
    this.isCharging = false;
    return wasCharging;
  }

  canUseSignature(): boolean {
    return this.stamina >= STAMINA_SIGNATURE_COST;
  }

  canUsePowerShot(): boolean {
    return this.stamina >= STAMINA_POWER_COST;
  }

  canUseLob(): boolean {
    return this.stamina >= STAMINA_LOB_COST;
  }

  /**
   * Attempt a swing at the ball.
   * Returns a SwingResult with hit=true if ball is in range.
   */
  swing(
    shotType: 'flat' | 'lob' | 'signature',
    ballX: number,
    ballY: number,
    movementDir: number
  ): SwingResult {
    this.isSwinging = true;
    this.swingTimer = 0;
    this.animState = 'swing';
    this._lastSwingTime = Date.now();

    const now = Date.now();
    const timeSinceIdeal = 0; // We'll determine timing by proximity

    const dx = Math.abs(this.x - ballX);
    const dy = ballY - this.y;

    const inRange = dx <= RACKET_RANGE && dy >= -SWING_ZONE_ABOVE && dy <= SWING_ZONE_BELOW;

    if (!inRange) {
      // Mishit — swung but missed
      return { hit: false, quality: 'mishit', shotType: 'flat', vx: 0, vy: 0 };
    }

    // Timing quality based on distance (closer = better)
    let quality: TimingQuality;
    if (dx <= 8) {
      quality = 'perfect';
    } else if (dx <= 14) {
      quality = 'good';
    } else {
      quality = 'mishit';
    }

    // Determine target direction (toward opponent's side)
    const targetRight = !this.isP2; // P1 shoots right, P2 shoots left

    let vx = 0;
    let vy = 0;
    let finalShotType: ShotType = shotType === 'signature' ? 'signature' : shotType;

    if (shotType === 'flat') {
      // Normal shot
      if (quality === 'perfect' && this.canUsePowerShot()) {
        // Auto-upgrade to power shot on perfect timing
        finalShotType = 'power';
        const dir = targetRight ? 1 : -1;
        vx = 250 * dir * this.powerMult;
        vy = movementDir === dir ? -180 : -200;
        this.stamina = Math.max(0, this.stamina - STAMINA_POWER_COST);
      } else {
        finalShotType = 'flat';
        const dir = targetRight ? 1 : -1;
        let speed = quality === 'mishit' ? 100 : 200;
        speed *= this.powerMult;
        vx = speed * dir;

        if (movementDir === dir) {
          // Running toward net = deep shot
          vy = -180;
        } else if (movementDir === -dir) {
          // Running away = drop shot
          vx = vx * 0.4;
          vy = -280;
        } else {
          vy = -220 + (quality === 'mishit' ? (Math.random() - 0.5) * 60 : 0);
        }
      }
    } else if (shotType === 'lob') {
      finalShotType = this.canUseLob() ? 'lob' : 'flat';
      const dir = targetRight ? 1 : -1;

      if (finalShotType === 'lob') {
        this.stamina = Math.max(0, this.stamina - STAMINA_LOB_COST);
        vx = 100 * dir;
        vy = -300;
      } else {
        // No stamina — flat fallback
        vx = 180 * dir;
        vy = -220;
      }
    } else if (shotType === 'signature') {
      if (this.canUseSignature()) {
        finalShotType = 'signature';
        this.stamina = Math.max(0, this.stamina - STAMINA_SIGNATURE_COST);
        this.signatureActive = true;
        this.signatureTimer = this.SIGNATURE_DURATION;

        // Signature velocity — character-specific
        const dir = targetRight ? 1 : -1;
        switch (this.characterId) {
          case 'ace':
            vx = 260 * dir;
            vy = -200;
            break;
          case 'crusher':
            vx = 80 * dir;
            vy = -450; // Meteor — goes up then comes down
            break;
          case 'phantom':
            vx = 220 * dir;
            vy = -230;
            break;
          case 'rally':
            // Rally passive — doesn't change shot velocity, enables perfect returns
            vx = 200 * dir;
            vy = -220;
            this.rallyPassiveActive = true;
            this.rallyPassiveTimer = 5.0;
            break;
        }
      } else {
        // Not enough stamina — mishit
        return { hit: false, quality: 'mishit', shotType: 'flat', vx: 0, vy: 0 };
      }
    }

    // Rally passive: auto-optimize shot direction
    if (this.rallyPassiveActive) {
      const dir = targetRight ? 1 : -1;
      vx = 200 * dir * this.powerMult;
      vy = -220;
      finalShotType = 'power';
    }

    return { hit: true, quality, shotType: finalShotType, vx, vy };
  }

  update(dt: number): void {
    // Gravity
    if (!this.isGrounded) {
      this.vy += 1200 * dt;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary clamping
    this.x = Phaser.Math.Clamp(this.x, this.minX, this.maxX);

    // Floor
    if (this.y >= COURT_FLOOR) {
      this.y = COURT_FLOOR;
      this.vy = 0;
      this.isGrounded = true;
    }

    // Update swing animation
    if (this.isSwinging) {
      this.swingTimer += dt;
      if (this.swingTimer >= this.swingDuration) {
        this.isSwinging = false;
        this.swingTimer = 0;
      }
    }

    // Update charge
    if (this.isCharging) {
      this.chargeTimer += dt;
    }

    // Stamina regen
    const isMoving = Math.abs(this.vx) > 1;
    if (!isMoving || this.char.regenWhileMoving) {
      const regenRate = this.char.regenRate;
      this.stamina = Math.min(STAMINA_MAX, this.stamina + regenRate * dt);
    }

    // Signature timer
    if (this.signatureActive) {
      this.signatureTimer -= dt;
      if (this.signatureTimer <= 0) {
        this.signatureActive = false;
        this.signatureTimer = 0;
      }
    }

    // Rally passive timer
    if (this.rallyPassiveActive) {
      this.rallyPassiveTimer -= dt;
      if (this.rallyPassiveTimer <= 0) {
        this.rallyPassiveActive = false;
        this.rallyPassiveTimer = 0;
      }
    }

    // Celebrate/hurt timers
    if (this.celebrateTimer > 0) { this.celebrateTimer -= dt; }
    if (this.hurtTimer > 0) { this.hurtTimer -= dt; }

    // Anim state
    this.updateAnimState();

    // Anim frame
    this.animTimer += dt;
    if (this.animTimer >= 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 8;
    }

    this.redraw();
  }

  private updateAnimState(): void {
    if (this.celebrateTimer > 0) {
      this.animState = 'celebrate';
    } else if (this.hurtTimer > 0) {
      this.animState = 'hurt';
    } else if (this.isCharging) {
      this.animState = 'charge';
    } else if (this.isSwinging) {
      this.animState = 'swing';
    } else if (!this.isGrounded) {
      this.animState = 'jump';
    } else if (Math.abs(this.vx) > 1) {
      this.animState = 'run';
    } else {
      this.animState = 'idle';
    }
  }

  celebrate(): void {
    this.celebrateTimer = 2.0;
    this.vx = 0;
  }

  hurt(): void {
    this.hurtTimer = 1.0;
  }

  redraw(): void {
    const char = CHARACTERS[this.characterId];

    // Shadow
    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x000000, 0.3);
    this.shadowGraphics.fillEllipse(this.x, COURT_FLOOR + 2, 18, 4);

    // Draw character
    this.graphics.clear();

    // Apply flip for facing direction
    const scaleX = this.facingRight ? 1 : -1;
    this.graphics.setScale(scaleX, 1);
    this.graphics.setPosition(this.x * scaleX, this.y);

    // Draw character using the data module
    drawCharacterSprite(this.graphics, this.characterId, this.animFrame, this.facingRight, this.isGrounded);

    // Reset position for accurate hit detection rendering
    this.graphics.setScale(1, 1);
    this.graphics.setPosition(0, 0);

    // Re-draw at correct position with flip
    drawCharacterAtPosition(this.graphics, this.characterId, this.animFrame, this.facingRight, this.isGrounded, this.x, this.y, this.animState);

    // Charge glow
    if (this.isCharging) {
      const glowAlpha = Math.min(1, this.chargeTimer / 1.0) * 0.7;
      this.graphics.lineStyle(2, char.color, glowAlpha);
      this.graphics.strokeCircle(this.x, this.y - 8, 10 + this.chargeTimer * 5);
    }

    // Rally passive glow (green ball aura)
    if (this.rallyPassiveActive) {
      this.graphics.lineStyle(1, 0x00ff00, 0.5);
      this.graphics.strokeCircle(this.x, this.y - 8, 14);
    }

    // Hurt flash
    if (this.hurtTimer > 0) {
      const flashAlpha = Math.sin(this.hurtTimer * 20) > 0 ? 0.5 : 0;
      this.graphics.fillStyle(0xff0000, flashAlpha);
      this.graphics.fillRect(this.x - 8, this.y - 24, 16, 24);
    }
  }

  getCharacterColor(): number {
    return CHARACTERS[this.characterId].color;
  }

  getCharacterId(): CharacterId {
    return this.characterId;
  }

  destroy(): void {
    this.graphics.destroy();
    this.shadowGraphics.destroy();
  }
}

/**
 * Standalone draw function that positions the character correctly with flip.
 */
function drawCharacterAtPosition(
  gfx: Phaser.GameObjects.Graphics,
  characterId: CharacterId,
  animFrame: number,
  facingRight: boolean,
  isGrounded: boolean,
  worldX: number,
  worldY: number,
  animState: AnimState
): void {
  const char = CHARACTERS[characterId];
  const primary = char.color;
  const accent = char.accentColor;
  const outline = 0x000000;

  const bobY = isGrounded ? Math.sin(animFrame * 0.3) * 0.5 : 0;

  // Jump offset
  const jumpOffset = animState === 'jump' ? -4 : 0;
  // Swing lean
  const swingLean = animState === 'swing' ? (facingRight ? 3 : -3) : 0;

  const px = worldX + swingLean;
  const py = worldY + bobY + jumpOffset;

  // Flip x coordinates
  const fx = (x: number) => facingRight ? px + x : px - x;

  // Outline background
  gfx.fillStyle(outline, 1);

  // Body
  gfx.fillStyle(primary, 1);
  gfx.fillRect(fx(-6), py - 22, 12, 22);

  // Head
  gfx.fillStyle(0xffd700, 1);
  gfx.fillRect(fx(-4), py - 28, 8, 7);

  // Character-specific accents
  switch (characterId) {
    case 'ace':
      // Hair
      gfx.fillStyle(0x1d2b53, 1);
      gfx.fillRect(fx(-4), py - 31, 8, 4);
      // Racket
      gfx.fillStyle(0xffcc00, 1);
      gfx.fillRect(fx(5), py - 26, 2, 10);
      // Stripes
      gfx.fillStyle(accent, 1);
      gfx.fillRect(fx(-6), py - 18, 2, 10);
      gfx.fillRect(fx(4), py - 18, 2, 10);
      break;

    case 'crusher':
      // Headband
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(fx(-4), py - 26, 8, 2);
      // Oversized racket
      gfx.fillStyle(0x888888, 1);
      gfx.fillRect(fx(6), py - 28, 4, 14);
      gfx.fillStyle(0xdddddd, 1);
      gfx.fillRect(fx(6), py - 28, 3, 12);
      break;

    case 'phantom':
      // Cloak
      gfx.fillStyle(0x3b1f5c, 1);
      gfx.fillRect(fx(-7), py - 18, 4, 10);
      gfx.fillRect(fx(3), py - 18, 4, 10);
      // Visor mask
      gfx.fillStyle(primary, 1);
      gfx.fillRect(fx(-4), py - 27, 8, 2);
      // Long racket
      gfx.fillStyle(0x5f574f, 1);
      gfx.fillRect(fx(5), py - 30, 2, 16);
      break;

    case 'rally':
      // Polo collar
      gfx.fillStyle(accent, 1);
      gfx.fillRect(fx(-2), py - 20, 4, 3);
      // Sweatband
      gfx.fillStyle(accent, 1);
      gfx.fillRect(fx(-4), py - 26, 8, 2);
      // Round racket
      gfx.fillStyle(0x8b4513, 1);
      gfx.fillRect(fx(5), py - 17, 2, 8);
      gfx.fillStyle(0xc8a000, 1);
      gfx.fillRect(fx(4), py - 26, 4, 10);
      break;
  }

  // Legs with walk animation
  const legOff = isGrounded ? Math.sin(animFrame * 0.5) * 2 : 0;
  const legColor = primary;
  gfx.fillStyle(legColor, 1);
  gfx.fillRect(fx(-5), py - 8, 4, 8 + legOff);
  gfx.fillRect(fx(1), py - 8, 4, 8 - legOff);

  // Shoes
  gfx.fillStyle(animState === 'celebrate' ? 0xffff00 : 0x222222, 1);
  gfx.fillRect(fx(-6), py - 1 + legOff, 5, 3);
  gfx.fillRect(fx(1), py - 1 - legOff, 5, 3);
}
