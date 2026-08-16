import 'phaser';
import { BaseBuilding, BuildingConfig } from './BaseBuilding';

/**
 * Главная база (HQ) команды. Уничтожение HQ означает конец игры.
 */
export class HQ extends BaseBuilding {
    private bodySprite: Phaser.GameObjects.Rectangle;
    private flagSprite: Phaser.GameObjects.Rectangle;
    private onDestroyed: (team: number) => void;

    constructor(config: BuildingConfig & { onDestroyed: (team: number) => void }) {
        // По умолчанию у HQ 1000 HP
        const hp = 1000;
        const cfg = { ...config, hp };
        super(cfg);

        this.onDestroyed = config.onDestroyed;

        // Визуал: большой квадрат с крестом/флагом
        this.bodySprite = this.scene.add.rectangle(0, 0, 80, 80, this.color);
        this.bodySprite.setStrokeStyle(4, 0xffffff);
        this.add(this.bodySprite);

        // Флаг/символ сверху
        this.flagSprite = this.scene.add.rectangle(0, -30, 20, 20, 0xffffff);
        this.add(this.flagSprite);

        // Статичное тело Matter
        this.scene.matter.add.gameObject(this, {
            isStatic: true,
            shape: { type: 'rectangle', width: 80, height: 80 }
        });
    }

    protected onDamage() {
        this.scene.tweens.add({
            targets: this.bodySprite,
            fillAlpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }

    protected die() {
        // Уведомляем сцену о разрушении HQ
        this.onDestroyed(this.team);

        // Убираем физику и визуал
        const body = this.body as MatterJS.BodyType;
        if (body) {
            this.scene.matter.world.remove(body);
        }

        this.setAlpha(0.3);
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
        this.selectionCircle.setVisible(false);

        // Не удаляем полностью — оставляем как «руины»
        this.scene.time.delayedCall(10000, () => this.destroy());
    }
}