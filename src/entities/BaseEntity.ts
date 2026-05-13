import 'phaser';

export interface EntityConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    team: number;
    color: number;
    hp: number;
}

export abstract class BaseEntity extends Phaser.GameObjects.Container {
    public team: number;
    public color: number;
    public hp: number;
    public maxHp: number;
    
    protected selectionCircle: Phaser.GameObjects.Arc;
    protected healthBarBg: Phaser.GameObjects.Rectangle;
    protected healthBarFill: Phaser.GameObjects.Rectangle;

    protected glow: Phaser.FX.Glow | null = null;

    constructor(config: EntityConfig) {
        super(config.scene, config.x, config.y);
        this.team = config.team;
        this.color = config.color;
        this.hp = config.hp;
        this.maxHp = config.hp;

        // Selection circle (common for all entities)
        this.selectionCircle = config.scene.add.arc(0, 0, 40, 0, 360, false, 0xffffff, 0.3);
        this.selectionCircle.setVisible(false);
        this.add(this.selectionCircle);

        // Health Bar UI (common for all entities)
        this.healthBarBg = config.scene.add.rectangle(0, -35, 40, 5, 0x000000);
        this.add(this.healthBarBg);

        this.healthBarFill = config.scene.add.rectangle(-20, -35, 40, 5, 0x00ff00);
        this.healthBarFill.setOrigin(0, 0.5);
        this.add(this.healthBarFill);

        config.scene.add.existing(this);
    }

    public setSelected(selected: boolean) {
        this.selectionCircle.setVisible(selected);
    }

    public takeDamage(amount: number) {
        if (this.hp <= 0) return;

        this.hp -= amount;
        this.updateHealthBar();
        this.showDamageText(amount);
        this.onDamage();

        if (this.hp <= 0) {
            this.die();
        }
    }

    public setCloudEffect(inCloud: boolean) {
        if (this.hp <= 0) return;
        
        // Use postFX bloom if available in Phaser 3.60+, otherwise simple brightness via tint
        if (inCloud) {
            this.setAlpha(1);
            // We use a slight additive tint to "brighten" the container
            if (!this.glow) {
                this.glow = this.postFX.addGlow(0xffffff, 2);
            }
        } else {
            this.setAlpha(1);
            if (this.glow) {
                this.postFX.remove(this.glow);
                this.glow = null;
            }
        }
    }

    protected updateHealthBar() {
        const healthPercent = Math.max(0, this.hp / this.maxHp);
        this.healthBarFill.setScale(healthPercent, 1);
        
        if (healthPercent < 0.3) {
            this.healthBarFill.setFillStyle(0xff0000);
        } else if (healthPercent < 0.6) {
            this.healthBarFill.setFillStyle(0xffff00);
        }
    }

    protected showDamageText(amount: number) {
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
    }

    protected abstract onDamage(): void;
    protected abstract die(): void;
}
