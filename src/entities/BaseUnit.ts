import 'phaser';
import { BaseEntity, EntityConfig } from './BaseEntity';

export interface UnitConfig extends Omit<EntityConfig, 'hp'> {
    hp?: number;
}

export abstract class BaseUnit extends BaseEntity {
    protected targetX: number | null = null;
    protected targetY: number | null = null;
    protected speed: number = 150;
    
    private conversionEndTime: number = 0;
    private isConverted: boolean = false;
    private originalTeam: number = 0;
    private originalColor: number = 0;
    private statusText: Phaser.GameObjects.Text | null = null;

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

    public update(time: number, _delta: number) {
        if (this.hp <= 0) return;

        if (this.isConverted && time > this.conversionEndTime) {
            this.revertConversion();
        }

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
        if (this.statusText) this.statusText.destroy();
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

    public startConversion(duration: number) {
        if (this.isConverted || this.hp <= 0) return;
        
        this.isConverted = true;
        this.originalTeam = this.team;
        this.originalColor = this.color;
        this.conversionEndTime = this.scene.time.now + duration;
        
        // Instant Switch
        this.team = this.originalTeam === 1 ? 2 : 1;
        this.color = this.team === 1 ? 0x3498db : 0xe74c3c;
        this.updateBodyColor();

        this.statusText = this.scene.add.text(0, -50, 'CONVERTED!', {
            fontSize: '10px',
            color: '#ffff00',
            backgroundColor: '#000'
        }).setOrigin(0.5);
        this.add(this.statusText);
        
        // Shake tween
        this.scene.tweens.add({
            targets: this,
            angle: { from: -5, to: 5 },
            duration: 100,
            yoyo: true,
            repeat: -1
        });
    }

    private revertConversion() {
        this.isConverted = false;
        if (this.statusText) {
            this.statusText.destroy();
            this.statusText = null;
        }
        this.scene.tweens.killTweensOf(this);
        this.setAngle(0);

        // Switch back
        this.team = this.originalTeam;
        this.color = this.originalColor;
        this.updateBodyColor();

        const text = this.scene.add.text(this.x, this.y - 40, 'REVERTED', {
            fontSize: '14px',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: text,
            y: this.y - 80,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }

    private updateBodyColor() {
        this.iterate((child: any) => {
            if (child instanceof Phaser.GameObjects.Rectangle && child !== this.healthBarBg && child !== this.healthBarFill) {
                child.setFillStyle(this.color);
            }
        });
    }
}
