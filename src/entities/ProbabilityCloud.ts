import 'phaser';

export class ProbabilityCloud extends Phaser.GameObjects.Container {
    private cloudBody: Phaser.GameObjects.Arc;
    private radius: number = 150;
    private worldWidth: number;
    private worldHeight: number;

    constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
        super(scene, Phaser.Math.Between(0, worldWidth), Phaser.Math.Between(0, worldHeight));
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        // Create a visual cloud (semi-transparent circle)
        this.cloudBody = scene.add.arc(0, 0, this.radius, 0, 360, false, 0x9b59b6, 0.2);
        this.add(this.cloudBody);

        // Add some "fluff" to the cloud
        for (let i = 0; i < 3; i++) {
            const circle = scene.add.arc(
                Phaser.Math.Between(-20, 20),
                Phaser.Math.Between(-20, 20),
                this.radius * 0.7, 0, 360, false, 0x8e44ad, 0.15
            );
            this.add(circle);
        }

        scene.add.existing(this);
        this.startFloating();
    }

    private startFloating() {
        const moveCloud = () => {
            const destX = Phaser.Math.Between(0, this.worldWidth);
            const destY = Phaser.Math.Between(0, this.worldHeight);
            const duration = Phaser.Math.Between(15000, 25000);

            this.scene.tweens.add({
                targets: this,
                x: destX,
                y: destY,
                duration: duration,
                ease: 'Sine.easeInOut',
                onComplete: moveCloud
            });
        };

        moveCloud();
    }

    public isOverlapping(x: number, y: number): boolean {
        const dist = Phaser.Math.Distance.Between(this.x, this.y, x, y);
        return dist < this.radius;
    }
}
