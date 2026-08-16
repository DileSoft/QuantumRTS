import 'phaser';

/**
 * Главное меню: старт игры и правила.
 */
export class MenuScene extends Phaser.Scene {
    constructor() {
        super('MenuScene');
    }

    create() {
        // Фон
        this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth,
            window.innerHeight,
            0x1a1a2e
        );

        // Заголовок
        this.add.text(window.innerWidth / 2, 150, 'QUANTUM RTS', {
            fontSize: '64px',
            fontStyle: 'bold',
            color: '#f1c40f',
            fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        this.add.text(window.innerWidth / 2, 220, 'Квантовая битва за ресурсы', {
            fontSize: '22px',
            color: '#ffffff',
            fontFamily: 'sans-serif'
        }).setOrigin(0.5);

        // Кнопка «Начать игру»
        const startBtn = this.add.rectangle(window.innerWidth / 2, 350, 300, 60, 0x2ecc71)
            .setInteractive({ useHandCursor: true });
        this.add.text(window.innerWidth / 2, 350, 'Начать игру', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // Кнопка «Как играть»
        const rulesBtn = this.add.rectangle(window.innerWidth / 2, 450, 300, 60, 0x3498db)
            .setInteractive({ useHandCursor: true });
        this.add.text(window.innerWidth / 2, 450, 'Как играть', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        rulesBtn.on('pointerdown', () => {
            this.showRules();
        });

        // Версия
        this.add.text(window.innerWidth / 2, window.innerHeight - 40, 'Демо-версия 0.1.0', {
            fontSize: '14px',
            color: '#888888'
        }).setOrigin(0.5);
    }

    private showRules() {
        // Полупрозрачный оверлей с правилами
        const overlay = this.add.rectangle(
            window.innerWidth / 2,
            window.innerHeight / 2,
            window.innerWidth,
            window.innerHeight,
            0x000000,
            0.85
        );

        const rules = [
            'УПРАВЛЕНИЕ',
            'ЛКМ — выбрать юнита (рамка — группу)',
            'ПКМ — отдать приказ двигаться',
            'WASD / стрелки / края экрана — прокрутка карты',
            '',
            'ЦЕЛЬ ИГРЫ',
            'Уничтожьте командный центр (HQ) красной команды.',
            '',
            'РЕСУРСЫ',
            'Кредиты добывают харвестеры у квантовых жил.',
            'Жилы плавают по карте — следите за ними!',
            '',
            'КВАНТОВЫЕ ЭФФЕКТЫ',
            'Облака вероятности: добыча ×2, но есть риск сбоя.',
            'Юниты могут спонтанно перейти к врагу (конверсия).',
            'Стены могут исчезать и появляться.',
            '',
            'Кнопки: Esc — пауза'
        ];

        const rulesText = this.add.text(window.innerWidth / 2, 120, rules.join('\n'), {
            fontSize: '20px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8,
            fontFamily: 'sans-serif'
        }).setOrigin(0.5, 0);

        // Кнопка «Назад»
        const backBtn = this.add.rectangle(window.innerWidth / 2, window.innerHeight - 80, 200, 50, 0xe74c3c)
            .setInteractive({ useHandCursor: true });
        this.add.text(window.innerWidth / 2, window.innerHeight - 80, 'Назад', {
            fontSize: '22px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        backBtn.on('pointerdown', () => {
            overlay.destroy();
            rulesText.destroy();
            backBtn.destroy();
        });
    }
}
