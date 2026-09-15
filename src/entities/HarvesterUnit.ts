import 'phaser';
import { BaseUnit, UnitConfig } from './BaseUnit';
import { ResourceField } from './ResourceField';
import { ProbabilityCloud } from './ProbabilityCloud';
import { CONFIG } from '../config';
import { addTintedSprite } from '../ui/tintedSprite';

/**
 * Харвестер — юнит-экстрактор квантовых жил.
 * Стоит у жилы и качает ресурсы на счёт команды.
 * Внутри облака вероятности: добыча ×2, но есть шанс сбоя (урон себе).
 */
export class HarvesterUnit extends BaseUnit {
    private bodySprite: Phaser.GameObjects.Image;
    private drillSprite: Phaser.GameObjects.Rectangle;
    private lastHarvestTick: number = 0;
    private currentField: ResourceField | null = null;
    private onHarvest: (amount: number) => void;

    constructor(config: UnitConfig & { onHarvest: (amount: number) => void }) {
        super(config);
        this.speed = 120;
        this.onHarvest = config.onHarvest;

        const size = 34;
        this.bodySprite = addTintedSprite(this.scene, this, 'harvester-body', this.color, size, size);

        // Буровая насадка
        this.drillSprite = this.scene.add.rectangle(0, -size * 0.6, size * 0.4, size * 0.5, 0xcccccc);
        this.drillSprite.setData('noRecolor', true);
        this.add(this.drillSprite);

        this.scene.matter.add.gameObject(this, {
            shape: { type: 'rectangle', width: size, height: size },
            frictionAir: 0.1,
            restitution: 0.5
        });

        const body = this.body as MatterJS.BodyType;
        this.scene.matter.body.setInertia(body, Infinity);
    }

    public updateHarvest(time: number, delta: number, fields: ResourceField[], clouds: ProbabilityCloud[]) {
        super.update(time, delta);
        if (this.hp <= 0) return;

        this.handleHarvesting(time, fields, clouds);
    }

    private handleHarvesting(time: number, fields: ResourceField[], clouds: ProbabilityCloud[]) {
        // Если нет активного приказа — идти к ближайшей жиле в радиусе поиска
        if ((this.targetX === null || this.targetY === null) && fields.length > 0) {
            const nearest = this.findNearestField(fields);
            if (nearest) {
                this.currentField = nearest;
                const distToField = Phaser.Math.Distance.Between(this.x, this.y, nearest.x, nearest.y);
                if (distToField > CONFIG.harvest.harvestRange) {
                    this.setTargetPosition(nearest.x, nearest.y);
                }
            }
        }

        // Добыча идёт только в зоне жилы и раз в tickInterval
        if (time < this.lastHarvestTick + CONFIG.harvest.tickInterval) return;
        if (!this.currentField || !this.currentField.active) return;
        const distToField = Phaser.Math.Distance.Between(this.x, this.y, this.currentField.x, this.currentField.y);
        if (distToField > CONFIG.harvest.harvestRange) return;

        this.lastHarvestTick = time;

        // Квантовая неопределённость: случайное количество за тик
        let amount = Phaser.Math.Between(CONFIG.harvest.baseMin, CONFIG.harvest.baseMax);

        // Облако вероятности: больше ресурсов, но риск сбоя
        const inCloud = clouds.some(c => c.isOverlapping(this.x, this.y));
        if (inCloud) {
            amount = Math.round(amount * CONFIG.harvest.cloudMultiplier);

            if (Phaser.Math.Between(1, 100) <= CONFIG.harvest.cloudMisfireChance) {
                this.handleMisfire(amount);
                return;
            }
        }

        this.onHarvest(amount);
        this.showFloatingText(`+${amount}`, '#f1c40f');
    }

    /**
     * Сбой при добыче в облаке: добытое испаряется, юнит получает урон.
     */
    private handleMisfire(lostAmount: number) {
        this.takeDamage(CONFIG.harvest.cloudMisfireDamage);
        this.showFloatingText(`Сбой! -${lostAmount}`, '#e74c3c');
    }

    private findNearestField(fields: ResourceField[]): ResourceField | null {
        let nearest: ResourceField | null = null;
        let minDist = CONFIG.harvest.findRange;

        for (const field of fields) {
            if (!field.active) continue;
            const dist = Phaser.Math.Distance.Between(this.x, this.y, field.x, field.y);
            if (dist < minDist) {
                minDist = dist;
                nearest = field;
            }
        }

        return nearest;
    }

    private showFloatingText(text: string, color: string) {
        const label = this.scene.add.text(this.x, this.y - 20, text, {
            fontSize: '14px',
            color,
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: label,
            y: this.y - 55,
            alpha: 0,
            duration: 900,
            onComplete: () => label.destroy()
        });
    }

    protected onDamage() {
        this.scene.tweens.add({
            targets: this.bodySprite,
            alpha: 0.5,
            duration: 50,
            yoyo: true
        });
    }
}
