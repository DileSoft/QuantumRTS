import 'phaser';
import { BaseEntity, EntityConfig } from './BaseEntity';

export interface UnitConfig extends Omit<EntityConfig, 'hp'> {
    hp?: number;
}

export abstract class BaseUnit extends BaseEntity {
    protected targetX: number | null = null;
    protected targetY: number | null = null;
    protected speed: number = 150;

    constructor(config: UnitConfig) {
        super({ ...config, hp: config.hp ?? 100 });

        this.scene.physics.add.existing(this);
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        
        // Default unit UI adjustments
        this.healthBarBg.setY(-25);
        this.healthBarFill.setY(-25);
        this.selectionCircle.setRadius(25);
    }

    public setTargetPosition(x: number, y: number) {
        this.targetX = x;
        this.targetY = y;
    }

    public update(_time: number, _delta: number) {
        if (this.hp <= 0) return;

        const body = this.body as Phaser.Physics.Arcade.Body;

        if (this.targetX !== null && this.targetY !== null) {
            const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
            if (distance < 5) {
                body.setVelocity(0, 0);
                this.targetX = null;
                this.targetY = null;
            } else {
                this.scene.physics.moveTo(this, this.targetX, this.targetY, this.speed);
            }
        }
    }

    protected die() {
        this.targetX = null;
        this.targetY = null;
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setEnable(false);
        this.setAlpha(0.3);
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
        this.selectionCircle.setVisible(false);
        this.scene.time.delayedCall(5000, () => this.destroy());
    }
}
