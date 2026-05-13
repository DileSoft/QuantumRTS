import 'phaser';
import { BaseEntity } from './BaseEntity';
import { BaseUnit, UnitConfig } from './BaseUnit';

export class TankUnit extends BaseUnit {
    private bodySprite: Phaser.GameObjects.Rectangle;
    private attackRange: number = 200;
    private lastFired: number = 0;
    private baseFireRate: number = 1000;
    private currentFireRate: number = 1000;

    constructor(config: UnitConfig) {
        super(config);
        this.currentFireRate = this.baseFireRate + Phaser.Math.Between(-200, 200);

        const size = 30;
        this.bodySprite = this.scene.add.rectangle(0, 0, size, size, this.color);
        this.add(this.bodySprite);

        this.scene.matter.add.gameObject(this, {
            shape: { type: 'rectangle', width: size, height: size },
            frictionAir: 0.1,
            restitution: 0.5
        });
        
        const body = this.body as MatterJS.BodyType;
        this.scene.matter.body.setInertia(body, Infinity); // Real RTS units don't rotate on collision
    }

    public update(time: number, delta: number, enemies: BaseEntity[] = [], inCloud: boolean = false) {
        super.update(time, delta);
        if (this.hp <= 0) return;

        this.handleCombat(time, enemies, inCloud);
    }

    private handleCombat(time: number, enemies: BaseEntity[], inCloud: boolean) {
        if (time < this.lastFired + this.currentFireRate) return;

        let closestEnemy: BaseEntity | null = null;
        let minDistance = this.attackRange;

        for (const enemy of enemies) {
            if (enemy.team === this.team || enemy.hp <= 0) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist < minDistance) {
                minDistance = dist;
                closestEnemy = enemy;
            }
        }

        if (closestEnemy) {
            this.fireAt(closestEnemy, inCloud);
            this.lastFired = time;
            this.currentFireRate = this.baseFireRate + Phaser.Math.Between(-300, 300);
        }
    }

    private fireAt(target: BaseEntity, inCloud: boolean) {
        const misfireChance = inCloud ? 40 : 10;
        const isMisfire = Phaser.Math.Between(1, 100) <= misfireChance;
        const offsetX = Phaser.Math.Between(-10, 10);
        const offsetY = Phaser.Math.Between(-10, 10);
        const destX = target.x + offsetX;
        const destY = target.y + offsetY;
        
        if (isMisfire) {
            this.drawDashedLine(this.x, this.y, destX, destY, this.color);
            this.takeDamage(10);
        } else {
            const line = this.scene.add.line(0, 0, this.x, this.y, destX, destY, this.color);
            line.setOrigin(0, 0);
            line.setLineWidth(2);
            this.scene.tweens.add({
                targets: line,
                alpha: 0, duration: 100,
                onComplete: () => line.destroy()
            });
            target.takeDamage(10);
        }
    }

    private drawDashedLine(x1: number, y1: number, x2: number, y2: number, color: number) {
        const dashLength = 8; const gapLength = 6;
        const totalDist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
        const steps = totalDist / (dashLength + gapLength);
        const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2);
        const lines: Phaser.GameObjects.Line[] = [];
        for (let i = 0; i < steps; i++) {
            const startDist = i * (dashLength + gapLength);
            const sx = x1 + Math.cos(angle) * startDist;
            const sy = y1 + Math.sin(angle) * startDist;
            const ex = x1 + Math.cos(angle) * Math.min(startDist + dashLength, totalDist);
            const ey = y1 + Math.sin(angle) * Math.min(startDist + dashLength, totalDist);
            const dash = this.scene.add.line(0, 0, sx, sy, ex, ey, color);
            dash.setOrigin(0, 0); dash.setLineWidth(2);
            lines.push(dash);
        }
        this.scene.tweens.add({
            targets: lines,
            alpha: 0, duration: 150,
            onComplete: () => lines.forEach(l => l.destroy())
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
}
