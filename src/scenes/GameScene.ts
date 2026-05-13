import 'phaser';
import { BaseEntity } from '../entities/BaseEntity';
import { BaseUnit } from '../entities/BaseUnit';
import { TankUnit } from '../entities/TankUnit';
import { BuilderUnit } from '../entities/BuilderUnit';
import { ProbabilityCloud } from '../entities/ProbabilityCloud';
import { Factory } from '../entities/Factory';

export class GameScene extends Phaser.Scene {
    private unitGroup!: Phaser.Physics.Arcade.Group;
    private buildingGroup!: Phaser.Physics.Arcade.StaticGroup;
    private selectedEntities: BaseEntity[] = [];
    private clouds: ProbabilityCloud[] = [];

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

        // Input
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.handleLeftClick(pointer);
            } else if (pointer.rightButtonDown()) {
                this.handleRightClick(pointer);
            }
        });

        // Prevent context menu on right click
        this.input.mouse?.disableContextMenu();

        // Collision Setup (using groups for continuous tracking)
        this.physics.add.collider(this.unitGroup, this.unitGroup);
        this.physics.add.collider(this.unitGroup, this.buildingGroup);
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

    private handleLeftClick(pointer: Phaser.Input.Pointer) {
        // Clear previous selection
        this.selectedEntities.forEach(e => e.setSelected(false));
        this.selectedEntities = [];

        // Check units
        this.unitGroup.getChildren().forEach(obj => {
            const unit = obj as BaseUnit;
            if (!unit.active) return;
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, unit.x, unit.y);
            if (dist < 40) {
                unit.setSelected(true);
                this.selectedEntities.push(unit);
            }
        });

        // Check buildings
        this.buildingGroup.getChildren().forEach(obj => {
            const b = obj as Factory;
            if (!b.active) return;
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, b.x, b.y);
            if (dist < 50) {
                b.setSelected(true);
                this.selectedEntities.push(b);
            }
        });

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
        // Cleanup dead entities (Phaser groups handle some of this, but we need lists for logic)
        const units = this.unitGroup.getChildren() as BaseUnit[];
        const buildings = this.buildingGroup.getChildren() as Factory[];

        const allEntities: BaseEntity[] = [...units, ...buildings];

        // Update each unit
        for (const unit of units) {
            const inCloud = this.clouds.some(cloud => cloud.isOverlapping(unit.x, unit.y));
            if (unit instanceof TankUnit) {
                unit.update(time, delta, allEntities, inCloud);
            } else {
                unit.update(time, delta);
            }
        }

        // Update buildings
        for (const building of buildings) {
            const inCloud = this.clouds.some(cloud => cloud.isOverlapping(building.x, building.y));
            building.update(time, inCloud);
        }
    }
}
