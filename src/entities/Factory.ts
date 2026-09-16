import 'phaser';
import { BaseBuilding, BuildingConfig } from './BaseBuilding';
import { CONFIG } from '../config';
import { addTintedSprite } from '../ui/tintedSprite';

export interface SpecificBuildingConfig extends BuildingConfig {
    onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
    onSpendResources: (amount: number) => boolean;
    onUnitProduced?: () => void;
}

export class Factory extends BaseBuilding {
    private bodySprite: Phaser.GameObjects.Image;
    private baseProductionRate: number = 4000;
    private productionStartTime: number | null = null;
    private productionQueue: number = 0;
    private onSpawnUnit: (x: number, y: number, team: number, color: number) => void;
    private onSpendResources: (amount: number) => boolean;
    private onUnitProduced?: () => void;
    private progressText: Phaser.GameObjects.Text;

    constructor(config: SpecificBuildingConfig) {
        super({ ...config, hp: 500 });
        this.onSpawnUnit = config.onSpawnUnit;
        this.onSpendResources = config.onSpendResources;
        this.onUnitProduced = config.onUnitProduced;

        this.bodySprite = addTintedSprite(this.scene, this, 'factory', this.color, 60, 60);

        this.progressText = this.scene.add.text(0, 45, 'Ожидает', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add(this.progressText);

        this.scene.matter.add.gameObject(this, { 
            isStatic: true, 
            shape: { type: 'rectangle', width: 60, height: 60 } 
        });
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
        const queueText = this.productionQueue > 1 ? ` (Очередь: ${this.productionQueue})` : '';
        this.progressText.setText(`Строится: ${Math.floor(progress * 100)}%${inCloud ? ' (УСКОРЕНИЕ)' : ''}${queueText}`);

        if (time > this.productionStartTime + currentRate) {
            this.productionStartTime = null;
            this.productionQueue--;
            
            if (this.productionQueue <= 0) {
                this.progressText.setText('Ожидает');
            }
            
            const spawnY = this.y + 70;
            // Scan for blockers at spawn point using Matter
            const bodies = this.scene.matter.world.getAllBodies();
            bodies.forEach((body: any) => {
                if (body && body.gameObject && body.gameObject !== this) {
                    const gameObject = body.gameObject;
                    const dist = Phaser.Math.Distance.Between(this.x, spawnY, gameObject.x, gameObject.y);
                    if (dist < 40) {
                        // Push them away slightly to make room
                        const angle = Phaser.Math.Angle.Between(this.x, this.y, gameObject.x, gameObject.y);
                        gameObject.x += Math.cos(angle) * 50;
                        gameObject.y += Math.sin(angle) * 50;
                    }
                }
            });

            this.onSpawnUnit(this.x, spawnY, this.team, this.color);
            this.onUnitProduced?.();
        }
    }

    /**
     * Ставит танк в очередь производства.
     * @returns true, если постановка прошла; false — если не хватило кредитов.
     */
    public startProduction(): boolean {
        if (this.hp <= 0) return false;

        // Списываем ресурсы сразу при постановке в очередь
        if (!this.onSpendResources(CONFIG.costs.tank)) {
            return false;
        }

        this.productionQueue++;
        return true;
    }

    public isProducing(): boolean {
        return this.productionQueue > 0;
    }

    protected onDamage() {
        this.scene.tweens.add({
            targets: this.bodySprite,
            alpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }

    protected die() {
        super.die();
        this.progressText.setVisible(false);
    }
}
