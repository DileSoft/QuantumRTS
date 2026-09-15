import 'phaser';

export class HealObject extends Phaser.GameObjects.Container {
    private bodySprite: Phaser.GameObjects.Image;
    private glowSprite: Phaser.GameObjects.Arc;
    public isHealing: boolean = true; // Changes to harmful in clouds

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Подсветка под артефактом
        this.glowSprite = scene.add.arc(0, 0, 15, 0, 360, false, 0x2ecc71, 0.3);
        this.add(this.glowSprite);

        // Визуал: SVG-артефакт (красится через tint: зелёный/красный)
        this.bodySprite = scene.add.image(0, 0, 'artifact');
        this.bodySprite.setDisplaySize(20, 20);
        this.bodySprite.setTint(0x2ecc71);
        this.add(this.bodySprite);

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
            this.bodySprite.setTint(0xe74c3c); // Red for danger
            this.glowSprite.setFillStyle(0xe74c3c, 0.3);
            this.isHealing = false;
        } else {
            this.bodySprite.setTint(0x2ecc71); // Green for health
            this.glowSprite.setFillStyle(0x2ecc71, 0.3);
            this.isHealing = true;
        }
    }
}
