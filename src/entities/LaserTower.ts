import 'phaser';
import { BaseEntity } from './BaseEntity';

export class LaserTower extends BaseEntity {
    private bodySprite: Phaser.GameObjects.Rectangle;
    private turretSprite: Phaser.GameObjects.Rectangle;
    private attackRange: number = 250;
    private lastFired: number = 0;
    private fireRate: number = 1500;
    private isHealingMode: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super({
            scene,
            x,
            y,
            team: 0, // Neutral/Hostile to everyone
            color: 0x95a5a6, // Grayish
            hp: 150
        });

        const size = 40;
        this.bodySprite = scene.add.rectangle(0, 0, size, size, 0x34495e);
        this.bodySprite.setStrokeStyle(2, 0xffffff);
        this.add(this.bodySprite);

        this.turretSprite = scene.add.rectangle(0, 0, 20, 20, 0xe74c3c);
        this.add(this.turretSprite);

        // Static body for building
        scene.matter.add.gameObject(this, { 
            isStatic: true, 
            shape: { type: 'rectangle', width: size, height: size } 
        });
    }

    public update(time: number, allEntities: BaseEntity[], inCloud: boolean) {
        if (this.hp <= 0) return;

        this.isHealingMode = inCloud;
        this.turretSprite.setFillStyle(this.isHealingMode ? 0x2ecc71 : 0xe74c3c);

        if (time > this.lastFired + this.fireRate) {
            this.handleCombat(time, allEntities);
        }
    }

    private handleCombat(time: number, allEntities: BaseEntity[]) {
        let closestTarget: BaseEntity | null = null;
        let minDistance = this.attackRange;

        for (const target of allEntities) {
            if (target === this || target.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestTarget = target;
            }
        }

        if (closestTarget) {
            this.fireAt(closestTarget);
            this.lastFired = time;
        }
    }

    private fireAt(target: BaseEntity) {
        const color = this.isHealingMode ? 0x2ecc71 : 0xe74c3c;
        const line = this.scene.add.line(0, 0, this.x, this.y, target.x, target.y, color);
        line.setOrigin(0, 0);
        line.setLineWidth(3);
        
        this.scene.tweens.add({
            targets: line,
            alpha: 0,
            duration: 200,
            onComplete: () => line.destroy()
        });

        if (this.isHealingMode) {
            target.heal(15);
        } else {
            target.takeDamage(15);
        }
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
        // Remove physics body immediately upon death
        const body = this.body as MatterJS.BodyType;
        if (body) {
            this.scene.matter.world.remove(body);
        }

        this.setActive(false);
        this.setVisible(false);
        
        // Matter bodies are removed when the object is destroyed
        // Explosion effects could go here, for now just destroy after a bit
        this.destroy();
    }
}
