import 'phaser';
import { CONFIG } from '../config';
import { BaseUnit } from '../entities/BaseUnit';
import { TankUnit } from '../entities/TankUnit';
import { HarvesterUnit } from '../entities/HarvesterUnit';
import { Factory } from '../entities/Factory';
import { BuilderUnit } from '../entities/BuilderUnit';

/**
 * Публичный API сцены, который использует ИИ.
 * GameScene реализует этот интерфейс.
 */
export interface AiSceneApi {
    getTeamUnits(team: number): BaseUnit[];
    getTeamFactories(team: number): Factory[];
    getTeamBuilders(team: number): BuilderUnit[];
    getEnemyBasePosition(team: number): { x: number; y: number };
    getWorldWidth(): number;
    getWorldHeight(): number;
    aiSpawnBuilder(x: number | null, y: number | null, team: number, color: number): void;
    aiSpawnHarvester(x: number | null, y: number | null, team: number, color: number): void;
    aiCreateFactory(builder: BuilderUnit): boolean;
    aiStartProduction(factory: Factory): void;
    aiOrderAttack(factory: Factory): void;
    aiGetCredits(team: number): number;
}

/**
 * Простой ИИ противника (команда 2).
 * Логика:
 *  1. Копит ресурсы (пассивный доход + харвестеры).
 *  2. Строит фабрику, если есть билдер и хватает кредитов.
 *  3. Производит танки партиями.
 *  4. Когда накоплено достаточно танков — шлёт волну к базе игрока.
 */
export class AiController {
    private scene: AiSceneApi;
    private readonly team: number = 2;
    private readonly color: number = 0xe74c3c;
    private startTime: number;
    private lastThink: number = 0;
    private attacking: boolean = false;

    constructor(scene: AiSceneApi, startDelay: number = CONFIG.ai.startDelay) {
        this.scene = scene;
        this.startTime = Date.now() + startDelay;
    }

    public update(time: number) {
        // Ждём стартовой задержки (даём игроку освоиться)
        if (Date.now() < this.startTime) return;

        // Принимаем решения раз в thinkInterval
        if (time < this.lastThink + CONFIG.ai.thinkInterval) return;
        this.lastThink = time;

        const credits = this.scene.aiGetCredits(this.team);
        const units = this.scene.getTeamUnits(this.team);
        const factories = this.scene.getTeamFactories(this.team);
        const builders = this.scene.getTeamBuilders(this.team);

        // 1. Харвестеры для экономики (если ещё не набрали нужное число)
        // Спавн у своего HQ — координаты подставит GameScene.spawnHarvester
        const harvesters = units.filter(u => u instanceof HarvesterUnit).length;
        if (harvesters < CONFIG.ai.harvesters && credits >= CONFIG.costs.harvester) {
            this.scene.aiSpawnHarvester(null, null, this.team, this.color);
            return;
        }

        // 2. Строим фабрику, если есть билдер и нет фабрик (или меньше лимита)
        // Билдер расходуется на стройку, как у игрока
        if (factories.length < CONFIG.ai.maxFactories && builders.length > 0 && credits >= CONFIG.costs.factory) {
            const builder = builders[0];
            const ok = this.scene.aiCreateFactory(builder);
            if (ok) return;
        }

        // 3. Производим танки (если фабрика есть и она не занята)
        if (factories.length > 0) {
            const factory = factories[0];
            if (credits >= CONFIG.costs.tank * CONFIG.ai.productionBatch) {
                this.scene.aiStartProduction(factory);
                // Заказываем партию: если хватает — ещё один
                if (credits >= CONFIG.costs.tank * (CONFIG.ai.productionBatch + 1)) {
                    this.scene.aiStartProduction(factory);
                }
            }
        }

        // 4. Атака волной: когда танков достаточно — шлём их к базе игрока
        const tanks = units.filter(u => u instanceof TankUnit && u.team === this.team && u.hp > 0) as TankUnit[];
        if (tanks.length >= CONFIG.ai.attackThreshold && !this.attacking) {
            this.attacking = true;
            this.orderAttack(tanks, this.scene.getEnemyBasePosition(this.team));
        }
    }

    /**
     * Отправляем волну танков к базе противника.
     */
    private orderAttack(tanks: TankUnit[], base: { x: number; y: number }) {
        tanks.forEach(tank => {
            // Небольшой разброс, чтобы танки не шли в одну точку
            const offsetX = Phaser.Math.Between(-60, 60);
            const offsetY = Phaser.Math.Between(-60, 60);
            tank.setTargetPosition(base.x + offsetX, base.y + offsetY);
        });

        console.log('[AI] Волна атаки: ' + tanks.length + ' танков к базе игрока');

        // Сбрасываем флаг через некоторое время, чтобы ИИ мог атаковать снова
        this.scene.getTeamUnits(this.team); // keep reference for TS
        setTimeout(() => { this.attacking = false; }, 15000);
    }
}
