import 'phaser';
import { BaseBuilding, BuildingConfig } from './BaseBuilding';

export interface SpecificBuildingConfig extends BuildingConfig {
    onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
}

export class Factory extends BaseBuilding {
    private bodySprite: Phaser.GameObjects.Rectangle;
    private baseProductionRate: number = 4000;
    private productionStartTime: number | null = null;
    private productionQueue: number = 0;
    private onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
    private progressText: Phaser.GameObjects.Text;

    constructor(config: SpecificBuildingConfig) {
        super({ ...config, hp: 500 });
        this.onSpawnUnit = config.onSpawnUnit;

        this.bodySprite = this.scene.add.rectangle(0, 0, 60, 60, this.color);
        this.bodySprite.setStrokeStyle(4, 0xffffff);
        this.add(this.bodySprite);

        this.progressText = this.scene.add.text(0, 45, 'Idle', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add(this.progressText);
    }

    public update(time: number, inCloud: boolean) {
        if (this.hp <= 0) return;

        if (this.productionStartTime === null) {
            if (this.productionQueue > 0) {
                this.productionStartTime = time;
            } else {
                return;
            }
        }

        const currentRate = inCloud ? this.baseProductionRate / 2 : this.baseProductionRate;
        const progress = Math.min(1, (time - this.productionStartTime) / currentRate);
        const queueText = this.productionQueue > 1 ? ` (Queue: ${this.productionQueue})` : '';
        this.progressText.setText(`Build: ${Math.floor(progress * 100)}%${inCloud ? ' (BOOST)' : ''}${queueText}`);

        if (time > this.productionStartTime + currentRate) {
            this.productionStartTime = null;
            this.productionQueue--;
            
            if (this.productionQueue <= 0) {
                this.progressText.setText('Idle');
            }
            
            const spawnY = this.y + 70;
            // Scan for blockers at spawn point
            const blockers = this.scene.physics.overlapCirc(this.x, spawnY, 40) as Phaser.Physics.Arcade.Body[];
            blockers.forEach((body: Phaser.Physics.Arcade.Body) => {
                if (body && body.gameObject && body.gameObject !== this) {
                    const entity = body.gameObject as Phaser.GameObjects.Container;
                    // Push them away slightly to make room
                    const angle = Phaser.Math.Angle.Between(this.x, this.y, entity.x, entity.y);
                    entity.x += Math.cos(angle) * 50;
                    entity.y += Math.sin(angle) * 50;
                }
            });

            this.onSpawnUnit(this.x, spawnY, this.team, this.color);
        }
    }

    public startProduction() {
        if (this.hp > 0) {
            this.productionQueue++;
        }
    }

    public isProducing(): boolean {
        return this.productionQueue > 0;
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
        super.die();
        this.progressText.setVisible(false);
    }
}
