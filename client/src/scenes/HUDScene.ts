import Phaser from 'phaser';
import { CharacterId } from '@shared/types';
import { STAMINA_MAX } from '@shared/constants';
import { CHARACTERS } from '../data/characters';
import { TennisScore, pointsToDisplay } from '../utils/scoring';

interface HUDSceneData {
  score: TennisScore;
  p1CharId: CharacterId;
  p2CharId: CharacterId;
}

export class HUDScene extends Phaser.Scene {
  private p1CharId: CharacterId = 'ace';
  private p2CharId: CharacterId = 'crusher';

  private score!: TennisScore;
  private p1Stamina: number = 100;
  private p2Stamina: number = 100;

  // UI elements
  private scoreText!: Phaser.GameObjects.Text;
  private setsText!: Phaser.GameObjects.Text;
  private gamesText!: Phaser.GameObjects.Text;
  private tiebreakText!: Phaser.GameObjects.Text;
  private p1StaminaBar!: Phaser.GameObjects.Graphics;
  private p2StaminaBar!: Phaser.GameObjects.Graphics;
  private p1PortraitImg!: Phaser.GameObjects.Image;
  private p2PortraitImg!: Phaser.GameObjects.Image;
  private staminaPulseTimer: number = 0;
  private p1PortraitFlashTimer: number = 0;
  private p2PortraitFlashTimer: number = 0;

  // Stamina flash (red when not enough)
  private p1StaminaFlash: boolean = false;
  private p2StaminaFlash: boolean = false;
  private staminaFlashTimer: number = 0;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: HUDSceneData): void {
    this.p1CharId = data.p1CharId || 'ace';
    this.p2CharId = data.p2CharId || 'crusher';
    this.score = data.score || {
      p1Points: 0, p2Points: 0,
      p1Games: 0, p2Games: 0,
      p1Sets: 0, p2Sets: 0,
      isDeuce: false, advantage: 0,
      isTiebreak: false, tiebreakP1: 0, tiebreakP2: 0,
      server: 'p1',
      matchOver: false, matchWinner: null,
      p1TotalPoints: 0, p2TotalPoints: 0,
    };
  }

  create(): void {
    // HUD is a parallel scene — it draws over GameScene
    this.cameras.main.setAlpha(1);

    this.drawHUDFrame();
    this.drawPortraits();
    this.createScoreDisplay();
    this.createStaminaBars();
    this.createServerIndicator();
  }

  private drawHUDFrame(): void {
    // Top HUD bar background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(0, 0, 320, 22);

    // Bottom border
    bg.lineStyle(1, 0x29adff, 0.5);
    bg.lineBetween(0, 22, 320, 22);

    // Stamina bar labels
    const p1Label = this.add.text(4, 13, 'STM', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: `#${CHARACTERS[this.p1CharId].color.toString(16).padStart(6, '0')}`,
    }).setResolution(4);
    p1Label.setDepth(10);

    const p2Label = this.add.text(316, 13, 'STM', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: `#${CHARACTERS[this.p2CharId].color.toString(16).padStart(6, '0')}`,
    }).setResolution(4);
    p2Label.setOrigin(1, 0);
    p2Label.setDepth(10);
  }

  private drawPortraits(): void {
    // P1 portrait (left) — 18px square fits within 22px HUD bar
    this.p1PortraitImg = this.add.image(2, 2, `${this.p1CharId}-nobg`);
    this.p1PortraitImg.setOrigin(0, 0);
    this.p1PortraitImg.setDisplaySize(18, 18);
    this.p1PortraitImg.setDepth(5);

    // P2 portrait (right) — right-aligned at x=318
    this.p2PortraitImg = this.add.image(318, 2, `${this.p2CharId}-nobg`);
    this.p2PortraitImg.setOrigin(1, 0);
    this.p2PortraitImg.setDisplaySize(18, 18);
    this.p2PortraitImg.setDepth(5);
  }

  private createScoreDisplay(): void {
    // Score in the center
    this.scoreText = this.add.text(160, 3, '0 - 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setResolution(4);
    this.scoreText.setOrigin(0.5, 0);
    this.scoreText.setDepth(10);

    // Games (smaller, below score)
    this.gamesText = this.add.text(160, 13, '0 - 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#aaaaff',
    }).setResolution(4);
    this.gamesText.setOrigin(0.5, 0);
    this.gamesText.setDepth(10);

    // Sets (even smaller)
    this.setsText = this.add.text(160, 1, '0 | 0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#999999',
    }).setResolution(4);
    this.setsText.setOrigin(0.5, 0);
    this.setsText.setVisible(false);
    this.setsText.setDepth(10);

    // Tiebreak text
    this.tiebreakText = this.add.text(160, 22, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#ff8800',
    }).setResolution(4);
    this.tiebreakText.setOrigin(0.5, 0);
    this.tiebreakText.setDepth(10);

    this.refreshScoreDisplay();
  }

  private createStaminaBars(): void {
    this.p1StaminaBar = this.add.graphics();
    this.p1StaminaBar.setDepth(5);

    this.p2StaminaBar = this.add.graphics();
    this.p2StaminaBar.setDepth(5);

    this.drawStaminaBar(this.p1StaminaBar, 22, this.p1Stamina, this.p1CharId, false);
    this.drawStaminaBar(this.p2StaminaBar, 320 - 22 - 100, this.p2Stamina, this.p2CharId, true);
  }

  private createServerIndicator(): void {
    // Small ball indicator showing who serves
    // Updated in refreshScoreDisplay
  }

  private drawStaminaBar(
    gfx: Phaser.GameObjects.Graphics,
    startX: number,
    stamina: number,
    charId: CharacterId,
    reversed: boolean,
    flashRed: boolean = false,
    pulse: boolean = false
  ): void {
    gfx.clear();

    const blocks = 10;
    const blockWidth = 8;
    const blockHeight = 6;
    const gap = 1;
    const y = 14;

    const filledBlocks = Math.floor((stamina / STAMINA_MAX) * blocks);
    const charColor = CHARACTERS[charId].color;

    for (let i = 0; i < blocks; i++) {
      const blockIndex = reversed ? (blocks - 1 - i) : i;
      const bx = startX + blockIndex * (blockWidth + gap);
      const by = y;
      const filled = i < filledBlocks;

      if (filled) {
        let blockColor = charColor;
        if (flashRed) blockColor = 0xff0000;
        else if (pulse && stamina >= STAMINA_MAX) blockColor = 0xffffff;

        gfx.fillStyle(blockColor, 1);
        gfx.fillRect(bx, by, blockWidth, blockHeight);

        // Highlight
        gfx.fillStyle(0xffffff, 0.35);
        gfx.fillRect(bx, by, blockWidth, 2);
      } else {
        gfx.fillStyle(0x222222, 1);
        gfx.fillRect(bx, by, blockWidth, blockHeight);
      }

      // Block outline
      gfx.lineStyle(0.5, 0x444444, 1);
      gfx.strokeRect(bx, by, blockWidth, blockHeight);
    }
  }

  private refreshScoreDisplay(): void {
    if (!this.score) return;

    // Points display
    const p1pts = pointsToDisplay(this.score.p1Points, this.score.isDeuce, this.score.advantage, 'p1');
    const p2pts = pointsToDisplay(this.score.p2Points, this.score.isDeuce, this.score.advantage, 'p2');

    if (this.score.isTiebreak) {
      this.scoreText.setText(`${this.score.tiebreakP1} - ${this.score.tiebreakP2}`);
      this.tiebreakText.setText('TIEBREAK');
    } else {
      this.scoreText.setText(`${p1pts} - ${p2pts}`);
      this.tiebreakText.setText('');
    }

    // Games
    this.gamesText.setText(`${this.score.p1Games} - ${this.score.p2Games}`);

    // Sets
    const setsStr = `P1 ${this.score.p1Sets} | ${this.score.p2Sets} P2`;
    if (this.score.p1Sets > 0 || this.score.p2Sets > 0) {
      this.setsText.setText(setsStr);
      this.setsText.setVisible(true);
    }

    // Deuce color
    if (this.score.isDeuce) {
      this.scoreText.setColor('#ff8800');
    } else if (this.score.advantage !== 0) {
      this.scoreText.setColor(this.score.advantage === 1 ? '#29adff' : '#ff4444');
    } else {
      this.scoreText.setColor('#ffffff');
    }
  }

  // Called by GameScene to update score
  updateScore(score: TennisScore): void {
    this.score = score;
    this.refreshScoreDisplay();

    // Flash the winning player's portrait
    if (score.matchWinner) {
      if (score.matchWinner === 'p1') this.p1PortraitFlashTimer = 2.0;
      else this.p2PortraitFlashTimer = 2.0;
    }
  }

  // Called by GameScene to update stamina
  updateStamina(p1: number, p2: number): void {
    this.p1Stamina = p1;
    this.p2Stamina = p2;
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Stamina pulse (when full)
    this.staminaPulseTimer += dt;
    const pulseOn = Math.sin(this.staminaPulseTimer * Math.PI / 0.8) > 0;

    // Flash timers
    if (this.staminaFlashTimer > 0) this.staminaFlashTimer -= dt;
    if (this.p1PortraitFlashTimer > 0) this.p1PortraitFlashTimer -= dt;
    if (this.p2PortraitFlashTimer > 0) this.p2PortraitFlashTimer -= dt;

    // Redraw stamina bars
    const p1Pulse = this.p1Stamina >= 98 && pulseOn;
    const p2Pulse = this.p2Stamina >= 98 && pulseOn;

    this.drawStaminaBar(
      this.p1StaminaBar, 22, this.p1Stamina, this.p1CharId, false,
      this.p1StaminaFlash && this.staminaFlashTimer > 0, p1Pulse
    );
    this.drawStaminaBar(
      this.p2StaminaBar, 320 - 22 - (8 + 1) * 10, this.p2Stamina, this.p2CharId, true,
      this.p2StaminaFlash && this.staminaFlashTimer > 0, p2Pulse
    );

    // Portrait flash effect
    if (this.p1PortraitFlashTimer > 0) {
      const flashAlpha = Math.sin(this.p1PortraitFlashTimer * 15) > 0 ? 1 : 0.3;
      this.p1PortraitImg.setAlpha(flashAlpha);
    } else {
      this.p1PortraitImg.setAlpha(1);
    }

    if (this.p2PortraitFlashTimer > 0) {
      const flashAlpha = Math.sin(this.p2PortraitFlashTimer * 15) > 0 ? 1 : 0.3;
      this.p2PortraitImg.setAlpha(flashAlpha);
    } else {
      this.p2PortraitImg.setAlpha(1);
    }
  }

  // Trigger stamina flash (called when player tries to use move without enough stamina)
  flashStaminaRed(player: 'p1' | 'p2'): void {
    if (player === 'p1') this.p1StaminaFlash = true;
    else this.p2StaminaFlash = true;
    this.staminaFlashTimer = 0.5;
  }
}
