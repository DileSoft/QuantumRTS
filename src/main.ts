import 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseScene } from './scenes/PauseScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    scene: [MenuScene, GameScene, PauseScene]
};

new Phaser.Game(config);
