import 'phaser';
import { BaseEntity } from '../entities/BaseEntity';
import { BaseUnit } from '../entities/BaseUnit';
import { TankUnit } from '../entities/TankUnit';
import { BuilderUnit } from '../entities/BuilderUnit';
import { ProbabilityCloud } from '../entities/ProbabilityCloud';
import { Factory } from '../entities/Factory';
import { HealObject } from '../entities/HealObject';
import { LaserTower } from '../entities/LaserTower';

export class GameScene extends Phaser.Scene {
    private unitGroup!: Phaser.Physics.Arcade.Group;
    private buildingGroup!: Phaser.Physics.Arcade.StaticGroup;
    private healGroup!: Phaser.Physics.Arcade.Group;
    private towerGroup!: Phaser.Physics.Arcade.StaticGroup;
    private selectedEntities: BaseEntity[] = [];
    private clouds: ProbabilityCloud[] = [];
    private lastHealSpawn: number = 0;
    private lastTowerSpawn: number = 0;
    private selectionRect!: Phaser.GameObjects.Rectangle;
    private isSelecting: boolean = false;
    private selectionStartPoint: Phaser.Math.Vector2 = new Phaser.Math.Vector2();

    constructor() {
        super('GameScene');
    }

    create() {
        // Groups for physics
        this.unitGroup = this.physics.add.group({
            bounceX: 0.5,
            bounceY: 0.5,
            collideWorldBounds: true
        });
        this.buildingGroup = this.physics.add.staticGroup();
        this.healGroup = this.physics.add.group();
        this.towerGroup = this.physics.add.staticGroup();
        // Background
        this.add.grid(
            window.innerWidth / 2, 
            window.innerHeight / 2, 
            window.innerWidth * 2, 
            window.innerHeight * 2, 
            64, 64, 0x333333
        ).setAltFillStyle(0x2a2a2a).setOutlineStyle();

        // UI Setup
        document.getElementById('spawn-blue')?.addEventListener('click', () => this.spawnTank(null, null, 1, 0x3498db));
        document.getElementById('spawn-red')?.addEventListener('click', () => this.spawnTank(null, null, 2, 0xe74c3c));
        
        // Build button
        const buildBtn = document.createElement('button');
        buildBtn.id = 'build-btn';
        buildBtn.innerText = 'Build Factory (Select Builder)';
        buildBtn.style.display = 'none';
        document.getElementById('controls')?.appendChild(buildBtn);
        buildBtn.addEventListener('click', () => {
            this.selectedEntities.forEach(e => {
                if (e instanceof BuilderUnit) e.build();
            });
        });

        // Produce Tank button
        const produceBtn = document.createElement('button');
        produceBtn.id = 'produce-btn';
        produceBtn.innerText = 'Produce Tank (Select Factory)';
        produceBtn.style.display = 'none';
        document.getElementById('controls')?.appendChild(produceBtn);
        produceBtn.addEventListener('click', () => {
            this.selectedEntities.forEach(e => {
                if (e instanceof Factory) e.startProduction();
            });
        });

        // Initial Builders
        this.spawnBuilder(200, 300, 1, 0x3498db);
        this.spawnBuilder(window.innerWidth - 200, 300, 2, 0xe74c3c);

        // Create Probability Clouds
        for (let i = 0; i < 4; i++) {
            this.clouds.push(new ProbabilityCloud(this));
        }

        // Selection Rectangle
        this.selectionRect = this.add.rectangle(0, 0, 0, 0, 0x00ff00, 0.2);
        this.selectionRect.setStrokeStyle(1, 0x00ff00);
        this.selectionRect.setOrigin(0, 0);
        this.selectionRect.setVisible(false);
        this.selectionRect.setDepth(1000);

        // Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.isSelecting = true;
                this.selectionStartPoint.set(pointer.x, pointer.y);
                this.selectionRect.setPosition(pointer.x, pointer.y);
                this.selectionRect.setSize(0, 0);
                this.selectionRect.setVisible(true);
            } else if (pointer.rightButtonDown()) {
                this.handleRightClick(pointer);
            }
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isSelecting) {
                const width = pointer.x - this.selectionStartPoint.x;
                const height = pointer.y - this.selectionStartPoint.y;
                this.selectionRect.setSize(width, height);
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonReleased()) {
                if (this.isSelecting) {
                    this.handleSelection(pointer);
                    this.isSelecting = false;
                    this.selectionRect.setVisible(false);
                }
            }
        });

        // Prevent context menu on right click
        this.input.mouse?.disableContextMenu();

        // Collision Setup (using groups for continuous tracking)
        this.physics.add.collider(this.unitGroup, this.unitGroup);
        this.physics.add.collider(this.unitGroup, this.buildingGroup);
        this.physics.add.collider(this.unitGroup, this.towerGroup);
        this.physics.add.collider(this.towerGroup, this.towerGroup);
        this.physics.add.collider(this.buildingGroup, this.towerGroup);

        this.physics.add.overlap(this.unitGroup, this.healGroup, (unit, heal) => {
            const h = heal as HealObject;
            const u = unit as BaseUnit;
            if (h.isHealing) {
                u.heal(10); // Use new heal function
            } else {
                u.takeDamage(5); // Damage 5 in cloud
            }
            h.destroy();
        });
    }

    private spawnTank(x: number | null, y: number | null, team: number, color: number) {
        let actualX = x ?? Phaser.Math.Between(100, window.innerWidth - 100);
        let actualY = y ?? Phaser.Math.Between(100, window.innerHeight - 100);

        const tank = new TankUnit({
            scene: this,
            x: actualX,
            y: actualY,
            team,
            color
        });
        this.unitGroup.add(tank);
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
        this.unitGroup.add(builder);
    }

    private createFactory(x: number, y: number, team: number, color: number) {
        const factory = new Factory({
            scene: this,
            x,
            y,
            team,
            color,
            onSpawnUnit: (ux, uy, ut, uc) => this.spawnTank(ux, uy, ut, uc)
        });
        this.buildingGroup.add(factory);
    }

    private handleSelection(pointer: Phaser.Input.Pointer) {
        // Clear previous selection
        this.selectedEntities.forEach(e => e.setSelected(false));
        this.selectedEntities = [];

        const x1 = Math.min(this.selectionStartPoint.x, pointer.x);
        const y1 = Math.min(this.selectionStartPoint.y, pointer.y);
        const x2 = Math.max(this.selectionStartPoint.x, pointer.x);
        const y2 = Math.max(this.selectionStartPoint.y, pointer.y);
        
        const selectionRect = new Phaser.Geom.Rectangle(x1, y1, x2 - x1, y2 - y1);
        const isSingleClick = selectionRect.width < 5 && selectionRect.height < 5;

        // Check units
        this.unitGroup.getChildren().forEach(obj => {
            const unit = obj as BaseUnit;
            if (!unit.active) return;
            
            if (isSingleClick) {
                if (Phaser.Math.Distance.Between(pointer.x, pointer.y, unit.x, unit.y) < 40) {
                    this.selectedEntities.push(unit);
                }
            } else {
                if (selectionRect.contains(unit.x, unit.y)) {
                    this.selectedEntities.push(unit);
                }
            }
        });

        // Check buildings (only if no units selected or it was a click)
        if (this.selectedEntities.length === 0 || isSingleClick) {
            this.buildingGroup.getChildren().forEach(obj => {
                const b = obj as Factory;
                if (!b.active) return;
                
                if (isSingleClick) {
                    if (Phaser.Math.Distance.Between(pointer.x, pointer.y, b.x, b.y) < 50) {
                        this.selectedEntities.push(b);
                    }
                } else {
                    if (selectionRect.contains(b.x, b.y)) {
                        this.selectedEntities.push(b);
                    }
                }
            });
        }

        this.selectedEntities.forEach(e => e.setSelected(true));

        // Show/Hide build button if builder is selected
        const builderSelected = this.selectedEntities.some(e => e instanceof BuilderUnit);
        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) buildBtn.style.display = builderSelected ? 'inline-block' : 'none';

        // Show/Hide produce button if factory is selected
        const factorySelected = this.selectedEntities.some(e => e instanceof Factory);
        const produceBtn = document.getElementById('produce-btn');
        if (produceBtn) produceBtn.style.display = factorySelected ? 'inline-block' : 'none';
    }

    private handleRightClick(pointer: Phaser.Input.Pointer) {
        this.selectedEntities.forEach(entity => {
            if (entity instanceof BaseUnit && entity.active) {
                entity.setTargetPosition(pointer.x, pointer.y);
            }
        });
    }

    update(time: number, delta: number) {
        // Spawn heal objects
        if (time > this.lastHealSpawn + 1000) {
            this.lastHealSpawn = time;
            
            // Random position
            const rx = Phaser.Math.Between(50, window.innerWidth - 50);
            const ry = Phaser.Math.Between(50, window.innerHeight - 50);
            
            // Check if cloud is over spawn point to increase probability
            const cloudOverSpawn = this.clouds.some(c => c.isOverlapping(rx, ry));
            const chance = cloudOverSpawn ? 20 : 5; // 20% if in cloud, 5% normally
            
            if (Phaser.Math.Between(1, 100) <= chance) {
                const heal = new HealObject(this, rx, ry);
                this.healGroup.add(heal);
            }
        }

        // Spawn laser towers
        if (time > this.lastTowerSpawn + 5000) { // Every 5 seconds check
            this.lastTowerSpawn = time;
            const rx = Phaser.Math.Between(100, window.innerWidth - 100);
            const ry = Phaser.Math.Between(100, window.innerHeight - 100);
            
            // Check cloud influence
            const cloudOverSpawn = this.clouds.some(c => c.isOverlapping(rx, ry));
            const chance = cloudOverSpawn ? 40 : 15; // Higher chance in clouds
            
            if (Phaser.Math.Between(1, 100) <= chance) {
                const tower = new LaserTower(this, rx, ry);
                this.towerGroup.add(tower);
            }
        }

        // Update heal objects visuals
        this.healGroup.getChildren().forEach(obj => {
            const h = obj as HealObject;
            const inCloud = this.clouds.some(c => c.isOverlapping(h.x, h.y));
            h.updateVisuals(inCloud);
        });

        // Cleanup dead entities (Phaser groups handle some of this, but we need lists for logic)
        const units = this.unitGroup.getChildren() as BaseUnit[];
        const buildings = this.buildingGroup.getChildren() as Factory[];
        const towers = this.towerGroup.getChildren() as LaserTower[];

        const allEntities: BaseEntity[] = [...units, ...buildings, ...towers];

        // Update each unit
        for (const unit of units) {
            const inCloud = this.clouds.some(cloud => cloud.isOverlapping(unit.x, unit.y));
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

        // Update buildings
        for (const building of buildings) {
            const inCloud = this.clouds.some(cloud => cloud.isOverlapping(building.x, building.y));
            building.setCloudEffect(inCloud);
            building.update(time, inCloud);
        }

        // Update towers
        for (const tower of towers) {
            if (!tower.active) continue;
            const inCloud = this.clouds.some(cloud => cloud.isOverlapping(tower.x, tower.y));
            tower.setCloudEffect(inCloud);
            tower.update(time, allEntities, inCloud);
        }
    }
}
