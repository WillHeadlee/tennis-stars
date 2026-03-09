import Phaser from 'phaser';
import { CharacterId, GameMode } from '@shared/types';
import { CHARACTERS, drawCharacterSprite } from '../data/characters';
import { TennisScore } from '../utils/scoring';
import { createScreenFlash } from '../utils/effects';

interface ResultSceneData {
  winner: 'p1' | 'p2';
  p1CharId: CharacterId;
  p2CharId: CharacterId;
  score: TennisScore;
  mode: GameMode;
  p1ELODelta?: number;
  p2ELODelta?: number;
}

export class ResultScene extends Phaser.Scene {
  private winnerData: ResultSceneData | null = null;
  private animFrame: number = 0;
  private animTimer: number = 0;
  private winnerGfx!: Phaser.GameObjects.Graphics;
  private loserGfx!: Phaser.GameObjects.Graphics;
  private bgParticleTimer: number = 0;
  private confetti: Array<{ x: number; y: number; vx: number; vy: number; color: number; size: number }> = [];

  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data: ResultSceneData): void {
    this.winnerData = data;
  }

  create(): void {
    if (!this.winnerData) return;

    const data = this.winnerData;

    this.drawBackground();
    this.drawWinnerBanner(data);
    this.drawCharacters(data);
    this.drawScoreSummary(data);
    this.drawButtons(data);
    this.spawnConfetti();
    createScreenFlash(this, 0xffffff, 500);

    // Setup input for return
    this.input.keyboard!.on('keydown-ENTER', () => this.returnToMenu());
    this.input.keyboard!.on('keydown-SPACE', () => this.returnToMenu());
    this.input.keyboard!.on('keydown-R', () => this.rematch());
  }

  private drawBackground(): void {
    const bg = this.add.graphics();

    // Dark overlay
    bg.fillStyle(0x000011, 1);
    bg.fillRect(0, 0, 320, 180);

    // Starfield
    bg.fillStyle(0xffffff, 1);
    const stars = [
      [5, 10], [20, 30], [50, 15], [90, 5], [130, 20], [170, 8],
      [210, 25], [250, 12], [280, 18], [310, 6], [40, 50], [100, 45],
      [200, 40], [300, 55],
    ];
    for (const [sx, sy] of stars) {
      bg.fillRect(sx, sy, 1, 1);
    }

    // Bottom glow
    bg.fillStyle(0x001133, 1);
    bg.fillRect(0, 140, 320, 40);

    bg.setDepth(0);
  }

  private drawWinnerBanner(data: ResultSceneData): void {
    const winnerChar = CHARACTERS[data.winner === 'p1' ? data.p1CharId : data.p2CharId];
    const winnerLabel = data.winner === 'p1' ? 'PLAYER 1' : (data.mode === 'ai' ? 'CPU' : 'PLAYER 2');

    // Banner background
    const bannerBg = this.add.graphics();
    bannerBg.fillStyle(0x000000, 0.8);
    bannerBg.fillRect(40, 8, 240, 50);
    bannerBg.lineStyle(2, winnerChar.color, 1);
    bannerBg.strokeRect(40, 8, 240, 50);
    bannerBg.setDepth(5);

    // Trophy icon (pixel art)
    const trophy = this.add.graphics();
    trophy.setDepth(6);
    trophy.fillStyle(0xffd700, 1);
    // Cup body
    trophy.fillRect(155, 12, 10, 8);
    // Cup sides
    trophy.fillRect(152, 12, 3, 6);
    trophy.fillRect(165, 12, 3, 6);
    // Base
    trophy.fillRect(154, 20, 12, 2);
    trophy.fillRect(156, 22, 8, 2);
    // Star on top
    trophy.fillStyle(0xffff00, 1);
    trophy.fillRect(158, 10, 4, 2);
    trophy.fillRect(159, 8, 2, 2);

    // "WINNER!" text
    const winnerText = this.add.text(160, 18, 'WINNER!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: `#${winnerChar.color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    });
    winnerText.setOrigin(0.5, 0);
    winnerText.setDepth(7);

    // Bounce animation
    this.tweens.add({
      targets: winnerText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Player label
    const playerLabel = this.add.text(160, 38, winnerLabel, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#ffffff',
    });
    playerLabel.setOrigin(0.5, 0);
    playerLabel.setDepth(7);

    // Character name
    const charName = this.add.text(160, 50, winnerChar.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: `#${winnerChar.color.toString(16).padStart(6, '0')}`,
    });
    charName.setOrigin(0.5, 0);
    charName.setDepth(7);
  }

  private drawCharacters(data: ResultSceneData): void {
    const isP1Winner = data.winner === 'p1';

    // Winner character (big, left)
    this.winnerGfx = this.add.graphics();
    this.winnerGfx.setDepth(10);
    this.winnerGfx.setPosition(isP1Winner ? 80 : 240, 100);

    // Loser character (small, right, head down)
    this.loserGfx = this.add.graphics();
    this.loserGfx.setDepth(10);
    this.loserGfx.setPosition(isP1Winner ? 240 : 80, 110);

    // Victory sparkles around winner
    this.createVictorySparkles(isP1Winner ? 80 : 240, 100, CHARACTERS[isP1Winner ? data.p1CharId : data.p2CharId].color);
  }

  private createVictorySparkles(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const radius = 20 + Math.random() * 10;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;

      const sparkle = this.add.graphics();
      sparkle.fillStyle(color, 1);
      sparkle.fillRect(-1, -1, 2, 2);
      sparkle.setPosition(sx, sy);
      sparkle.setDepth(11);

      this.tweens.add({
        targets: sparkle,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        x: sx + Math.cos(angle) * 15,
        y: sy + Math.sin(angle) * 15,
        duration: 1000 + Math.random() * 500,
        repeat: -1,
        ease: 'Power2',
        delay: Math.random() * 500,
      });
    }
  }

  private drawScoreSummary(data: ResultSceneData): void {
    const { score } = data;

    // Score box
    const scoreBg = this.add.graphics();
    scoreBg.fillStyle(0x000000, 0.7);
    scoreBg.fillRect(60, 130, 200, 30);
    scoreBg.lineStyle(1, 0x333355, 1);
    scoreBg.strokeRect(60, 130, 200, 30);
    scoreBg.setDepth(5);

    // Final score
    const finalScore = this.add.text(160, 133, `SETS: ${score.p1Sets} - ${score.p2Sets}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#ffffff',
    });
    finalScore.setOrigin(0.5, 0);
    finalScore.setDepth(6);

    // Total points
    const points = this.add.text(160, 148, `PTS: ${score.p1TotalPoints} - ${score.p2TotalPoints}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#888888',
    });
    points.setOrigin(0.5, 0);
    points.setDepth(6);

    // ELO delta if online
    if (data.mode === 'online' && (data.p1ELODelta !== undefined)) {
      const eloText = this.add.text(160, 158, `ELO: ${data.p1ELODelta! >= 0 ? '+' : ''}${data.p1ELODelta}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '5px',
        color: data.p1ELODelta! >= 0 ? '#00ff00' : '#ff4444',
      });
      eloText.setOrigin(0.5, 0);
      eloText.setDepth(6);
    }
  }

  private drawButtons(data: ResultSceneData): void {
    // "PLAY AGAIN" button
    const rematchBg = this.add.graphics();
    rematchBg.fillStyle(0x1a1a3a, 1);
    rematchBg.fillRect(30, 163, 120, 14);
    rematchBg.lineStyle(1, 0x29adff, 1);
    rematchBg.strokeRect(30, 163, 120, 14);
    rematchBg.setDepth(5);
    rematchBg.setInteractive(new Phaser.Geom.Rectangle(30, 163, 120, 14), Phaser.Geom.Rectangle.Contains);
    rematchBg.on('pointerdown', () => this.rematch());

    const rematchText = this.add.text(90, 170, '[R] REMATCH', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#29adff',
    });
    rematchText.setOrigin(0.5, 0.5);
    rematchText.setDepth(6);

    // "MENU" button
    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x1a1a3a, 1);
    menuBg.fillRect(170, 163, 120, 14);
    menuBg.lineStyle(1, 0xaaaaaa, 1);
    menuBg.strokeRect(170, 163, 120, 14);
    menuBg.setDepth(5);
    menuBg.setInteractive(new Phaser.Geom.Rectangle(170, 163, 120, 14), Phaser.Geom.Rectangle.Contains);
    menuBg.on('pointerdown', () => this.returnToMenu());

    const menuText = this.add.text(230, 170, '[ENTER] MENU', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#aaaaaa',
    });
    menuText.setOrigin(0.5, 0.5);
    menuText.setDepth(6);

    // Scanlines
    const scanlines = this.add.graphics();
    scanlines.setAlpha(0.05);
    scanlines.setDepth(100);
    for (let y = 0; y < 180; y += 2) {
      scanlines.fillStyle(0x000000, 1);
      scanlines.fillRect(0, y, 320, 1);
    }
  }

  private spawnConfetti(): void {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffffff];
    for (let i = 0; i < 30; i++) {
      this.confetti.push({
        x: Math.random() * 320,
        y: -10 - Math.random() * 50,
        vx: (Math.random() - 0.5) * 30,
        vy: 20 + Math.random() * 40,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1 + Math.floor(Math.random() * 2),
      });
    }
  }

  private returnToMenu(): void {
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(200, () => {
      this.scene.start('MenuScene');
    });
  }

  private rematch(): void {
    if (!this.winnerData) return;
    this.cameras.main.flash(200, 255, 255, 255);
    this.time.delayedCall(200, () => {
      this.scene.start('GameScene', {
        mode: this.winnerData!.mode,
        p1CharId: this.winnerData!.p1CharId,
        p2CharId: this.winnerData!.p2CharId,
        courtId: 'stadium',
        aiDifficulty: 'medium',
      });
    });
  }

  update(_time: number, delta: number): void {
    if (!this.winnerData) return;

    const dt = delta / 1000;

    // Animate characters
    this.animTimer += dt;
    if (this.animTimer >= 0.1) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 8;
    }

    const isP1Winner = this.winnerData.winner === 'p1';
    const winnerCharId = isP1Winner ? this.winnerData.p1CharId : this.winnerData.p2CharId;
    const loserCharId = isP1Winner ? this.winnerData.p2CharId : this.winnerData.p1CharId;

    // Draw winner (celebrate anim)
    this.winnerGfx.clear();
    // Winner jumps with fist pump — offset y with bounce
    const bounceY = Math.abs(Math.sin(this.animFrame * 0.8)) * -8;
    this.winnerGfx.setY((isP1Winner ? 80 : 240) + bounceY);
    this.winnerGfx.setPosition(isP1Winner ? 80 : 240, 100 + bounceY);
    drawCharacterSprite(this.winnerGfx, winnerCharId, this.animFrame, isP1Winner, false);

    // Draw loser (slumped)
    this.loserGfx.clear();
    this.loserGfx.setAlpha(0.6);
    drawCharacterSprite(this.loserGfx, loserCharId, 0, !isP1Winner, true);

    // Update confetti
    this.bgParticleTimer += dt;
    for (const c of this.confetti) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.y > 190) {
        c.y = -10;
        c.x = Math.random() * 320;
      }
    }
  }
}
