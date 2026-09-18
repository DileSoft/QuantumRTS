import 'phaser';
import { gameBridge } from '../ui/react/gameBridge';

/**
 * Экран паузы. Вызывается по Esc из GameScene.
 */
export class PauseScene extends Phaser.Scene {
    constructor() {
        super('PauseScene');
    }

    create() {
        // Затемнение
        this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth,
            window.innerHeight,
            0x000000,
            0.6
        );

        // Заголовок
        this.add.text(window.innerWidth / 2, 200, 'ПАУЗА', {
            fontSize: '56px',
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        // Кнопка «Продолжить»
        this.makeMenuButton('Продолжить', 320, 0x2ecc71, () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });

        // Кнопка «Справочник»
        this.makeMenuButton('Справочник', 420, 0x8e44ad, () => {
            gameBridge.setGuideVisible(true);
        });

        // Кнопка «В меню»
        this.makeMenuButton('В главное меню', 520, 0x3498db, () => {
            this.scene.stop(); // остановить PauseScene
            this.scene.stop('GameScene'); // остановить игру
            this.scene.start('MenuScene');
        });

        // Кнопка «Заново»
        this.makeMenuButton('Начать заново', 620, 0xe67e22, () => {
            this.scene.stop(); // остановить PauseScene
            this.scene.stop('GameScene'); // остановить текущую игру
            this.scene.start('GameScene'); // и стартовать новую
        });

        // Подсказка
        this.add.text(window.innerWidth / 2, window.innerHeight - 60, 'Esc — продолжить', {
            fontSize: '16px',
            color: '#aaaaaa',
            fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        // Esc — продолжить
        this.input.keyboard?.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    private makeMenuButton(label: string, y: number, color: number, onClick: () => void) {
        const btn = this.add.rectangle(window.innerWidth / 2, y, 300, 55, color)
            .setInteractive({ useHandCursor: true });
        this.add.text(window.innerWidth / 2, y, label, {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        btn.on('pointerdown', onClick);
    }
}
