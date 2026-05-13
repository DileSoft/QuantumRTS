import 'phaser';

export class HealObject extends Phaser.GameObjects.Container {
    private bodySprite: Phaser.GameObjects.Arc;
    public isHealing: boolean = true; // Changes to harmful in clouds

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        
        // Visuals: a glowing green circle
        this.bodySprite = scene.add.arc(0, 0, 10, 0, 360, false, 0x2ecc71);
        this.add(this.bodySprite);
        
        // Add a glow effect using a larger semi-transparent circle
        const glow = scene.add.arc(0, 0, 15, 0, 360, false, 0x2ecc71, 0.3);
        this.add(glow);

        scene.add.existing(this);
        scene.matter.add.gameObject(this, { 
            isSensor: true,
            shape: { type: 'circle', radius: 10 }
        }); // Sensors don't physicaly collide but detect overlaps
        
        // Floating animation
        const floatingTween = scene.tweens.add({
            targets: this,
            y: y - 10,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Ensure tween is destroyed when the object is destroyed
        this.on('destroy', () => {
            floatingTween.stop();
        });
    }

    public updateVisuals(inCloud: boolean) {
        if (inCloud) {
            this.bodySprite.setFillStyle(0xe74c3c); // Red for danger
            this.isHealing = false;
        } else {
            this.bodySprite.setFillStyle(0x2ecc71); // Green for health
            this.isHealing = true;
        }
    }
}
