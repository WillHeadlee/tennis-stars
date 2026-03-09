import Phaser from 'phaser';
import { GameMode, CourtId } from '@shared/types';

export class MenuScene extends Phaser.Scene {
  private selectedOption: number = 0;
  private menuItems: Phaser.GameObjects.Text[] = [];
  private cursor!: Phaser.GameObjects.Graphics;
  private titleAnimTimer: number = 0;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private ballGraphics!: Phaser.GameObjects.Graphics;
  private ballX: number = 20;
  private ballY: number = 140;
  private ballVx: number = 60;
  private ballVy: number = -100;
  private scanlineGraphics!: Phaser.GameObjects.Graphics;

  private readonly options: { label: string; mode: GameMode }[] = [
    { label: 'LOCAL 2 PLAYER', mode: 'local' },
    { label: 'VS AI', mode: 'ai' },
    { label: 'ONLINE', mode: 'online' },
    { label: 'PRACTICE', mode: 'practice' },
  ];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawTitle();
    this.drawMenuItems();
    this.drawCursor();
    this.drawScanlines();
    this.setupInput();
    this.drawVersion();
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);

    // Dark gradient background (dithered)
    for (let y = 0; y < 180; y++) {
      const t = y / 180;
      // Dither between two colors
      if (y % 2 === 0) {
        this.bgGraphics.fillStyle(0x000022, 1);
      } else {
        this.bgGraphics.fillStyle(0x001133, 1);
      }
      this.bgGraphics.fillRect(0, y, 320, 1);
    }

    // Stars
    const stars = [
      [12, 8], [40, 5], [80, 12], [120, 3], [160, 9], [200, 6], [240, 14], [290, 4],
      [30, 20], [70, 25], [150, 18], [220, 22], [280, 16],
      [55, 35], [100, 40], [180, 32], [260, 38],
    ];
    this.bgGraphics.fillStyle(0xffffff, 1);
    for (const [sx, sy] of stars) {
      this.bgGraphics.fillRect(sx, sy, 1, 1);
    }

    // Court floor at bottom
    this.bgGraphics.fillStyle(0x2d6ca2, 1);
    this.bgGraphics.fillRect(0, 148, 320, 32);

    // Court lines
    this.bgGraphics.fillStyle(0xffffff, 0.6);
    this.bgGraphics.fillRect(10, 148, 300, 1);
    this.bgGraphics.fillRect(160, 148, 1, 32);

    // Net
    this.bgGraphics.fillStyle(0xffffff, 0.8);
    this.bgGraphics.fillRect(159, 126, 2, 22);

    // Animated bouncing ball
    this.ballGraphics = this.add.graphics();
    this.ballGraphics.setDepth(5);
  }

  private drawTitle(): void {
    const titleContainer = this.add.container(160, 30);

    // Title background box
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x000000, 0.7);
    titleBg.fillRect(-70, -12, 140, 30);
    titleBg.lineStyle(2, 0x29adff, 1);
    titleBg.strokeRect(-70, -12, 140, 30);

    const title = this.add.text(0, 0, 'TENNIS STARS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000066',
      strokeThickness: 2,
    });
    title.setOrigin(0.5, 0.5);
    title.setDepth(10);

    const subtitle = this.add.text(0, 18, 'ARCADE EDITION', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '5px',
      color: '#ffff00',
    });
    subtitle.setOrigin(0.5, 0.5);
    subtitle.setDepth(10);

    // Pulsing border effect
    this.tweens.add({
      targets: titleBg,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Decorative tennis balls
    const deco = this.add.graphics();
    deco.fillStyle(0xffffff, 1);
    deco.fillCircle(-80, 0, 4);
    deco.fillStyle(0x88cc00, 1);
    deco.fillCircle(-80, 0, 2);
    const deco2 = this.add.graphics();
    deco2.fillStyle(0xffffff, 1);
    deco2.fillCircle(80, 0, 4);
    deco2.fillStyle(0x88cc00, 1);
    deco2.fillCircle(80, 0, 2);

    titleContainer.add([titleBg, title, subtitle, deco, deco2]);
  }

  private drawMenuItems(): void {
    this.menuItems = [];
    const startY = 80;
    const spacing = 18;

    for (let i = 0; i < this.options.length; i++) {
      const item = this.add.text(170, startY + i * spacing, this.options[i].label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '7px',
        color: i === 0 ? '#ffffff' : '#888888',
      });
      item.setOrigin(0, 0.5);
      item.setDepth(10);
      this.menuItems.push(item);
    }

    // Controls hint
    this.add.text(160, 165, 'UP/DOWN: SELECT   SPACE/ENTER: CONFIRM', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '4px',
      color: '#555555',
    }).setOrigin(0.5, 0.5).setDepth(10);
  }

  private drawCursor(): void {
    this.cursor = this.add.graphics();
    this.cursor.setDepth(11);
    this.updateCursorPosition();

    // Blinking cursor
    this.tweens.add({
      targets: this.cursor,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Step',
      easeParams: [1],
    });
  }

  private updateCursorPosition(): void {
    this.cursor.clear();
    const y = 80 + this.selectedOption * 18;
    this.cursor.fillStyle(0x29adff, 1);
    // Arrow cursor
    this.cursor.fillTriangle(153, y - 4, 153, y + 4, 161, y);
  }

  private updateMenuColors(): void {
    for (let i = 0; i < this.menuItems.length; i++) {
      this.menuItems[i].setColor(i === this.selectedOption ? '#ffffff' : '#666666');
    }
  }

  private drawScanlines(): void {
    this.scanlineGraphics = this.add.graphics();
    this.scanlineGraphics.setDepth(100);
    this.scanlineGraphics.setAlpha(0.08);

    for (let y = 0; y < 180; y += 2) {
      this.scanlineGraphics.fillStyle(0x000000, 1);
      this.scanlineGraphics.fillRect(0, y, 320, 1);
    }
  }

  private drawVersion(): void {
    this.add.text(2, 174, 'v1.0', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '4px',
      color: '#333333',
    }).setDepth(10);
  }

  private setupInput(): void {
    const keys = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Up
    this.input.keyboard!.on('keydown-UP', () => this.moveSelection(-1));
    this.input.keyboard!.on('keydown-W', () => this.moveSelection(-1));

    // Down
    this.input.keyboard!.on('keydown-DOWN', () => this.moveSelection(1));
    this.input.keyboard!.on('keydown-S', () => this.moveSelection(1));

    // Confirm
    this.input.keyboard!.on('keydown-ENTER', () => this.selectOption());
    this.input.keyboard!.on('keydown-SPACE', () => this.selectOption());
  }

  private moveSelection(dir: number): void {
    this.selectedOption = Phaser.Math.Wrap(this.selectedOption + dir, 0, this.options.length);
    this.updateCursorPosition();
    this.updateMenuColors();

    // Flash cursor back to visible
    this.cursor.setAlpha(1);
  }

  private selectOption(): void {
    const option = this.options[this.selectedOption];

    // Flash effect
    this.cameras.main.flash(200, 255, 255, 255);

    this.time.delayedCall(200, () => {
      if (option.mode === 'local' || option.mode === 'ai') {
        this.scene.start('CharSelectScene', { mode: option.mode, courtId: 'stadium' });
      } else if (option.mode === 'online') {
        // Online not fully implemented — go to char select with online mode
        this.scene.start('CharSelectScene', { mode: 'online', courtId: 'stadium' });
      } else if (option.mode === 'practice') {
        this.scene.start('GameScene', {
          mode: 'practice',
          p1CharId: 'ace',
          p2CharId: 'rally',
          courtId: 'stadium',
          aiDifficulty: 'easy',
        });
      }
    });
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    this.titleAnimTimer += dt;

    // Animate bouncing ball in background
    this.ballVy += 1200 * dt;
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;

    if (this.ballY >= 148) {
      this.ballY = 148;
      this.ballVy = -Math.abs(this.ballVy) * 0.65;
      this.ballVx *= 0.9;
    }
    if (this.ballX < 10) { this.ballX = 10; this.ballVx = Math.abs(this.ballVx); }
    if (this.ballX > 310) { this.ballX = 310; this.ballVx = -Math.abs(this.ballVx); }

    // Net collision
    if (Math.abs(this.ballX - 160) < 3 && this.ballY > 126) {
      this.ballVx = -this.ballVx * 0.3;
    }

    this.ballGraphics.clear();
    // Trail
    this.ballGraphics.fillStyle(0xffffff, 0.3);
    this.ballGraphics.fillCircle(this.ballX - this.ballVx * dt * 3, this.ballY, 2);
    // Ball
    this.ballGraphics.fillStyle(0xffffff, 1);
    this.ballGraphics.fillCircle(this.ballX, this.ballY, 3);
    this.ballGraphics.fillStyle(0x88cc00, 1);
    this.ballGraphics.fillCircle(this.ballX, this.ballY, 2);
  }
}
