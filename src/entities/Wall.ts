import 'phaser';

import { BaseBuilding } from './BaseBuilding';

export class Wall extends BaseBuilding {
    public isFaded: boolean = false;
    private lastVanishCheck: number = 0;
    private vanishEndTime: number = 0;
    private bodySprite: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, rotation: number) {
        super({ scene, x, y, team: 0, color: 0x7f8c8d });
        
        this.bodySprite = scene.add.rectangle(0, 0, width, height, 0x7f8c8d);
        this.bodySprite.setStrokeStyle(2, 0x95a5a6);
        this.add(this.bodySprite);

        this.setRotation(rotation);
        
        // Setup Matter body with correct rotation and size
        this.scene.matter.add.gameObject(this, {
            isStatic: true,
            angle: rotation,
            shape: {
                type: 'rectangle',
                width: width,
                height: height
            }
        });

        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
        this.selectionCircle.setVisible(false);
    }

    public update(time: number, inCloud: boolean) {
        if (this.isFaded) {
            if (time > this.vanishEndTime) {
                this.restore();
            }
            return;
        }

        // Check for vanishing every second
        if (time > this.lastVanishCheck + 1000) {
            this.lastVanishCheck = time;
            
            // 2% chance to vanish naturally
            if (Phaser.Math.Between(1, 100) <= 2) {
                const duration = inCloud ? 8000 : 4000;
                this.vanish(time, duration);
            }
        }
    }

    private vanish(time: number, duration: number) {
        this.isFaded = true;
        this.vanishEndTime = time + duration;
        this.setAlpha(0.1);
        const body = this.body as MatterJS.BodyType;
        if (body) {
            body.collisionFilter.mask = 0; // Collide with nothing
        }
    }

    private restore() {
        this.isFaded = false;
        this.setAlpha(1);
        const body = this.body as MatterJS.BodyType;
        if (body) {
            body.collisionFilter.mask = 0xFFFFFFFF; // Collide with everything
        }
    }

    protected onDamage() {}
    protected die() { super.die(); }
}
