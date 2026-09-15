import 'phaser';
import { BaseUnit, UnitConfig } from './BaseUnit';
import { addTintedSprite } from '../ui/tintedSprite';

export class BuilderUnit extends BaseUnit {
    private bodySprite: Phaser.GameObjects.Image;
    private onBuild: (x: number, y: number, team: number, color: number) => void;

    constructor(config: UnitConfig & { onBuild: (x: number, y: number, team: number, color: number) => void }) {
        super(config);
        this.speed = 100;
        this.onBuild = config.onBuild;

        const size = 40;
        this.bodySprite = addTintedSprite(this.scene, this, 'builder', this.color, size, size);

        this.scene.matter.add.gameObject(this, {
            shape: { type: 'rectangle', width: size, height: size },
            frictionAir: 0.1,
            restitution: 0.5
        });
        
        const body = this.body as MatterJS.BodyType;
        this.scene.matter.body.setInertia(body, Infinity);
    }

    public build() {
        if (this.hp > 0) {
            this.onBuild(this.x, this.y, this.team, this.color);
            (this.scene as any).removeEntity(this, true);
            this.destroy();
        }
    }

    protected onDamage() {
        this.scene.tweens.add({
            targets: this.bodySprite,
            alpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }
}
