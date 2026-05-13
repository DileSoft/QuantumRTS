import 'phaser';

export interface UnitConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    team: number;
    color: number;
}

export class Unit extends Phaser.GameObjects.Container {
    public team: number;
    public color: number;
    public hp: number = 100;
    public maxHp: number = 100;
    private selectionCircle: Phaser.GameObjects.Arc;
    private bodySprite: Phaser.GameObjects.Rectangle;
    private healthBarBg: Phaser.GameObjects.Rectangle;
    private healthBarFill: Phaser.GameObjects.Rectangle;
    private targetX: number | null = null;
    private targetY: number | null = null;
    private speed: number = 150;
    private attackRange: number = 200;
    private lastFired: number = 0;
    private baseFireRate: number = 1000; // ms
    private currentFireRate: number = 1000;

    constructor(config: UnitConfig) {
        super(config.scene, config.x, config.y);
        this.team = config.team;
        this.color = config.color;
        this.currentFireRate = this.baseFireRate + Phaser.Math.Between(-200, 200);

        // Selection circle (initially invisible)
        this.selectionCircle = config.scene.add.arc(0, 0, 25, 0, 360, false, 0xffffff, 0.3);
        this.selectionCircle.setVisible(false);
        this.add(this.selectionCircle);

        // Unit body
        this.bodySprite = config.scene.add.rectangle(0, 0, 30, 30, config.color);
        this.add(this.bodySprite);

        // Health Bar Background
        this.healthBarBg = config.scene.add.rectangle(0, -25, 30, 4, 0x000000);
        this.add(this.healthBarBg);

        // Health Bar Fill
        this.healthBarFill = config.scene.add.rectangle(-15, -25, 30, 4, 0x00ff00);
        this.healthBarFill.setOrigin(0, 0.5);
        this.add(this.healthBarFill);

        // Add to scene
        config.scene.add.existing(this);
        config.scene.physics.add.existing(this);

        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setCollideWorldBounds(true);
        body.setCircle(15);
    }

    public setSelected(selected: boolean) {
        this.selectionCircle.setVisible(selected);
    }

    public setTargetPosition(x: number, y: number) {
        this.targetX = x;
        this.targetY = y;
    }

    public update(time: number, _delta: number, enemies: Unit[]) {
        if (this.hp <= 0) return; // Dead units don't move or shoot

        const body = this.body as Phaser.Physics.Arcade.Body;

        // Movement Logic
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

        // Combat Logic
        this.handleCombat(time, enemies);
    }

    private handleCombat(time: number, enemies: Unit[]) {
        if (time < this.lastFired + this.currentFireRate) return;

        let closestEnemy: Unit | null = null;
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
            this.fireAt(closestEnemy);
            this.lastFired = time;
            // Recalculate fire rate for the next shot to keep it varied
            this.currentFireRate = this.baseFireRate + Phaser.Math.Between(-300, 300);
        }
    }

    private fireAt(target: Unit) {
        // Add randomness to the impact point
        const offsetX = Phaser.Math.Between(-10, 10);
        const offsetY = Phaser.Math.Between(-10, 10);
        
        // Colored line for "shot"
        const line = this.scene.add.line(0, 0, this.x, this.y, target.x + offsetX, target.y + offsetY, this.color);
        line.setOrigin(0, 0);
        line.setLineWidth(2);

        this.scene.tweens.add({
            targets: line,
            alpha: 0,
            duration: 100,
            onComplete: () => line.destroy()
        });

        target.takeDamage(10);
    }

    public takeDamage(amount: number) {
        if (this.hp <= 0) return;

        this.hp -= amount;
        
        // Update Health Bar
        const healthPercent = Math.max(0, this.hp / this.maxHp);
        this.healthBarFill.setScale(healthPercent, 1);
        
        // Color transition for health bar
        if (healthPercent < 0.3) {
            this.healthBarFill.setFillStyle(0xff0000);
        } else if (healthPercent < 0.6) {
            this.healthBarFill.setFillStyle(0xffff00);
        }

        // Floating Damage Text
        const damageText = this.scene.add.text(this.x, this.y - 20, `-${amount}`, {
            fontSize: '16px',
            color: '#ff0000',
            fontStyle: 'bold'
        });
        damageText.setOrigin(0.5);

        this.scene.tweens.add({
            targets: damageText,
            y: this.y - 60,
            alpha: 0,
            duration: 800,
            onComplete: () => damageText.destroy()
        });
        
        // Flash red on damage
        this.scene.tweens.add({
            targets: this.bodySprite,
            fillAlpha: 0.5,
            duration: 50,
            yoyo: true
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    private die() {
        this.targetX = null;
        this.targetY = null;
        
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocity(0, 0);
        body.setEnable(false);
        
        this.setAlpha(0.3);
        this.healthBarBg.setVisible(false);
        this.healthBarFill.setVisible(false);
        this.selectionCircle.setVisible(false);

        // Auto-destroy after 5 seconds to keep scene clean
        this.scene.time.delayedCall(5000, () => {
            this.destroy();
        });
    }
}
