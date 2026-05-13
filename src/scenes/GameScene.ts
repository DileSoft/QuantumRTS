import 'phaser';
import { Unit } from '../entities/Unit';

export class GameScene extends Phaser.Scene {
    private units: Unit[] = [];
    private selectedUnits: Unit[] = [];

    constructor() {
        super('GameScene');
    }

    create() {
        // Background
        this.add.grid(
            window.innerWidth / 2, 
            window.innerHeight / 2, 
            window.innerWidth * 2, 
            window.innerHeight * 2, 
            64, 64, 0x333333
        ).setAltFillStyle(0x2a2a2a).setOutlineStyle();

        // UI Setup
        document.getElementById('spawn-blue')?.addEventListener('click', () => this.spawnUnit(1, 0x3498db));
        document.getElementById('spawn-red')?.addEventListener('click', () => this.spawnUnit(2, 0xe74c3c));

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
    }

    private spawnUnit(team: number, color: number) {
        const x = Phaser.Math.Between(100, window.innerWidth - 100);
        const y = Phaser.Math.Between(100, window.innerHeight - 100);
        
        const unit = new Unit({
            scene: this,
            x,
            y,
            team,
            color
        });

        this.units.push(unit);
    }

    private handleLeftClick(pointer: Phaser.Input.Pointer) {
        // Simple selection: find unit under pointer
        
        // Clear previous selection
        this.selectedUnits.forEach(u => u.setSelected(false));
        this.selectedUnits = [];

        for (const unit of this.units) {
            if (!unit.active) continue;
            
            const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, unit.x, unit.y);
            if (dist < 30) {
                unit.setSelected(true);
                this.selectedUnits.push(unit);
                break; // Select only one for now
            }
        }
    }

    private handleRightClick(pointer: Phaser.Input.Pointer) {
        this.selectedUnits.forEach(unit => {
            if (unit.active) {
                unit.setTargetPosition(pointer.x, pointer.y);
            }
        });
    }

    update(time: number, delta: number) {
        // Cleanup dead units
        this.units = this.units.filter(u => u.active);

        // Update each unit
        for (const unit of this.units) {
            unit.update(time, delta, this.units);
        }
    }
}
