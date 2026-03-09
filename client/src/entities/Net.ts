import Phaser from 'phaser';
import { NET_X, NET_Y, NET_HEIGHT } from '@shared/constants';

export class Net {
  private scene: Phaser.Scene;
  public graphics: Phaser.GameObjects.Graphics;
  private rippleActive: boolean = false;
  private rippleFrame: number = 0;
  private rippleTimer: number = 0;

  public netColor: number = 0xffffff;

  constructor(scene: Phaser.Scene, netColor: number = 0xffffff) {
    this.scene = scene;
    this.netColor = netColor;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(8);
    this.draw();
  }

  triggerRipple(): void {
    this.rippleActive = true;
    this.rippleFrame = 0;
    this.rippleTimer = 0;
  }

  update(dt: number): void {
    if (this.rippleActive) {
      this.rippleTimer += dt;
      if (this.rippleTimer >= 0.05) {
        this.rippleTimer = 0;
        this.rippleFrame++;
        if (this.rippleFrame >= 4) {
          this.rippleActive = false;
          this.rippleFrame = 0;
        }
      }
    }
    this.draw();
  }

  draw(): void {
    this.graphics.clear();

    // Net post (left)
    this.graphics.fillStyle(0x888888, 1);
    this.graphics.fillRect(NET_X - 2, NET_Y, 4, NET_HEIGHT + 4);

    // Net post (right) — actually same post since single
    // Net cable at top
    this.graphics.fillStyle(this.netColor, 1);
    this.graphics.fillRect(NET_X - 2, NET_Y, 4, 1);

    // Net body
    const rippleOffset = this.rippleActive ? (this.rippleFrame % 2 === 0 ? 1 : -1) : 0;

    // Vertical lines (mesh)
    this.graphics.fillStyle(this.netColor, 0.9);
    this.graphics.fillRect(NET_X - 1 + rippleOffset, NET_Y, 2, NET_HEIGHT);

    // Horizontal mesh lines
    this.graphics.fillStyle(this.netColor, 0.5);
    for (let my = NET_Y + 4; my < NET_Y + NET_HEIGHT; my += 4) {
      this.graphics.fillRect(NET_X - 2, my + rippleOffset, 4, 1);
    }

    // Net base
    this.graphics.fillStyle(0x888888, 1);
    this.graphics.fillRect(NET_X - 3, NET_Y + NET_HEIGHT - 1, 6, 2);

    // Net top cable
    this.graphics.fillStyle(this.netColor, 1);
    this.graphics.fillRect(NET_X - 3, NET_Y, 6, 1);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
