import 'phaser';
import { CONFIG } from '../config';
import { BaseEntity } from '../entities/BaseEntity';
import { BaseUnit } from '../entities/BaseUnit';
import { TankUnit } from '../entities/TankUnit';
import { BuilderUnit } from '../entities/BuilderUnit';
import { HarvesterUnit } from '../entities/HarvesterUnit';
import { ProbabilityCloud } from '../entities/ProbabilityCloud';
import { ResourceField } from '../entities/ResourceField';
import { Factory } from '../entities/Factory';
import { HealObject } from '../entities/HealObject';
import { LaserTower } from '../entities/LaserTower';
import { Wall } from '../entities/Wall';
import { HQ } from '../entities/HQ';
import { Economy } from '../systems/Economy';
import { AiController, AiSceneApi } from '../ai/AiController';
import { Tooltip } from '../ui/Tooltip';
import { Minimap } from '../ui/Minimap';
import { gameBridge } from '../ui/react/gameBridge';

export class GameScene extends Phaser.Scene implements AiSceneApi {
    private unitGroup: BaseUnit[] = [];
    private harvesterGroup: HarvesterUnit[] = [];
    private buildingGroup: Factory[] = [];
    private healGroup: HealObject[] = [];
    private towerGroup: LaserTower[] = [];
    private wallGroup: Wall[] = [];
    private hqGroup: HQ[] = [];
    private selectedEntities: BaseEntity[] = [];
    private clouds: ProbabilityCloud[] = [];
    private resourceFields: ResourceField[] = [];
    private economyBlue: Economy = new Economy(1);
    private economyRed: Economy = new Economy(2);
    private tooltip: Tooltip | null = null;
    private gameOverFlag: boolean = false;
    private ai: AiController | null = null;
    private lastHealSpawn: number = 0;
    private lastTowerSpawn: number = 0;
    private selectionRect!: Phaser.GameObjects.Rectangle;
    private isSelecting: boolean = false;
    private selectionStartPoint: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

    // Размеры мира (больше экрана — камера прокручивается)
    private worldWidth: number = 0;
    private worldHeight: number = 0;

    // Мини-карта
    private minimap: Minimap | null = null;

    // Лог событий (через React-мост)
    private baseUnderAttack: boolean = false;
    private lastBaseAttackWarning: number = 0;

    constructor() {
        super('GameScene');
    }

    /**
     * Загрузка SVG-спрайтов юнитов и зданий (белые, красятся через tint).
     */
    preload() {
        this.load.svg('tank', 'assets/tank.svg', { width: 30, height: 30 });
        this.load.svg('builder', 'assets/builder.svg', { width: 40, height: 40 });
        this.load.svg('harvester-body', 'assets/harvester-body.svg', { width: 34, height: 34 });
        this.load.svg('factory', 'assets/factory.svg', { width: 60, height: 60 });
        this.load.svg('hq', 'assets/hq.svg', { width: 80, height: 80 });
        this.load.svg('tower', 'assets/tower.svg', { width: 40, height: 40 });
        this.load.svg('tower-crystal', 'assets/tower-crystal.svg', { width: 20, height: 20 });
        this.load.svg('artifact', 'assets/artifact.svg', { width: 20, height: 20 });
    }

    /**
     * Ширина игрового мира.
     */
    public getWorldWidth(): number {
        return this.worldWidth;
    }

    /**
     * Высота игрового мира.
     */
    public getWorldHeight(): number {
        return this.worldHeight;
    }

    /**
     * init() вызывается перед create() при каждом старте/рестарте сцены.
     * Сбрасываем все группы и флаги, чтобы рестарт работал чисто.
     */
    init() {
        this.unitGroup = [];
        this.harvesterGroup = [];
        this.buildingGroup = [];
        this.healGroup = [];
        this.towerGroup = [];
        this.wallGroup = [];
        this.hqGroup = [];
        this.selectedEntities = [];
        this.clouds = [];
        this.resourceFields = [];
        this.economyBlue = new Economy(1);
        this.economyRed = new Economy(2);
        this.tooltip = null;
        this.gameOverFlag = false;
        this.ai = null;
        this.lastHealSpawn = 0;
        this.lastTowerSpawn = 0;
        this.isSelecting = false;
        this.selectionStartPoint = new Phaser.Math.Vector2();
        this.minimap = null;
        this.baseUnderAttack = false;
        this.lastBaseAttackWarning = 0;

        // Сбрасываем React-HUD (кредиты, селекция, лог, game-over)
        gameBridge.unregisterAllActions();
        gameBridge.reset();
    }

    public removeEntity(entity: Phaser.GameObjects.GameObject, silent: boolean = false) {
        if (this.gameOverFlag) return;

        // Логируем потери (до удаления из групп).
        // silent=true — добровольное преобразование (строитель → фабрика), не потеря.
        if (!silent) {
            this.logEntityLoss(entity);
        }

        if (entity instanceof BaseUnit) {
            this.unitGroup = this.unitGroup.filter(u => u !== entity);
            if (entity instanceof HarvesterUnit) {
                this.harvesterGroup = this.harvesterGroup.filter(h => h !== entity);
            }
        } else if (entity instanceof Factory) {
            this.buildingGroup = this.buildingGroup.filter(b => b !== entity);
        } else if (entity instanceof LaserTower) {
            this.towerGroup = this.towerGroup.filter(t => t !== entity);
        } else if (entity instanceof Wall) {
            this.wallGroup = this.wallGroup.filter(w => w !== entity);
        } else if (entity instanceof HQ) {
            this.hqGroup = this.hqGroup.filter(h => h !== entity);
        } else if (entity instanceof HealObject) {
            this.healGroup = this.healGroup.filter(h => h !== entity);
        }
        
        if (entity instanceof BaseEntity) {
            this.selectedEntities = this.selectedEntities.filter(e => e !== entity);
        }
    }

    /**
     * Логирует уничтожение объекта.
     * Потери игрока — всегда; потери врага — только фабрики (без спама).
     * Wall/HealObject пропускаем (шум), HQ покрыт оверлеем конца игры.
     */
    private logEntityLoss(entity: Phaser.GameObjects.GameObject) {
        const time = this.time.now;

        if (entity instanceof TankUnit) {
            if (entity.team === 1) {
                gameBridge.log('Наш танк уничтожен', 'warning', time);
            }
            return;
        }
        if (entity instanceof HarvesterUnit) {
            if (entity.team === 1) {
                gameBridge.log('Наш харвестер уничтожен', 'warning', time);
            }
            return;
        }
        if (entity instanceof BuilderUnit) {
            if (entity.team === 1) {
                gameBridge.log('Наш строитель уничтожен', 'warning', time);
            }
            return;
        }
        if (entity instanceof Factory) {
            if (entity.team === 1) {
                gameBridge.log('Наша фабрика уничтожена!', 'danger', time);
            } else {
                gameBridge.log('Фабрика врага уничтожена!', 'success', time);
            }
            return;
        }
        if (entity instanceof LaserTower) {
            gameBridge.log('Лазерная башня уничтожена', 'info', time);
            return;
        }
    }

    create() {
        // Размеры мира: 3x экрана
        this.worldWidth = window.innerWidth * CONFIG.world.scaleFactor;
        this.worldHeight = window.innerHeight * CONFIG.world.scaleFactor;

        // Background — на весь мир
        this.add.grid(
            this.worldWidth / 2,
            this.worldHeight / 2,
            this.worldWidth,
            this.worldHeight,
            64, 64, 0x333333
        ).setAltFillStyle(0x2a2a2a).setOutlineStyle();

        // Matter World — границы мира
        this.matter.world.setBounds(0, 0, this.worldWidth, this.worldHeight);

        // Камера: старт на синем HQ (игрок), границы прокрутки = границы мира
        this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.cameras.main.centerOn(200, 200);

        // Мини-карта
        this.minimap = new Minimap(this, this.worldWidth, this.worldHeight, (wx, wy) => this.jumpCamera(wx, wy));

        // Квантовые жилы ресурсов
        for (let i = 0; i < CONFIG.resourceFields.count; i++) {
            const rx = Phaser.Math.Between(150, this.worldWidth - 150);
            const ry = Phaser.Math.Between(150, this.worldHeight - 150);
            this.resourceFields.push(new ResourceField(this, rx, ry, this.worldWidth, this.worldHeight));
        }

        // HUD: кредиты и лог через React-мост
        gameBridge.setHudVisible(true);
        gameBridge.clearLog();
        gameBridge.log('Игра началась. Уничтожьте HQ врага!', 'info', 0);

        // Tooltip при наведении
        this.tooltip = new Tooltip(this);

        // Действия для React-кнопок
        gameBridge.registerAction('spawnHarvester', () => this.spawnHarvester(null, null, 1, 0x3498db));
        gameBridge.registerAction('focusBase', () => this.focusOnBase());
        gameBridge.registerAction('build', () => {
            this.selectedEntities.forEach(e => {
                if (e instanceof BuilderUnit) e.build();
            });
        });
        gameBridge.registerAction('produce', () => {
            this.selectedEntities.forEach(e => {
                if (e instanceof Factory) {
                    const ok = e.startProduction();
                    if (!ok) {
                        gameBridge.log(`Не хватает кредитов для танка (${CONFIG.costs.tank})`, 'warning', this.time.now);
                    }
                }
            });
        });
        gameBridge.registerAction('restart', () => this.scene.restart());

        // Initial Builders
        // HQ синей команды (игрок, слева-сверху)
        const hqBlue = new HQ({
            scene: this,
            x: 200,
            y: 200,
            team: 1,
            color: 0x3498db,
            onDestroyed: (team) => this.handleHqDestroyed(team)
        });
        this.hqGroup.push(hqBlue);

        // HQ красной команды (ИИ, справа-внизу мира)
        const hqRed = new HQ({
            scene: this,
            x: this.worldWidth - 200,
            y: this.worldHeight - 200,
            team: 2,
            color: 0xe74c3c,
            onDestroyed: (team) => this.handleHqDestroyed(team)
        });
        this.hqGroup.push(hqRed);

        // Стартовые билдеры рядом с HQ (по углам мира)
        this.spawnBuilder(250, 280, 1, 0x3498db);
        this.spawnBuilder(this.worldWidth - 250, this.worldHeight - 280, 2, 0xe74c3c);

        // ИИ противника (команда 2)
        this.ai = new AiController(this);

        // Create Probability Clouds
        for (let i = 0; i < 4; i++) {
            this.clouds.push(new ProbabilityCloud(this, this.worldWidth, this.worldHeight));
        }

        this.generateWalls();

        // Selection Rectangle (в мировых координатах — следует за камерой)
        this.selectionRect = this.add.rectangle(0, 0, 0, 0, 0x00ff00, 0.2);
        this.selectionRect.setStrokeStyle(1, 0x00ff00);
        this.selectionRect.setOrigin(0, 0);
        this.selectionRect.setVisible(false);
        this.selectionRect.setDepth(1000);

        // Input (в мировых координатах, чтобы камера не ломала клики)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            // Клик по мини-карте — прыжок камеры (без выделения)
            if (pointer.leftButtonDown() && this.minimap?.isInside(pointer.x, pointer.y)) {
                this.minimap.handleClick(pointer.x, pointer.y);
                return;
            }

            if (pointer.leftButtonDown()) {
                this.isSelecting = true;
                this.selectionStartPoint.set(pointer.worldX, pointer.worldY);
                this.selectionRect.setPosition(pointer.worldX, pointer.worldY);
                this.selectionRect.setSize(0, 0);
                this.selectionRect.setVisible(true);
            } else if (pointer.rightButtonDown()) {
                this.handleRightClick(pointer);
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            // Перетаскивание по мини-карте — тоже двигаем камеру
            if (pointer.isDown && this.minimap?.isInside(pointer.x, pointer.y)) {
                this.minimap.handleClick(pointer.x, pointer.y);
                return;
            }

            if (this.isSelecting) {
                const width = pointer.worldX - this.selectionStartPoint.x;
                const height = pointer.worldY - this.selectionStartPoint.y;
                this.selectionRect.setSize(width, height);
            }

            // Tooltip при наведении на объекты (не над мини-картой)
            if (!this.minimap?.isInside(pointer.x, pointer.y)) {
                this.updateTooltip(pointer);
            } else {
                this.tooltip?.hide();
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonReleased()) {
                if (this.isSelecting) {
                    // Клик был над мини-картой — не выделяем
                    if (this.minimap?.isInside(pointer.x, pointer.y)) {
                        this.isSelecting = false;
                        this.selectionRect.setVisible(false);
                        return;
                    }
                    this.handleSelection(pointer);
                    this.isSelecting = false;
                    this.selectionRect.setVisible(false);
                }
            }
        });

        // Prevent context menu on right click
        this.input.mouse?.disableContextMenu();

        // Пауза по Esc
        this.input.keyboard?.on('keydown-ESC', () => {
            if (this.gameOverFlag) return;
            this.scene.pause();
            this.scene.launch('PauseScene');
        });

        // Matter collisions for picking up heal objects
        this.matter.world.on('collisionstart', (event: any) => {
            event.pairs.forEach((pair: any) => {
                const { bodyA, bodyB } = pair;
                
                const objA = bodyA.gameObject;
                const objB = bodyB.gameObject;

                if (!objA || !objB) return;

                // Check if one is a Unit and another is a HealObject
                let unit = objA instanceof BaseUnit ? objA : (objB instanceof BaseUnit ? objB : null);
                let heal = objA instanceof HealObject ? objA : (objB instanceof HealObject ? objB : null);

                if (unit && heal && heal.active) {
                    if (heal.isHealing) {
                        unit.heal(25);
                    } else {
                        unit.takeDamage(15);
                    }
                    this.removeEntity(heal);
                    heal.destroy();
                }
            });
        });

        // Matter collisions are handled automatically by the engine
    }

    private generateWalls() {
        const numWalls = 10;
        const maxLen = this.worldWidth / 2;
        let createdCount = 0;
        let attempts = 0;

        while (createdCount < numWalls && attempts < 100) {
            attempts++;
            const length = Phaser.Math.Between(100, maxLen);
            const thickness = 20;
            
            const x = Phaser.Math.Between(100, this.worldWidth - 100);
            const y = Phaser.Math.Between(100, this.worldHeight - 100);
            const angle = Phaser.Math.FloatBetween(0, Math.PI); // Random angle in radians

            // Create a temporary Matter body to check for overlaps
            // This is the most accurate way since walls are rotated rectangles
            const tempBody = (this.matter.add).rectangle(x, y, length, thickness, { angle: angle });
            
            let overlaps = false;

            // 1. Check overlaps with other walls (Matter bodies)
            const bodies = this.matter.world.getAllBodies();
            for (const body of bodies) {
                if (body === tempBody) continue;
                
                // Use Matter.Query.collides to check for actual geometric intersection
                const collision = (Phaser.Physics.Matter as any).Matter.Query.collides(tempBody, [body]);
                if (collision.length > 0) {
                    overlaps = true;
                    break;
                }
            }

            // 2. Additional distance check from starting units (manual for safety)
            if (!overlaps) {
                this.unitGroup.forEach(unit => {
                    if (Phaser.Math.Distance.Between(x, y, unit.x, unit.y) < 200) overlaps = true;
                });
            }

            // Remove the temporary body from the physics world
            this.matter.world.remove(tempBody);

            if (!overlaps) {
                const wall = new Wall(this, x, y, length, thickness, angle);
                this.wallGroup.push(wall);
                createdCount++;
            }
        }
    }

    private spawnTank(x: number | null, y: number | null, team: number, color: number, free: boolean = false) {
        if (!free && !this.getEconomy(team).spend(CONFIG.costs.tank)) {
            if (team === 1) {
                gameBridge.log(`Не хватает кредитов для танка (${CONFIG.costs.tank})`, 'warning', this.time.now);
            }
            return;
        }

        let actualX = x ?? Phaser.Math.Between(100, this.worldWidth - 100);
        let actualY = y ?? Phaser.Math.Between(100, this.worldHeight - 100);

        const tank = new TankUnit({
            scene: this,
            x: actualX,
            y: actualY,
            team,
            color
        });
        this.unitGroup.push(tank);
    }

    private spawnHarvester(x: number | null, y: number | null, team: number, color: number) {
        if (!this.getEconomy(team).spend(CONFIG.costs.harvester)) {
            if (team === 1) {
                gameBridge.log(`Не хватает кредитов для харвестера (${CONFIG.costs.harvester})`, 'warning', this.time.now);
            }
            return;
        }

        // Если координаты не заданы — спавним рядом с HQ своей команды
        let actualX = x;
        let actualY = y;
        if (actualX === null || actualY === null) {
            const hq = this.hqGroup.find(h => h.team === team && h.active);
            if (hq) {
                // Небольшой случайный разброс вокруг HQ
                actualX = hq.x + Phaser.Math.Between(-60, 60);
                actualY = hq.y + 80 + Phaser.Math.Between(0, 40);
            } else {
                actualX = Phaser.Math.Between(100, this.worldWidth - 100);
                actualY = Phaser.Math.Between(100, this.worldHeight - 100);
            }
        }

        const harvester = new HarvesterUnit({
            scene: this,
            x: actualX,
            y: actualY,
            team,
            color,
            onHarvest: (amount) => this.getEconomy(team).add(amount)
        });
        this.unitGroup.push(harvester);
        this.harvesterGroup.push(harvester);
    }

    public getEconomy(team: number): Economy {
        return team === 1 ? this.economyBlue : this.economyRed;
    }

    // ===== Публичный API для ИИ (AiSceneApi) =====

    public getTeamUnits(team: number): BaseUnit[] {
        return this.unitGroup.filter(u => u.team === team && u.active);
    }

    public getTeamFactories(team: number): Factory[] {
        return this.buildingGroup.filter(b => b.team === team && b.active);
    }

    public getTeamBuilders(team: number): BuilderUnit[] {
        return this.unitGroup.filter(u => u instanceof BuilderUnit && u.team === team && u.active) as BuilderUnit[];
    }

    public getEnemyBasePosition(team: number): { x: number; y: number } {
        // Возвращаем позицию вражеского HQ (если есть)
        const enemyHQ = this.hqGroup.find(h => h.team !== team && h.active && h.hp > 0);
        if (enemyHQ) {
            return { x: enemyHQ.x, y: enemyHQ.y };
        }
        // Fallback: стартовая позиция врага
        return team === 1 ? { x: this.worldWidth - 200, y: this.worldHeight - 200 } : { x: 200, y: 200 };
    }

    public aiSpawnBuilder(x: number, y: number, team: number, color: number): void {
        this.spawnBuilder(x, y, team, color);
    }

    public aiSpawnHarvester(x: number, y: number, team: number, color: number): void {
        this.spawnHarvester(x, y, team, color);
    }

    public aiCreateFactory(x: number, y: number, team: number, color: number): boolean {
        // Требуем ресурсы ДО создания (в отличие от createFactory через билдера)
        if (!this.getEconomy(team).spend(CONFIG.costs.factory)) {
            return false;
        }
        this.createFactoryAt(x, y, team, color);
        return true;
    }

    public aiStartProduction(factory: Factory): void {
        factory.startProduction();
    }

    public aiOrderAttack(_factory: Factory): void {
        // В этом ИИ атака идёт напрямую через orderAttack — метод-заглушка
    }

    public aiGetCredits(team: number): number {
        return this.getEconomy(team).getCredits();
    }

    /**
     * Обработчик разрушения HQ.
     */
    private handleHqDestroyed(team: number) {
        if (this.gameOverFlag) return;
        this.gameOverFlag = true;

        const winner = team === 1 ? 2 : 1;
        const isPlayerWin = winner === 1;
        const message = isPlayerWin ? '🔵 ПОБЕДА! Синие уничтожили базу врага' : '🔴 ПОРАЖЕНИЕ! Ваша база уничтожена';

        // Оверлей конца игры — через React
        gameBridge.setGameOver({ winner, message });
    }

    private spawnBuilder(x: number, y: number, team: number, color: number) {
        const builder = new BuilderUnit({
            scene: this,
            x,
            y,
            team,
            color,
            onBuild: (bx, by, bt, bc) => this.createFactory(bx, by, bt, bc)
        });
        this.unitGroup.push(builder);
    }

    private createFactory(x: number, y: number, team: number, color: number) {
        if (!this.getEconomy(team).spend(CONFIG.costs.factory)) {
            if (team === 1) {
                gameBridge.log(`Не хватает кредитов для фабрики (${CONFIG.costs.factory})`, 'warning', this.time.now);
            }
            return;
        }

        this.createFactoryAt(x, y, team, color);
    }

    private createFactoryAt(x: number, y: number, team: number, color: number) {
        const factory = new Factory({
            scene: this,
            x,
            y,
            team,
            color,
            onSpawnUnit: (ux, uy, ut, uc) => this.spawnTank(ux, uy, ut, uc, true),
            onSpendResources: (amount) => this.getEconomy(team).spend(amount),
            onUnitProduced: () => {
                if (team === 1) {
                    gameBridge.log('Танк готов', 'success', this.time.now);
                }
            }
        });
        this.buildingGroup.push(factory);

        if (team === 1) {
            gameBridge.log('Фабрика построена', 'success', this.time.now);
        }
    }

    private handleSelection(pointer: Phaser.Input.Pointer) {
        if (this.gameOverFlag) return;

        // Clear previous selection
        this.selectedEntities.forEach(e => e.setSelected(false));
        this.selectedEntities = [];

        const x1 = Math.min(this.selectionStartPoint.x, pointer.worldX);
        const y1 = Math.min(this.selectionStartPoint.y, pointer.worldY);
        const x2 = Math.max(this.selectionStartPoint.x, pointer.worldX);
        const y2 = Math.max(this.selectionStartPoint.y, pointer.worldY);
        
        const selectionRect = new Phaser.Geom.Rectangle(x1, y1, x2 - x1, y2 - y1);
        const isSingleClick = selectionRect.width < 5 && selectionRect.height < 5;

        // Check units (только свои)
        this.unitGroup.forEach(unit => {
            if (!unit.active || unit.team !== 1) return;
            
            if (isSingleClick) {
                if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, unit.x, unit.y) < 40) {
                    this.selectedEntities.push(unit);
                }
            } else {
                if (selectionRect.contains(unit.x, unit.y)) {
                    this.selectedEntities.push(unit);
                }
            }
        });

        // Check buildings (только свои)
        if (this.selectedEntities.length === 0 || isSingleClick) {
            this.buildingGroup.forEach(b => {
                if (!b.active || b.team !== 1) return;
                
                if (isSingleClick) {
                    if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, b.x, b.y) < 50) {
                        this.selectedEntities.push(b);
                    }
                } else {
                    if (selectionRect.contains(b.x, b.y)) {
                        this.selectedEntities.push(b);
                    }
                }
            });
        }

        // Check HQ (только свой)
        if (this.selectedEntities.length === 0 || isSingleClick) {
            this.hqGroup.forEach(hq => {
                if (!hq.active || hq.team !== 1) return;

                if (isSingleClick) {
                    if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, hq.x, hq.y) < 60) {
                        this.selectedEntities.push(hq);
                    }
                } else {
                    if (selectionRect.contains(hq.x, hq.y)) {
                        this.selectedEntities.push(hq);
                    }
                }
            });
        }

        this.selectedEntities.forEach(e => e.setSelected(true));

        // Видимость React-кнопок по текущей селекции
        gameBridge.setSelection({
            builder: this.selectedEntities.some(e => e instanceof BuilderUnit),
            factory: this.selectedEntities.some(e => e instanceof Factory),
            hq: this.selectedEntities.some(e => e instanceof HQ)
        });
    }

    private handleRightClick(pointer: Phaser.Input.Pointer) {
        if (this.gameOverFlag) return;
        this.selectedEntities.forEach(entity => {
            if (entity instanceof BaseUnit && entity.active) {
                entity.setTargetPosition(pointer.worldX, pointer.worldY);
            }
        });
    }

    update(time: number, delta: number) {
        if (this.gameOverFlag) return;

        // Экономика: пассивный доход
        this.economyBlue.update(delta);
        this.economyRed.update(delta);

        // ИИ противника
        this.ai?.update(time);

        // HUD: кредиты команд (через React-мост, пушим только при изменении)
        gameBridge.setCredits(this.economyBlue.getCredits(), this.economyRed.getCredits());

        // Обновляем доступность кнопок по ресурсам игрока (команда 1)
        this.updateButtonsAvailability();

        // Прокрутка камеры: края экрана + клавиши WASD/стрелки
        this.handleCameraScroll(delta);

        // Мини-карта: обновляем точки и рамку обзора
        this.minimap?.update(
            this.cameras.main,
            this.unitGroup,
            this.buildingGroup,
            this.hqGroup,
            this.towerGroup,
            this.wallGroup,
            this.resourceFields,
            this.clouds
        );

        // Проверка атаки на базу игрока
        this.checkBaseUnderAttack(time);

        // Spawn heal objects
        if (time > this.lastHealSpawn + 1000) {
            this.lastHealSpawn = time;
            
            // Random position (по всему миру)
            const rx = Phaser.Math.Between(50, this.worldWidth - 50);
            const ry = Phaser.Math.Between(50, this.worldHeight - 50);
            
            // Check if cloud is over spawn point to increase probability
            const cloudOverSpawn = this.clouds.some(c => c.isOverlapping(rx, ry));
            const chance = cloudOverSpawn ? 20 : 5; // 20% if in cloud, 5% normally
            
            if (Phaser.Math.Between(1, 100) <= chance) {
                const heal = new HealObject(this, rx, ry);
                this.healGroup.push(heal);
            }
        }

        // Spawn laser towers
        if (time > this.lastTowerSpawn + 5000) { // Every 5 seconds check
            this.lastTowerSpawn = time;
            const rx = Phaser.Math.Between(100, this.worldWidth - 100);
            const ry = Phaser.Math.Between(100, this.worldHeight - 100);
            
            // Check cloud influence
            const cloudOverSpawn = this.clouds.some(c => c.isOverlapping(rx, ry));
            const chance = cloudOverSpawn ? 40 : 15; // Higher chance in clouds
            
            if (Phaser.Math.Between(1, 100) <= chance) {
                const tower = new LaserTower(this, rx, ry);
                this.towerGroup.push(tower);
            }
        }

        // Update heal objects visuals
        this.healGroup.forEach(obj => {
            const h = obj as HealObject;
            const inCloud = this.clouds.some(c => h.body && c.isOverlapping(h.x, h.y));
            h.updateVisuals(inCloud);
        });

        // Update walls
        this.wallGroup.forEach(obj => {
            const w = obj as Wall;
            const inCloud = this.clouds.some(c => w.body && c.isOverlapping(w.x, w.y));
            w.update(time, inCloud);
        });

        const allEntities: BaseEntity[] = [...this.unitGroup, ...this.buildingGroup, ...this.towerGroup, ...this.hqGroup];

        // Update each unit
        for (const unit of this.unitGroup) {
            const inCloud = this.clouds.some(cloud => unit.body && cloud.isOverlapping(unit.x, unit.y));
            unit.setCloudEffect(inCloud);

            // Conversion logic (very small chance every update)
            if (Phaser.Math.Between(1, 10000) <= 2) { // ~0.02% chance per frame (approx every 1-2 mins for one unit)
                const duration = inCloud ? 4000 : 1000;
                unit.startConversion(duration);
            }

            if (unit instanceof TankUnit) {
                unit.update(time, delta, allEntities, inCloud);
            } else {
                unit.update(time, delta);
            }
        }

        // Update harvesters
        this.harvesterGroup = this.harvesterGroup.filter(h => h.active);
        for (const harvester of this.harvesterGroup) {
            const inCloud = this.clouds.some(cloud => harvester.body && cloud.isOverlapping(harvester.x, harvester.y));
            harvester.setCloudEffect(inCloud);
            harvester.updateHarvest(time, delta, this.resourceFields, this.clouds);
        }

        // Update buildings
        this.buildingGroup = this.buildingGroup.filter(b => b.active);
        for (const building of this.buildingGroup) {
            const inCloud = this.clouds.some(cloud => building.body && cloud.isOverlapping(building.x, building.y));
            building.setCloudEffect(inCloud);
            building.update(time, inCloud);
        }

        // Update towers
        this.towerGroup = this.towerGroup.filter(t => t.active);
        for (const tower of this.towerGroup) {
            const inCloud = this.clouds.some(cloud => tower.body && cloud.isOverlapping(tower.x, tower.y));
            tower.setCloudEffect(inCloud);
            tower.update(time, allEntities, inCloud);
        }

        // Update heal objects
        this.healGroup = this.healGroup.filter(h => h.active);
        this.healGroup.forEach(obj => {
            const h = obj as HealObject;
            const inCloud = this.clouds.some(c => h.body && c.isOverlapping(h.x, h.y));
            h.updateVisuals(inCloud);
        });
    }

    /**
     * Показываем tooltip при наведении на объекты.
     * Поиск объекта — в мировых координатах; показ тултипа — в экранных
     * (тултип имеет setScrollFactor(0), поэтому привязан к экрану).
     */
    private updateTooltip(pointer: Phaser.Input.Pointer) {
        if (!this.tooltip) return;

        const wx = pointer.worldX;
        const wy = pointer.worldY;
        const sx = pointer.x;
        const sy = pointer.y;

        let hovered: { lines: string[] } | null = null;

        // Юниты (ближайший в радиусе 30)
        for (const unit of this.unitGroup) {
            if (!unit.active) continue;
            const dist = Phaser.Math.Distance.Between(wx, wy, unit.x, unit.y);
            if (dist < 30) {
                const lines = this.getUnitTooltip(unit);
                if (lines) hovered = { lines };
                break;
            }
        }

        // Постройки (фабрики)
        if (!hovered) {
            for (const b of this.buildingGroup) {
                if (!b.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, b.x, b.y);
                if (dist < 50) {
                    hovered = {
                        lines: [
                            `Фабрика (Команда ${b.team === 1 ? '1 🔵' : '2 🔴'})`,
                            `HP: ${Math.max(0, Math.round(b.hp))}/${b.maxHp}`,
                            `Производство: ${b.isProducing() ? 'Активно' : 'Ожидание'}`
                        ]
                    };
                    break;
                }
            }
        }

        if (!hovered) {
            for (const hq of this.hqGroup) {
                if (!hq.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, hq.x, hq.y);
                if (dist < 60) {
                    hovered = {
                        lines: [
                            `Командный центр (Команда ${hq.team === 1 ? '1 🔵' : '2 🔴'})`,
                            `HP: ${Math.max(0, Math.round(hq.hp))}/${hq.maxHp}`,
                            'Уничтожьте HQ врага для победы!'
                        ]
                    };
                    break;
                }
            }
        }

        // Лазерные башни
        if (!hovered) {
            for (const tower of this.towerGroup) {
                if (!tower.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, tower.x, tower.y);
                if (dist < 45) {
                    hovered = {
                        lines: [
                            'Лазерная башня (Нейтральная)',
                            `HP: ${Math.max(0, Math.round(tower.hp))}/${tower.maxHp}`,
                            tower.isHealingMode
                                ? 'Режим: ⚕ Лечение (в облаке)'
                                : 'Режим: ⚔ Атака',
                            `Радиус: ${tower.attackRange}`
                        ]
                    };
                    break;
                }
            }
        }

        // Стены
        if (!hovered) {
            for (const wall of this.wallGroup) {
                if (!wall.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, wall.x, wall.y);
                if (dist < 45) {
                    hovered = {
                        lines: [
                            'Стена (Нейтральная)',
                            wall.isFaded
                                ? 'Состояние: ✨ Исчезла (не блокирует)'
                                : 'Состояние: активна (блокирует)',
                            'Может случайно исчезать и появляться'
                        ]
                    };
                    break;
                }
            }
        }

        // Квантовые жилы
        if (!hovered) {
            for (const field of this.resourceFields) {
                if (!field.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, field.x, field.y);
                if (dist < field.radius) {
                    hovered = {
                        lines: [
                            'Квантовая жила',
                            `Зона добычи: ${field.radius}`,
                            'Поставьте харвестер рядом для добычи'
                        ]
                    };
                    break;
                }
            }
        }

        // Облака вероятности
        if (!hovered) {
            for (const cloud of this.clouds) {
                if (cloud.isOverlapping(wx, wy)) {
                    hovered = {
                        lines: [
                            'Облако вероятности',
                            'Буст добычи ×2',
                            'Риск сбоя (25%)',
                            'Ускорение производства'
                        ]
                    };
                    break;
                }
            }
        }

        // Лечащие/вредящие артефакты
        if (!hovered) {
            for (const heal of this.healGroup) {
                if (!heal.active) continue;
                const dist = Phaser.Math.Distance.Between(wx, wy, heal.x, heal.y);
                if (dist < 20) {
                    hovered = {
                        lines: [
                            heal.isHealing
                                ? 'Квантовый артефакт (⚕ Лечит)'
                                : 'Квантовый артефакт (☠ Опасен!)',
                            heal.isHealing
                                ? 'Соберите юнитом: +25 HP'
                                : 'В облаке стал вредным: −15 HP',
                            'Исчезает после сбора'
                        ]
                    };
                    break;
                }
            }
        }

        if (hovered) {
            this.tooltip.show(sx, sy, hovered.lines);
        } else {
            this.tooltip.hide();
        }
    }

    /**
     * Параметры юнита для tooltip.
     */
    private getUnitTooltip(unit: BaseUnit): string[] | null {
        const teamStr = unit.team === 1 ? '1 🔵' : '2 🔴';
        const hpLine = `HP: ${Math.max(0, Math.round(unit.hp))}/${unit.maxHp}`;

        if (unit instanceof TankUnit) {
            return [
                'Танк',
                `Команда: ${teamStr}`,
                hpLine,
                `Урон: 10 | Скорость: ${unit.getSpeed()}`
            ];
        }
        if (unit instanceof HarvesterUnit) {
            return [
                'Харвестер',
                `Команда: ${teamStr}`,
                hpLine,
                `Скорость: ${unit.getSpeed()}`,
                'Добывает ресурсы у квантовых жил'
            ];
        }
        if (unit instanceof BuilderUnit) {
            return [
                'Строитель',
                `Команда: ${teamStr}`,
                hpLine,
                'Строит фабрики'
            ];
        }
        return null;
    }

    /**
     * Подсвечиваем кнопки в зависимости от наличия ресурсов у игрока (команда 1).
     */
    private updateButtonsAvailability() {
        const credits = this.economyBlue.getCredits();

        gameBridge.setAffordability({
            harvester: credits >= CONFIG.costs.harvester,
            factory: credits >= CONFIG.costs.factory,
            tank: credits >= CONFIG.costs.tank
        });
    }

    /**
     * Прокрутка камеры: края экрана (мышь) + клавиши WASD/стрелки.
     */
    private handleCameraScroll(delta: number) {
        const cam = this.cameras.main;

        // 1. Мышь у края экрана (в экранных координатах)
        const pointer = this.input.activePointer;
        if (!this.isSelecting) {
            const px = pointer.x; // экранные координаты
            const py = pointer.y;
            const m = CONFIG.world.edgeScrollMargin;
            const speed = CONFIG.world.edgeScrollSpeed * (delta / 1000);

            if (px <= m) cam.scrollX -= speed;
            else if (px >= window.innerWidth - m) cam.scrollX += speed;

            if (py <= m) cam.scrollY -= speed;
            else if (py >= window.innerHeight - m) cam.scrollY += speed;
        }

        // 2. Клавиши WASD/стрелки
        const cursors = this.input.keyboard?.createCursorKeys();
        const keys = this.input.keyboard?.addKeys('W,A,S,D') as { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key } | undefined;
        const kSpeed = CONFIG.world.keyboardScrollSpeed * (delta / 1000);

        if (cursors?.left.isDown || keys?.A.isDown) cam.scrollX -= kSpeed;
        if (cursors?.right.isDown || keys?.D.isDown) cam.scrollX += kSpeed;
        if (cursors?.up.isDown || keys?.W.isDown) cam.scrollY -= kSpeed;
        if (cursors?.down.isDown || keys?.S.isDown) cam.scrollY += kSpeed;

        // Ограничиваем камеру границами мира
        cam.scrollX = Phaser.Math.Clamp(cam.scrollX, 0, this.worldWidth - window.innerWidth);
        cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, this.worldHeight - window.innerHeight);
    }

    /**
     * Фокус камеры на синий HQ (база игрока).
     */
    private focusOnBase() {
        const hq = this.hqGroup.find(h => h.team === 1 && h.active);
        if (hq) {
            this.cameras.main.centerOn(hq.x, hq.y);
        }
    }

    /**
     * Перемещение камеры по клику на мини-карте.
     */
    private jumpCamera(worldX: number, worldY: number) {
        this.cameras.main.centerOn(worldX, worldY);
    }

    /**
     * Проверяет, атакуют ли враги базу игрока.
     * Уведомляет один раз в начале атаки, повторяет по кулдауну,
     * сообщает об отражении атаки.
     */
    private checkBaseUnderAttack(time: number) {
        const playerHq = this.hqGroup.find(h => h.team === 1 && h.active && h.hp > 0);
        if (!playerHq) return;

        const radius = CONFIG.notifications.baseAttackRadius;
        const enemiesNear = this.unitGroup.some(
            u => u.team !== 1 && u.active && u.hp > 0 &&
                Phaser.Math.Distance.Between(u.x, u.y, playerHq.x, playerHq.y) < radius
        );

        if (enemiesNear) {
            if (!this.baseUnderAttack) {
                // Начало атаки
                this.baseUnderAttack = true;
                this.lastBaseAttackWarning = time;
                gameBridge.log('⚠ База под атакой!', 'danger', time);
            } else if (time - this.lastBaseAttackWarning > CONFIG.notifications.baseAttackCooldown) {
                // Атака продолжается — напоминаем
                this.lastBaseAttackWarning = time;
                gameBridge.log('⚠ База всё ещё под атакой!', 'danger', time);
            }
        } else if (this.baseUnderAttack) {
            // Атака отражена
            this.baseUnderAttack = false;
            gameBridge.log('Атака на базу отражена', 'success', time);
        }
    }
}
