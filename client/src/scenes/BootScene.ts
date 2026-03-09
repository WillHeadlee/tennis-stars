import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingBg!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.drawLoadingScreen();

    // Since we use procedural graphics, there are no external assets to load.
    // Simulate a brief loading period for the font to arrive via Google Fonts.
    // We create a fake progress to show the bar.
    this.load.on('progress', (value: number) => {
      this.updateLoadingBar(value);
    });

    // Load the Google Font by adding a CSS link (already in HTML, but ensure it)
    // We'll use a canvas font test to confirm it's ready.
  }

  create(): void {
    // Animate loading bar to full, then transition
    this.tweens.add({
      targets: { value: 0 },
      value: 1,
      duration: 800,
      ease: 'Linear',
      onUpdate: (tween) => {
        this.updateLoadingBar(tween.progress);
      },
      onComplete: () => {
        // Flash screen
        this.cameras.main.flash(300, 255, 255, 255);
        this.time.delayedCall(600, () => {
          this.scene.start('MenuScene');
        });
      },
    });
  }

  private drawLoadingScreen(): void {
    const w = 320;
    const h = 180;

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, w, h);

    // Title
    const titleGfx = this.add.graphics();
    // Draw stylized "TS" logo
    titleGfx.fillStyle(0x29adff, 1);
    titleGfx.fillRect(120, 30, 30, 6); // T top
    titleGfx.fillRect(133, 36, 6, 20); // T stem
    titleGfx.fillStyle(0xff0000, 1);
    titleGfx.fillRect(160, 30, 6, 26); // S left top
    titleGfx.fillRect(160, 30, 20, 6); // S top
    titleGfx.fillRect(160, 40, 20, 6); // S middle
    titleGfx.fillRect(174, 40, 6, 16); // S right bottom
    titleGfx.fillRect(160, 50, 20, 6); // S bottom

    // "TENNIS STARS" text
    const titleText = this.add.text(w / 2, 75, 'TENNIS STARS', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    titleText.setOrigin(0.5, 0.5);

    const subText = this.add.text(w / 2, 92, 'ARCADE EDITION', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#ffff00',
    });
    subText.setOrigin(0.5, 0.5);

    // Loading bar background
    this.loadingBg = this.add.graphics();
    this.loadingBg.fillStyle(0x333333, 1);
    this.loadingBg.fillRect(60, 130, 200, 10);
    this.loadingBg.fillStyle(0x555555, 1);
    this.loadingBg.strokeRect(60, 130, 200, 10);

    // Loading bar fill
    this.loadingBar = this.add.graphics();
    this.loadingBar.setDepth(1);

    // Loading text
    this.loadingText = this.add.text(w / 2, 150, 'LOADING...', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '6px',
      color: '#aaaaaa',
    });
    this.loadingText.setOrigin(0.5, 0.5);

    // Pixel decoration — tennis ball
    const ball = this.add.graphics();
    ball.fillStyle(0xffffff, 1);
    ball.fillCircle(30, 30, 5);
    ball.fillStyle(0x88cc00, 1);
    ball.fillCircle(30, 30, 3);

    const ball2 = this.add.graphics();
    ball2.fillStyle(0xffffff, 1);
    ball2.fillCircle(290, 150, 5);
    ball2.fillStyle(0x88cc00, 1);
    ball2.fillCircle(290, 150, 3);

    // Blinking cursor
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (this.loadingText) {
          this.loadingText.setVisible(!this.loadingText.visible);
        }
      },
    });
  }

  private updateLoadingBar(value: number): void {
    if (!this.loadingBar) return;
    this.loadingBar.clear();

    // Pixel-block style bar (10 segments)
    const totalBlocks = 10;
    const filledBlocks = Math.floor(value * totalBlocks);

    for (let i = 0; i < totalBlocks; i++) {
      const bx = 62 + i * 20;
      const by = 132;
      const bw = 18;
      const bh = 6;

      if (i < filledBlocks) {
        // Filled block — gradient from blue to white
        const t = i / (totalBlocks - 1);
        const r = Math.floor(41 + t * 214);
        const g = Math.floor(173 + t * 82);
        const b = Math.floor(255 - t * 55);
        const color = (r << 16) | (g << 8) | b;
        this.loadingBar.fillStyle(color, 1);
        this.loadingBar.fillRect(bx, by, bw, bh);

        // Highlight
        this.loadingBar.fillStyle(0xffffff, 0.4);
        this.loadingBar.fillRect(bx, by, bw, 2);
      } else {
        // Empty block
        this.loadingBar.fillStyle(0x222222, 1);
        this.loadingBar.fillRect(bx, by, bw, bh);
      }
    }
  }
}
