import 'phaser';
import { CONFIG } from '../config';

/**
 * Квантовая жила ресурсов — плавающая/телепортирующаяся по карте область.
 * Харвестеры добывают ресурсы, находясь внутри неё.
 */
export class ResourceField extends Phaser.GameObjects.Container {
    public readonly radius: number = CONFIG.resourceFields.radius;
    private coreCircle: Phaser.GameObjects.Arc;
    private glowCircle: Phaser.GameObjects.Arc;
    private ringCircle: Phaser.GameObjects.Arc;
    private worldWidth: number;
    private worldHeight: number;

    constructor(scene: Phaser.Scene, x: number, y: number, worldWidth: number, worldHeight: number) {
        super(scene, x, y);
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        // Ядро жилы (золотистое)
        this.coreCircle = scene.add.arc(0, 0, this.radius * 0.4, 0, 360, false, 0xf1c40f);
        this.add(this.coreCircle);

        // Свечение
        this.glowCircle = scene.add.arc(0, 0, this.radius, 0, 360, false, 0xf39c12, 0.25);
        this.add(this.glowCircle);

        // Внешнее кольцо (пульсирует)
        this.ringCircle = scene.add.arc(0, 0, this.radius * 0.6, 0, 360, false, 0xe67e22, 0.4);
        this.add(this.ringCircle);

        scene.add.existing(this);

        // Пульсация ядра
        scene.tweens.add({
            targets: this.ringCircle,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.6, to: 0.2 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        this.startFloating();
    }

    /**
     * Жила плавает по карте (как облако вероятности).
     */
    private startFloating() {
        const moveField = () => {
            const destX = Phaser.Math.Between(50, this.worldWidth - 50);
            const destY = Phaser.Math.Between(50, this.worldHeight - 50);
            const duration = Phaser.Math.Between(20000, 30000);

            this.scene.tweens.add({
                targets: this,
                x: destX,
                y: destY,
                duration,
                ease: 'Sine.easeInOut',
                onComplete: moveField
            });
        };

        moveField();
    }

    /**
     * Находится ли точка (x, y) в зоне добычи жилы.
     */
    public isOverlapping(x: number, y: number): boolean {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, x, y);
        return dist < this.radius;
    }
}
