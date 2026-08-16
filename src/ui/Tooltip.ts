import 'phaser';

/**
 * Всплывающая подсказка при наведении на объекты.
 * Показывает тип объекта и его параметры.
 */
export class Tooltip {
    private bg: Phaser.GameObjects.Rectangle;
    private text: Phaser.GameObjects.Text;
    private visible: boolean = false;
    private padding: number = 8;

    constructor(scene: Phaser.Scene) {
        this.text = scene.add.text(0, 0, '', {
            fontSize: '13px',
            color: '#ffffff',
            backgroundColor: 'transparent',
            wordWrap: { width: 220 },
            fontStyle: 'normal'
        }).setOrigin(0, 0).setDepth(3000).setScrollFactor(0);

        // Фон под текстом
        this.bg = scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.85)
            .setOrigin(0, 0)
            .setDepth(2999)
            .setScrollFactor(0);

        this.hide();
    }

    /**
     * Показать подсказку рядом с мышью.
     */
    public show(x: number, y: number, lines: string[]) {
        this.text.setText(lines.join('\n'));
        this.visible = true;
        this.text.setVisible(true);
        this.bg.setVisible(true);

        // Позиция: у курсора, сдвиг чтобы не перекрывать его
        const offsetX = 16;
        const offsetY = 16;
        const tx = x + offsetX;
        const ty = y + offsetY;

        this.text.setPosition(tx, ty);

        // Подгоняем фон под размер текста
        const bounds = this.text.getBounds();
        this.bg.setPosition(tx - this.padding, ty - this.padding);
        this.bg.setSize(bounds.width + this.padding * 2, bounds.height + this.padding * 2);
    }

    public hide() {
        this.visible = false;
        this.text.setVisible(false);
        this.bg.setVisible(false);
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public destroy() {
        this.text.destroy();
        this.bg.destroy();
    }
}
