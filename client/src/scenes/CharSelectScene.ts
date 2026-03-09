import Phaser from 'phaser';
import { CharacterId, CourtId, GameMode, AIDifficulty } from '@shared/types';
import { CHARACTERS, CHARACTER_ORDER, drawCharacterSprite } from '../data/characters';
import { COURTS, COURT_ORDER } from '../data/courts';

interface CharSelectData {
  mode: GameMode;
  courtId: CourtId;
}

export class CharSelectScene extends Phaser.Scene {
  private mode: GameMode = 'local';
  private courtId: CourtId = 'stadium';

  private p1SelectedIndex: number = 0;
  private p2SelectedIndex: number = 1;
  private courtIndex: number = 0;
  private difficultyIndex: number = 1; // 0=easy, 1=medium, 2=hard
  private p1Confirmed: boolean = false;
  private p2Confirmed: boolean = false;

  private p1CursorGfx!: Phaser.GameObjects.Graphics;
  private p2CursorGfx!: Phaser.GameObjects.Graphics;
  private charPreviewGfx: Phaser.GameObjects.Graphics[] = [];
  private animFrame: number = 0;
  private animTimer: number = 0;
  private charInfoTexts: Phaser.GameObjects.Text[] = [];

  private readonly difficulties: AIDifficulty[] = ['easy', 'medium', 'hard'];

  constructor() {
    super({ key: 'CharSelectScene' });
  }

  init(data: CharSelectData): void {
    this.mode = data.mode || 'local';
    this.courtId = data.courtId || 'stadium';
  }

  create(): void {
    this.drawBackground();
    this.drawTitle();
    this.drawCharacterSlots();
    this.drawCourtSelector();
    if (this.mode === 'ai') {
      this.drawDifficultySelector();
    }
    this.drawInstructions();
    this.setupInput();
    this.refreshUI();
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, 320, 180);

    // Pixel grid decoration
    bg.fillStyle(0x111133, 1);
    for (let x = 0; x < 320; x += 16) {
      bg.fillRect(x, 0, 1, 180);
    }
    for (let y = 0; y < 180; y += 16) {
      bg.fillRect(0, y, 320, 1);
    }
  }

  private drawTitle(): void {
    const title = this.add.text(160, 8, 'SELECT CHARACTER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    title.setOrigin(0.5, 0);
    title.setDepth(10);

    // Decorative lines
    const deco = this.add.graphics();
    deco.fillStyle(0x29adff, 1);
    deco.fillRect(10, 20, 130, 1);
    deco.fillRect(180, 20, 130, 1);
    deco.setDepth(10);
  }

  private drawCharacterSlots(): void {
    // 4 character slots across the top half
    const slotWidth = 70;
    const startX = 15;
    const y = 30;

    for (let i = 0; i < CHARACTER_ORDER.length; i++) {
      const charId = CHARACTER_ORDER[i];
      const char = CHARACTERS[charId];
      const sx = startX + i * slotWidth;

      // Slot background
      const slotBg = this.add.graphics();
      slotBg.setName(`slot_bg_${i}`);
      slotBg.fillStyle(0x111122, 1);
      slotBg.fillRect(sx, y, 60, 90);
      slotBg.lineStyle(1, 0x333355, 1);
      slotBg.strokeRect(sx, y, 60, 90);
      slotBg.setDepth(5);

      // Character preview sprite
      const preview = this.add.graphics();
      preview.setName(`char_preview_${i}`);
      preview.setDepth(6);
      this.charPreviewGfx.push(preview);
      this.redrawCharPreview(i);

      // Character name
      const nameText = this.add.text(sx + 30, y + 60, char.name, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '5px',
        color: `#${char.color.toString(16).padStart(6, '0')}`,
      });
      nameText.setOrigin(0.5, 0);
      nameText.setDepth(7);

      // Stats
      const statsText = this.add.text(sx + 2, y + 70, this.buildStatsString(charId), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '4px',
        color: '#888888',
      });
      statsText.setDepth(7);
      this.charInfoTexts.push(statsText);
    }

    // P1 cursor
    this.p1CursorGfx = this.add.graphics();
    this.p1CursorGfx.setDepth(8);

    // P2 cursor
    this.p2CursorGfx = this.add.graphics();
    this.p2CursorGfx.setDepth(8);
  }

  private buildStatsString(charId: CharacterId): string {
    const c = CHARACTERS[charId];
    const star = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
    return `SPD ${star(c.speed)}\nPWR ${star(c.power)}\nSTM ${star(c.staminaRegen)}`;
  }

  private redrawCharPreview(index: number): void {
    const charId = CHARACTER_ORDER[index];
    const slotWidth = 70;
    const startX = 15;
    const sx = startX + index * slotWidth;

    const gfx = this.charPreviewGfx[index];
    if (!gfx) return;
    gfx.clear();
    gfx.setPosition(sx + 30, 65);

    drawCharacterSprite(gfx, charId, this.animFrame, true, true);
  }

  private drawCourtSelector(): void {
    const y = 130;
    this.add.text(160, y, 'COURT:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ffff00',
    }).setOrigin(0.5, 0).setDepth(10);

    const court = COURTS[COURT_ORDER[this.courtIndex]];
    const courtNameText = this.add.text(160, y + 12, court.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#ffffff',
    });
    courtNameText.setName('court_name');
    courtNameText.setOrigin(0.5, 0);
    courtNameText.setDepth(10);

    // Arrows
    const leftArrow = this.add.text(100, y + 11, '<', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#29adff',
    }).setDepth(10);
    leftArrow.setInteractive({ useHandCursor: true });
    leftArrow.on('pointerdown', () => this.changeCourt(-1));

    const rightArrow = this.add.text(210, y + 11, '>', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#29adff',
    }).setDepth(10);
    rightArrow.setInteractive({ useHandCursor: true });
    rightArrow.on('pointerdown', () => this.changeCourt(1));
  }

  private drawDifficultySelector(): void {
    const y = 145;
    this.add.text(160, y, 'DIFFICULTY:', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ff8800',
    }).setOrigin(0.5, 0).setDepth(10);

    const diffColors: Record<string, string> = {
      easy: '#00ff00',
      medium: '#ffff00',
      hard: '#ff0000',
    };

    const diffText = this.add.text(160, y + 12, this.difficulties[this.difficultyIndex].toUpperCase(), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: diffColors[this.difficulties[this.difficultyIndex]],
    });
    diffText.setName('diff_text');
    diffText.setOrigin(0.5, 0);
    diffText.setDepth(10);
  }

  private drawInstructions(): void {
    const isLocal = this.mode === 'local';

    if (isLocal) {
      this.add.text(160, 170, 'P1: A/D+J  P2: ←/→+NUM1  ENTER: CONFIRM', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '4px',
        color: '#444466',
      }).setOrigin(0.5, 0.5).setDepth(10);
    } else {
      this.add.text(160, 170, 'A/D: SELECT   ENTER: CONFIRM   ESC: BACK', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '4px',
        color: '#444466',
      }).setOrigin(0.5, 0.5).setDepth(10);
    }
  }

  private setupInput(): void {
    // P1 controls
    this.input.keyboard!.on('keydown-A', () => {
      if (!this.p1Confirmed) {
        this.p1SelectedIndex = Phaser.Math.Wrap(this.p1SelectedIndex - 1, 0, CHARACTER_ORDER.length);
        this.refreshUI();
      }
    });
    this.input.keyboard!.on('keydown-D', () => {
      if (!this.p1Confirmed) {
        this.p1SelectedIndex = Phaser.Math.Wrap(this.p1SelectedIndex + 1, 0, CHARACTER_ORDER.length);
        this.refreshUI();
      }
    });
    this.input.keyboard!.on('keydown-J', () => {
      if (!this.p1Confirmed) {
        this.p1Confirmed = true;
        this.checkBothConfirmed();
        this.refreshUI();
      }
    });

    // P2 controls (local only)
    if (this.mode === 'local') {
      this.input.keyboard!.on('keydown-LEFT', () => {
        if (!this.p2Confirmed) {
          this.p2SelectedIndex = Phaser.Math.Wrap(this.p2SelectedIndex - 1, 0, CHARACTER_ORDER.length);
          this.refreshUI();
        }
      });
      this.input.keyboard!.on('keydown-RIGHT', () => {
        if (!this.p2Confirmed) {
          this.p2SelectedIndex = Phaser.Math.Wrap(this.p2SelectedIndex + 1, 0, CHARACTER_ORDER.length);
          this.refreshUI();
        }
      });
      this.input.keyboard!.on('keydown-NUMPAD_ONE', () => {
        if (!this.p2Confirmed) {
          this.p2Confirmed = true;
          this.checkBothConfirmed();
          this.refreshUI();
        }
      });
    } else {
      // Single player — Enter confirms P1 and auto-selects P2
      this.input.keyboard!.on('keydown-ENTER', () => {
        if (!this.p1Confirmed) {
          this.p1Confirmed = true;
          this.p2Confirmed = true;
          this.checkBothConfirmed();
          this.refreshUI();
        }
      });
    }

    // Court selection (P2 slot keys)
    this.input.keyboard!.on('keydown-Q', () => this.changeCourt(-1));
    this.input.keyboard!.on('keydown-E', () => this.changeCourt(1));

    // Difficulty (AI mode)
    if (this.mode === 'ai') {
      this.input.keyboard!.on('keydown-UP', () => {
        this.difficultyIndex = Phaser.Math.Wrap(this.difficultyIndex - 1, 0, 3);
        this.refreshUI();
      });
      this.input.keyboard!.on('keydown-DOWN', () => {
        this.difficultyIndex = Phaser.Math.Wrap(this.difficultyIndex + 1, 0, 3);
        this.refreshUI();
      });
    }

    // Back
    this.input.keyboard!.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });
  }

  private changeCourt(dir: number): void {
    // Only allow unlocked courts (for simplicity, allow all)
    this.courtIndex = Phaser.Math.Wrap(this.courtIndex + dir, 0, COURT_ORDER.length);
    this.refreshUI();
  }

  private checkBothConfirmed(): void {
    if (!this.p1Confirmed) return;
    if (this.mode === 'local' && !this.p2Confirmed) return;

    this.time.delayedCall(500, () => {
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(300, () => {
        this.startGame();
      });
    });
  }

  private startGame(): void {
    const p1CharId = CHARACTER_ORDER[this.p1SelectedIndex];
    const p2CharId = this.mode === 'local'
      ? CHARACTER_ORDER[this.p2SelectedIndex]
      : this.getAICharacter();

    this.scene.start('GameScene', {
      mode: this.mode,
      p1CharId,
      p2CharId,
      courtId: COURT_ORDER[this.courtIndex],
      aiDifficulty: this.difficulties[this.difficultyIndex],
    });
  }

  private getAICharacter(): CharacterId {
    // AI picks a different character
    const options = CHARACTER_ORDER.filter(c => c !== CHARACTER_ORDER[this.p1SelectedIndex]);
    return options[Math.floor(Math.random() * options.length)];
  }

  private refreshUI(): void {
    // Update cursors
    this.updateCursor(this.p1CursorGfx, this.p1SelectedIndex, 0x29adff, 'P1', this.p1Confirmed);
    if (this.mode === 'local') {
      this.updateCursor(this.p2CursorGfx, this.p2SelectedIndex, 0xff6347, 'P2', this.p2Confirmed);
    }

    // Update court name
    const courtNameText = this.children.getByName('court_name') as Phaser.GameObjects.Text | null;
    if (courtNameText) {
      courtNameText.setText(COURTS[COURT_ORDER[this.courtIndex]].name);
    }

    // Update difficulty
    if (this.mode === 'ai') {
      const diffText = this.children.getByName('diff_text') as Phaser.GameObjects.Text | null;
      if (diffText) {
        const diffColors: Record<string, string> = { easy: '#00ff00', medium: '#ffff00', hard: '#ff0000' };
        const diff = this.difficulties[this.difficultyIndex];
        diffText.setText(diff.toUpperCase());
        diffText.setColor(diffColors[diff]);
      }
    }
  }

  private updateCursor(
    gfx: Phaser.GameObjects.Graphics,
    index: number,
    color: number,
    label: string,
    confirmed: boolean
  ): void {
    gfx.clear();
    const slotWidth = 70;
    const startX = 15;
    const sx = startX + index * slotWidth;
    const y = 30;

    gfx.lineStyle(2, confirmed ? 0xffffff : color, 1);
    gfx.strokeRect(sx - 1, y - 1, 62, 92);

    // Label
    gfx.fillStyle(color, 1);
    gfx.fillRect(sx, y - 8, 20, 8);

    // Confirmed checkmark
    if (confirmed) {
      gfx.fillStyle(0x00ff00, 1);
      gfx.fillRect(sx + 45, y - 8, 14, 8);
    }
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.animTimer += dt;
    if (this.animTimer >= 0.12) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 8;

      // Redraw all character previews
      for (let i = 0; i < CHARACTER_ORDER.length; i++) {
        this.redrawCharPreview(i);
      }
    }
  }
}
