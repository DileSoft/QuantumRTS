import 'phaser';
import { BaseEntity, EntityConfig } from './BaseEntity';

export interface BuildingConfig extends Omit<EntityConfig, 'hp'> {
    hp?: number;
}

export abstract class BaseBuilding extends BaseEntity {
    constructor(config: BuildingConfig) {
        super({ ...config, hp: config.hp ?? 500 });

        this.scene.physics.add.existing(this);
        (this.body as Phaser.Physics.Arcade.Body).setImmovable(true);
        
        // Default building UI adjustments
        this.healthBarBg.setY(-45);
        this.healthBarFill.setY(-45);
        this.selectionCircle.setRadius(50);
    }

    protected die() {
        this.setAlpha(0.3);
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
        this.selectionCircle.setVisible(false);
        this.scene.time.delayedCall(10000, () => this.destroy());
    }
}
