import 'phaser';
import { BaseBuilding, BuildingConfig } from './BaseBuilding';

export interface SpecificBuildingConfig extends BuildingConfig {
    onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
}

export class Factory extends BaseBuilding {
    private bodySprite: Phaser.GameObjects.Rectangle;
    private baseProductionRate: number = 4000;
    private lastProduced: number = 0;
    private onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
    private progressText: Phaser.GameObjects.Text;

    constructor(config: SpecificBuildingConfig) {
        super({ ...config, hp: 500 });
        this.onSpawnUnit = config.onSpawnUnit;

        this.bodySprite = this.scene.add.rectangle(0, 0, 60, 60, this.color);
        this.bodySprite.setStrokeStyle(4, 0xffffff);
        this.add(this.bodySprite);

        this.progressText = this.scene.add.text(0, 45, 'Producing...', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add(this.progressText);
    }

    public update(time: number, inCloud: boolean) {
        if (this.hp <= 0) return;

        const currentRate = inCloud ? this.baseProductionRate / 2 : this.baseProductionRate;
        const progress = Math.min(1, (time - this.lastProduced) / currentRate);
        this.progressText.setText(`Build: ${Math.floor(progress * 100)}%${inCloud ? ' (BOOST)' : ''}`);

        if (time > this.lastProduced + currentRate) {
            this.lastProduced = time;
            this.onSpawnUnit(this.x, this.y + 50, this.team, this.color);
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
        super.die();
        this.progressText.setVisible(false);
    }
}
