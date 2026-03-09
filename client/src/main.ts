import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { CharSelectScene } from './scenes/CharSelectScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { ResultScene } from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 320,
  height: 180,
  zoom: 4,
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  backgroundColor: '#000000',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1200 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [
    BootScene,
    MenuScene,
    CharSelectScene,
    GameScene,
    HUDScene,
    ResultScene,
  ],
};

const game = new Phaser.Game(config);

// Expose for debugging
(window as unknown as { game: Phaser.Game }).game = game;
