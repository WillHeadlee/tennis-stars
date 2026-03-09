import Phaser from 'phaser';
import { CharacterId, CourtId, GameMode, AIDifficulty, AIState } from '@shared/types';
import {
  NET_X, NET_Y, COURT_FLOOR, P1_MIN_X, P1_MAX_X, P2_MIN_X, P2_MAX_X,
  SERVE_HEIGHT, SERVE_RESET_DELAY, AI_DELAY_EASY, AI_DELAY_MEDIUM, AI_DELAY_HARD,
  AI_SIGNATURE_STAMINA_HARD, AI_POWER_STAMINA_MEDIUM, BALL_GRAVITY,
} from '@shared/constants';
import { Ball } from '../entities/Ball';
import { Player } from '../entities/Player';
import { Net } from '../entities/Net';
import { drawCourt, COURTS } from '../data/courts';
import { CHARACTERS } from '../data/characters';
import {
  createInitialScore, awardPoint, pointsToDisplay, isMatchPoint, isMatchPointFor, TennisScore,
} from '../utils/scoring';
import {
  triggerScreenshake, triggerHitFreeze, updateHitFreeze,
  triggerSlowMo, updateSlowMo, createScreenFlash, createScorePopup,
  createSignatureBurst, createStampText,
} from '../utils/effects';

interface GameSceneData {
  mode: GameMode;
  p1CharId: CharacterId;
  p2CharId: CharacterId;
  courtId: CourtId;
  aiDifficulty: AIDifficulty;
}

type GamePhase = 'serve' | 'playing' | 'point_pause' | 'set_end' | 'match_end';

export class GameScene extends Phaser.Scene {
  // Configuration
  private mode: GameMode = 'local';
  private p1CharId: CharacterId = 'ace';
  private p2CharId: CharacterId = 'crusher';
  private courtId: CourtId = 'stadium';
  private aiDifficulty: AIDifficulty = 'medium';

  // Entities
  private ball!: Ball;
  private p1!: Player;
  private p2!: Player;
  private net!: Net;

  // Graphics
  private courtGraphics!: Phaser.GameObjects.Graphics;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;

  // Game state
  private score!: TennisScore;
  private phase: GamePhase = 'serve';
  private pointPauseTimer: number = 0;
  private lastPointWinner: 'p1' | 'p2' | null = null;
  private servingPlayer: 'p1' | 'p2' = 'p1';
  private matchPointSlowTriggered: boolean = false;

  // Input
  private p1Keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private p2Keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // AI state
  private aiState: AIState = 'idle';
  private aiReactionTimer: number = 0;
  private aiTargetX: number = 0;
  private aiDecisionTimer: number = 0;
  private aiLastDecisionTime: number = 0;

  // Phantom clone state
  private phantomBallActive: boolean = false;
  private phantomBallX: number = 0;
  private phantomBallY: number = 0;
  private phantomBallVx: number = 0;
  private phantomBallVy: number = 0;
  private phantomBallGfx!: Phaser.GameObjects.Graphics;

  // Practice mode
  private practiceMachineTimer: number = 0;
  private practiceHitStreak: number = 0;
  private practiceStreakText!: Phaser.GameObjects.Text;

  // P1 charge tracking
  private p1ChargeStarted: boolean = false;

  // P2/AI charge tracking
  private p2ChargeStarted: boolean = false;

  // Bounce tracking for double-bounce detection
  private ballBounceSide: 'p1side' | 'p2side' | null = null;
  private ballBounceCount: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneData): void {
    this.mode = data.mode || 'local';
    this.p1CharId = data.p1CharId || 'ace';
    this.p2CharId = data.p2CharId || 'crusher';
    this.courtId = data.courtId || 'stadium';
    this.aiDifficulty = data.aiDifficulty || 'medium';
  }

  create(): void {
    // Draw court
    this.courtGraphics = this.add.graphics();
    this.courtGraphics.setDepth(0);
    drawCourt(this.courtGraphics, this.courtId);

    // Create entities
    this.net = new Net(this, COURTS[this.courtId].netColor);
    this.ball = new Ball(this);
    this.ball.courtColor = COURTS[this.courtId].floorColor;
    this.ball.bounceYMod = COURTS[this.courtId].bounceHeightMod;
    this.ball.speedMod = COURTS[this.courtId].ballSpeedMod;

    this.p1 = new Player(this, 60, COURT_FLOOR, this.p1CharId, false);
    this.p2 = new Player(this, 260, COURT_FLOOR, this.p2CharId, true);

    // Phantom clone graphics
    this.phantomBallGfx = this.add.graphics();
    this.phantomBallGfx.setDepth(9);

    // Scanlines
    this.scanlineGraphics = this.add.graphics();
    this.scanlineGraphics.setDepth(200);
    this.scanlineGraphics.setAlpha(0.06);
    for (let y = 0; y < 180; y += 2) {
      this.scanlineGraphics.fillStyle(0x000000, 1);
      this.scanlineGraphics.fillRect(0, y, 320, 1);
    }

    // Score
    this.score = createInitialScore();
    this.servingPlayer = 'p1';

    // Setup input
    this.setupInput();

    // Start serving
    this.resetForServe();

    // Launch HUD
    this.scene.launch('HUDScene', {
      score: this.score,
      p1CharId: this.p1CharId,
      p2CharId: this.p2CharId,
    });

    // Countdown
    this.showCountdown(() => {
      this.phase = 'serve';
    });

    // Practice mode setup
    if (this.mode === 'practice') {
      this.practiceStreakText = this.add.text(160, 10, 'STREAK: 0', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '6px',
        color: '#ffff00',
      }).setOrigin(0.5, 0).setDepth(50);
    }
  }

  private setupInput(): void {
    this.p1Keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      jump2: Phaser.Input.Keyboard.KeyCodes.SPACE,
      flat: Phaser.Input.Keyboard.KeyCodes.J,
      lob: Phaser.Input.Keyboard.KeyCodes.K,
      sig: Phaser.Input.Keyboard.KeyCodes.L,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.p2Keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.UP,
      flat: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      lob: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      sig: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // P1 flat swing (event-based)
    this.input.keyboard!.on('keydown-J', () => {
      if (this.phase !== 'playing' && this.phase !== 'serve') return;
      if (this.phase === 'serve' && this.servingPlayer === 'p1') {
        this.launchServe('p1');
        return;
      }
      this.doSwing(this.p1, 'flat', 'p1');
    });

    // P1 lob
    this.input.keyboard!.on('keydown-K', () => {
      if (this.phase !== 'playing') return;
      this.doSwing(this.p1, 'lob', 'p1');
    });

    // P1 signature
    this.input.keyboard!.on('keydown-L', () => {
      if (this.phase !== 'playing') return;
      if (!this.p1ChargeStarted) {
        this.p1ChargeStarted = true;
        this.p1.startCharge();
      }
    });
    this.input.keyboard!.on('keyup-L', () => {
      if (this.p1ChargeStarted) {
        this.p1ChargeStarted = false;
        const wasCharging = this.p1.releaseCharge();
        if (wasCharging && this.p1.chargeTimer >= 1.0) {
          this.doSwing(this.p1, 'signature', 'p1');
        }
      }
    });

    // P2 controls (local mode only)
    if (this.mode === 'local') {
      this.input.keyboard!.on('keydown-NUMPAD_ONE', () => {
        if (this.phase !== 'playing' && this.phase !== 'serve') return;
        if (this.phase === 'serve' && this.servingPlayer === 'p2') {
          this.launchServe('p2');
          return;
        }
        this.doSwing(this.p2, 'flat', 'p2');
      });

      this.input.keyboard!.on('keydown-NUMPAD_TWO', () => {
        if (this.phase !== 'playing') return;
        this.doSwing(this.p2, 'lob', 'p2');
      });

      this.input.keyboard!.on('keydown-NUMPAD_THREE', () => {
        if (this.phase !== 'playing') return;
        if (!this.p2ChargeStarted) {
          this.p2ChargeStarted = true;
          this.p2.startCharge();
        }
      });

      this.input.keyboard!.on('keyup-NUMPAD_THREE', () => {
        if (this.p2ChargeStarted) {
          this.p2ChargeStarted = false;
          const wasCharging = this.p2.releaseCharge();
          if (wasCharging && this.p2.chargeTimer >= 1.0) {
            this.doSwing(this.p2, 'signature', 'p2');
          }
        }
      });
    }
  }

  private showCountdown(onDone: () => void): void {
    const nums = ['3', '2', '1', 'GO!'];
    let i = 0;
    const showNext = () => {
      if (i >= nums.length) {
        onDone();
        return;
      }
      const t = this.add.text(160, 90, nums[i], {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      });
      t.setOrigin(0.5, 0.5);
      t.setDepth(50);
      this.tweens.add({
        targets: t,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 700,
        ease: 'Power2',
        onComplete: () => { t.destroy(); i++; showNext(); },
      });
    };
    showNext();
  }

  private resetForServe(): void {
    this.phase = 'serve';
    this.ball.inPlay = false;
    this.matchPointSlowTriggered = false;
    this.ballBounceSide = null;
    this.ballBounceCount = 0;

    // Position players
    this.p1.x = 60;
    this.p1.y = COURT_FLOOR;
    this.p1.vx = 0;
    this.p1.vy = 0;
    this.p1.isGrounded = true;

    this.p2.x = 260;
    this.p2.y = COURT_FLOOR;
    this.p2.vx = 0;
    this.p2.vy = 0;
    this.p2.isGrounded = true;

    // Position ball at server's position
    if (this.servingPlayer === 'p1') {
      this.ball.reset(60, COURT_FLOOR - 30);
    } else {
      this.ball.reset(260, COURT_FLOOR - 30);
    }

    // Clear phantom
    this.phantomBallActive = false;
    this.phantomBallGfx.clear();
  }

  private launchServe(side: 'p1' | 'p2'): void {
    if (this.servingPlayer !== side) return;
    this.phase = 'playing';
    this.ball.serve(side === 'p2');
    this.ball.lastHitBy = side;
    this.ballBounceSide = side === 'p1' ? 'p1side' : 'p2side';
    this.ballBounceCount = 0;
  }

  private doSwing(player: Player, shotType: 'flat' | 'lob' | 'signature', playerKey: 'p1' | 'p2'): void {
    const movementDir = player.vx > 1 ? 1 : player.vx < -1 ? -1 : 0;
    const result = player.swing(shotType, this.ball.x, this.ball.y, movementDir);

    if (!result.hit) return;

    // Apply hit to ball
    const color = CHARACTERS[player.getCharacterId()].color;
    const hideTrail = player.getCharacterId() === 'phantom' && shotType !== 'signature';

    this.ball.applyHit(result.vx, result.vy, result.shotType, playerKey, color, hideTrail);
    this.ballBounceSide = playerKey === 'p1' ? 'p1side' : 'p2side';
    this.ballBounceCount = 0;

    // Crusher passive: ball bounces lower on opponent's side
    if (player.getCharacterId() === 'crusher') {
      // Handled via reduced bounce on opponent's side (applied via shotType=power lower bounce)
    }

    // Game feel
    if (result.shotType === 'power' || result.shotType === 'signature') {
      triggerScreenshake(this, 2, 6);
      createScreenFlash(this, CHARACTERS[player.getCharacterId()].color, 80);
    }

    triggerHitFreeze(this, 3);

    // Signature effects
    if (result.shotType === 'signature') {
      createSignatureBurst(this, player.x, player.y - 12, color, 16);

      if (player.getCharacterId() === 'ace') {
        // Ace: teleport flash
        createScreenFlash(this, 0xffffff, 100);
        const origX = player.x;
        player.x = this.ball.x - (playerKey === 'p1' ? 15 : -15);
        player.x = Phaser.Math.Clamp(player.x, player.minX, player.maxX);
        this.time.delayedCall(100, () => { player.x = origX; });
      } else if (player.getCharacterId() === 'crusher') {
        // Crusher: leap up and crash (visual only, ball already set)
        triggerScreenshake(this, 4, 10);
      } else if (player.getCharacterId() === 'phantom') {
        // Phantom: spawn clone ball
        this.spawnPhantomClone();
      }
      // Rally signature handled in Player.swing()
    }

    // Match point slow-mo
    if (isMatchPoint(this.score) && !this.matchPointSlowTriggered) {
      this.matchPointSlowTriggered = true;
      triggerSlowMo(this, 0.5, 1000);
    }

    // Update HUD
    this.updateHUD();
  }

  private spawnPhantomClone(): void {
    const clone = this.ball.createPhantomBall();
    this.phantomBallX = clone.x;
    this.phantomBallY = clone.y;
    this.phantomBallVx = clone.vx;
    this.phantomBallVy = clone.vy;
    this.phantomBallActive = true;
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    updateHitFreeze(this);
    updateSlowMo(this, delta);

    if (this.phase === 'point_pause') {
      this.pointPauseTimer -= dt;
      if (this.pointPauseTimer <= 0) {
        this.phase = 'serve';
        this.resetForServe();

        // Check match over
        if (this.score.matchOver) {
          this.phase = 'match_end';
          this.showMatchEnd();
        }
      }
      // Still update players visually
      this.p1.update(dt);
      this.p2.update(dt);
      return;
    }

    if (this.phase === 'match_end' || this.phase === 'set_end') return;

    // P1 input
    this.handleP1Input(dt);

    // P2 input / AI
    if (this.mode === 'local') {
      this.handleP2Input(dt);
    } else if (this.mode === 'ai') {
      this.handleAI(dt);
    } else if (this.mode === 'practice') {
      this.handleAI(dt); // practice uses AI as ball machine
    }

    // Update entities
    this.p1.update(dt);
    this.p2.update(dt);
    this.net.update(dt);

    if (this.phase === 'playing' || this.phase === 'serve') {
      const ballResult = this.ball.update(dt);

      // Handle ball physics results
      if (ballResult === 'floor' && this.ball.inPlay) {
        this.handleBallBounce();
      } else if (ballResult === 'out_left' || ballResult === 'out_right') {
        // Whoever last hit the ball sent it out — their opponent wins
        if (this.ball.inPlay) {
          const loser = this.ball.lastHitBy as 'p1' | 'p2' | '';
          if (loser === 'p1') this.awardPointTo('p2', 'out');
          else if (loser === 'p2') this.awardPointTo('p1', 'out');
        }
      } else if (ballResult === 'net_blocked') {
        // Net fault — award point to opposite of last hitter
        const lastHit = this.ball.lastHitBy;
        if (lastHit === 'p1') this.awardPointTo('p2', 'net');
        else if (lastHit === 'p2') this.awardPointTo('p1', 'net');
      }

      // Update phantom ball
      if (this.phantomBallActive) {
        this.updatePhantomBall(dt);
      }
    }

    // Update HUD every frame
    this.updateHUD();
  }

  private handleP1Input(dt: number): void {
    if (this.phase === 'point_pause' || this.phase === 'match_end') return;

    const keys = this.p1Keys;

    if (keys.left.isDown) {
      this.p1.moveLeft();
    } else if (keys.right.isDown) {
      this.p1.moveRight();
    } else {
      this.p1.stopHorizontal();
    }

    if ((keys.jump.isDown || keys.jump2.isDown) && this.p1.isGrounded) {
      this.p1.jump();
    }

    // Serve
    if (this.phase === 'serve' && this.servingPlayer === 'p1') {
      if (Phaser.Input.Keyboard.JustDown(keys.flat)) {
        this.launchServe('p1');
      }
    }

    // Charge tracking for L key
    if (this.p1ChargeStarted) {
      if (this.p1.updateCharge(dt)) {
        // Charge ready — visual feedback
        if (!this.p1.signatureActive) {
          this.p1.graphics.setAlpha(0.8 + Math.sin(Date.now() * 0.01) * 0.2);
        }
      }
    } else {
      this.p1.graphics.setAlpha(1);
    }
  }

  private handleP2Input(dt: number): void {
    if (this.phase === 'point_pause' || this.phase === 'match_end') return;

    const keys = this.p2Keys;

    if (keys.left.isDown) {
      this.p2.moveLeft();
    } else if (keys.right.isDown) {
      this.p2.moveRight();
    } else {
      this.p2.stopHorizontal();
    }

    if (keys.jump.isDown && this.p2.isGrounded) {
      this.p2.jump();
    }

    // Serve
    if (this.phase === 'serve' && this.servingPlayer === 'p2') {
      if (Phaser.Input.Keyboard.JustDown(keys.flat)) {
        this.launchServe('p2');
      }
    }

    // Charge tracking for numpad 3
    if (this.p2ChargeStarted) {
      this.p2.updateCharge(dt);
    }
  }

  private handleAI(dt: number): void {
    if (!this.ball.inPlay) {
      // AI serves
      if (this.phase === 'serve' && this.servingPlayer === 'p2') {
        this.aiDecisionTimer += dt;
        if (this.aiDecisionTimer > 1.0) {
          this.launchServe('p2');
          this.aiDecisionTimer = 0;
        }
      }
      return;
    }

    const reactionDelay = this.getAIReactionDelay();
    const ballMovingTowardAI = this.ball.vx > 0;

    // State machine
    switch (this.aiState) {
      case 'idle':
        if (ballMovingTowardAI) {
          this.aiState = 'chase_ball';
          this.aiReactionTimer = reactionDelay;
        } else {
          // Move toward center of AI side
          this.aiTargetX = 230;
          this.aiState = 'position';
        }
        break;

      case 'chase_ball':
        this.aiReactionTimer -= dt;
        if (this.aiReactionTimer <= 0) {
          // Calculate target position
          if (this.aiDifficulty === 'hard') {
            const landing = this.predictBallLanding();
            this.aiTargetX = landing ? Phaser.Math.Clamp(landing.x, P2_MIN_X, P2_MAX_X) : this.ball.x;
          } else {
            this.aiTargetX = Phaser.Math.Clamp(this.ball.x, P2_MIN_X, P2_MAX_X);
          }
          this.aiState = 'position';
        }
        break;

      case 'position':
        // Move toward target
        const dx = this.aiTargetX - this.p2.x;
        if (Math.abs(dx) > 3) {
          if (dx > 0) this.p2.moveRight();
          else this.p2.moveLeft();
        } else {
          this.p2.stopHorizontal();
        }

        // Jump for high balls
        if (this.ball.y < this.p2.y - 30 && this.p2.isGrounded && ballMovingTowardAI) {
          this.p2.jump();
        }

        // Check if ball is in range to swing
        if (ballMovingTowardAI) {
          const distToBall = Math.abs(this.p2.x - this.ball.x);
          const ballInZone = Math.abs(this.ball.y - this.p2.y) < 35;
          if (distToBall < 25 && ballInZone) {
            this.aiState = 'swing';
          }
        } else {
          this.aiState = 'idle';
        }
        break;

      case 'swing':
        this.aiReactionTimer -= dt;
        if (this.aiReactionTimer <= 0) {
          this.aiReactionTimer = reactionDelay * 0.5;
          this.executeAISwing();
          this.aiState = 'recover';
        }
        break;

      case 'recover':
        // Return to baseline
        this.aiTargetX = 260;
        const recDx = this.aiTargetX - this.p2.x;
        if (Math.abs(recDx) > 5) {
          if (recDx > 0) this.p2.moveRight();
          else this.p2.moveLeft();
        } else {
          this.p2.stopHorizontal();
          this.aiState = 'idle';
        }
        break;
    }

    this.p2.update(dt);
  }

  private getAIReactionDelay(): number {
    switch (this.aiDifficulty) {
      case 'easy': return AI_DELAY_EASY / 1000;
      case 'medium': return AI_DELAY_MEDIUM / 1000;
      case 'hard': return AI_DELAY_HARD / 1000;
      default: return AI_DELAY_MEDIUM / 1000;
    }
  }

  private predictBallLanding(): { x: number; y: number } | null {
    let { x, y, vx, vy } = { x: this.ball.x, y: this.ball.y, vx: this.ball.vx, vy: this.ball.vy };
    const dt = 1 / 60;
    let iter = 0;
    while (x > 0 && x < 320 && iter < 600) {
      vy += BALL_GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      iter++;
      if (y >= COURT_FLOOR) return { x, y: COURT_FLOOR };
    }
    return null;
  }

  private executeAISwing(): void {
    const movementDir = this.p2.vx > 0 ? 1 : this.p2.vx < 0 ? -1 : 0;

    let shotType: 'flat' | 'lob' | 'signature' = 'flat';

    // Decide shot type based on difficulty and stamina
    if (this.aiDifficulty === 'hard') {
      if (this.p2.stamina >= 50 && Math.random() < 0.2) {
        shotType = 'signature';
      } else if (Math.random() < 0.3) {
        shotType = 'lob';
      }
    } else if (this.aiDifficulty === 'medium') {
      if (this.p2.stamina >= AI_POWER_STAMINA_MEDIUM && Math.random() < 0.25) {
        shotType = 'flat'; // Will power-up on perfect timing
      } else if (Math.random() < 0.2) {
        shotType = 'lob';
      }
    }

    const result = this.p2.swing(shotType, this.ball.x, this.ball.y, movementDir);

    if (result.hit) {
      const color = CHARACTERS[this.p2CharId].color;
      this.ball.applyHit(result.vx, result.vy, result.shotType, 'p2', color, false);
      this.ballBounceSide = 'p2side';
      this.ballBounceCount = 0;

      if (result.shotType === 'power' || result.shotType === 'signature') {
        triggerScreenshake(this, 2, 4);
      }
      triggerHitFreeze(this, 2);
      this.updateHUD();
    }
  }

  private handleBallBounce(): void {
    if (!this.ball.inPlay) return;

    const currentSide = this.ball.x < NET_X ? 'p1side' : 'p2side';

    if (currentSide === this.ballBounceSide) {
      this.ballBounceCount++;
    } else {
      this.ballBounceCount = 1;
      this.ballBounceSide = currentSide;
    }

    // Double bounce = point to opponent
    if (this.ballBounceCount >= 2) {
      if (currentSide === 'p1side') {
        this.awardPointTo('p2', 'double_bounce');
      } else {
        this.awardPointTo('p1', 'double_bounce');
      }
    }
  }

  private awardPointTo(winner: 'p1' | 'p2', reason: string): void {
    if (this.phase === 'point_pause' || this.phase === 'match_end') return;

    this.ball.inPlay = false;
    this.lastPointWinner = winner;
    this.phase = 'point_pause';
    this.pointPauseTimer = SERVE_RESET_DELAY / 1000;

    // Update score
    awardPoint(this.score, winner);

    // Visual feedback
    const popupTexts: Record<string, string> = {
      'out': 'OUT!',
      'net': 'NET!',
      'double_bounce': 'POINT!',
    };
    const popupText = popupTexts[reason] || 'POINT!';
    const popupColor = winner === 'p1' ? '#29adff' : '#ff0000';
    createScorePopup(this, popupText, popupColor);

    // Stamp text
    if (reason === 'out') createStampText(this, 'OUT!', winner === 'p1' ? 240 : 80, 90);
    if (reason === 'net') createStampText(this, 'NET!', 160, 90);

    // Celebrate / hurt
    if (winner === 'p1') {
      this.p1.celebrate();
      this.p2.hurt();
    } else {
      this.p2.celebrate();
      this.p1.hurt();
    }

    // Set serve for next point
    this.servingPlayer = this.score.server;

    // Match over?
    if (this.score.matchOver) {
      this.phase = 'match_end';
      this.time.delayedCall(1500, () => this.showMatchEnd());
    } else if (this.score.p1Games === 0 && this.score.p2Games === 0 && !this.score.isTiebreak) {
      // Set just ended
    }

    // Update HUD
    this.updateHUD();
  }

  private updateHUD(): void {
    // Send data to HUD scene
    const hudScene = this.scene.get('HUDScene') as HUDSceneInterface | null;
    if (hudScene && hudScene.updateScore) {
      hudScene.updateScore(this.score);
    }
    if (hudScene && hudScene.updateStamina) {
      hudScene.updateStamina(this.p1.stamina, this.p2.stamina);
    }
  }

  private updatePhantomBall(dt: number): void {
    this.phantomBallVy += BALL_GRAVITY * dt;
    this.phantomBallX += this.phantomBallVx * dt;
    this.phantomBallY += this.phantomBallVy * dt;

    // Phantom ball disappears on first bounce
    if (this.phantomBallY >= COURT_FLOOR) {
      this.phantomBallActive = false;
      this.phantomBallGfx.clear();
      return;
    }

    // Draw phantom ball (purple tint)
    this.phantomBallGfx.clear();
    this.phantomBallGfx.fillStyle(0x7e2553, 0.7);
    this.phantomBallGfx.fillCircle(this.phantomBallX, this.phantomBallY, 3);
  }

  private showMatchEnd(): void {
    const winner = this.score.matchWinner;
    if (!winner) return;

    const winnerName = winner === 'p1'
      ? CHARACTERS[this.p1CharId].name
      : CHARACTERS[this.p2CharId].name;

    // Big win text
    const winText = this.add.text(160, 70, `${winnerName}\nWINS!`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    });
    winText.setOrigin(0.5, 0.5);
    winText.setDepth(60);

    // Score summary
    const summary = this.add.text(160, 110, `${this.score.p1Sets} - ${this.score.p2Sets}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffffff',
    });
    summary.setOrigin(0.5, 0.5);
    summary.setDepth(60);

    createScreenFlash(this, 0xffffff, 300);
    triggerScreenshake(this, 3, 20);

    this.time.delayedCall(3000, () => {
      this.scene.stop('HUDScene');
      this.scene.start('ResultScene', {
        winner,
        p1CharId: this.p1CharId,
        p2CharId: this.p2CharId,
        score: this.score,
        mode: this.mode,
      });
    });
  }
}

// Interface for HUD scene communication
interface HUDSceneInterface extends Phaser.Scene {
  updateScore(score: TennisScore): void;
  updateStamina(p1: number, p2: number): void;
}
