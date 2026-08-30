import 'phaser';
import { BaseUnit } from '../entities/BaseUnit';
import { Factory } from '../entities/Factory';
import { HQ } from '../entities/HQ';
import { LaserTower } from '../entities/LaserTower';
import { Wall } from '../entities/Wall';
import { ResourceField } from '../entities/ResourceField';
import { ProbabilityCloud } from '../entities/ProbabilityCloud';

/**
 * Мини-карта: уменьшенная копия мира в правом нижнем углу.
 * - Рисует: жилы, облака, стены, юнитов, постройки, HQ, рамку обзора камеры.
 * - Клик/перетаскивание по мини-карте двигает камеру.
 */
export class Minimap {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private worldWidth: number;
    private worldHeight: number;

    private x: number;
    private y: number;
    private width: number;
    private height: number;

    private bg: Phaser.GameObjects.Rectangle;
    private viewRect: Phaser.GameObjects.Rectangle;
    private dots: Phaser.GameObjects.Rectangle[] = [];

    private onJump: (worldX: number, worldY: number) => void;

    constructor(
        scene: Phaser.Scene,
        worldWidth: number,
        worldHeight: number,
        onJump: (worldX: number, worldY: number) => void
    ) {
        this.scene = scene;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.onJump = onJump;

        this.width = 200;
        this.height = 200 * (worldHeight / worldWidth);

        this.x = window.innerWidth - this.width - 15;
        this.y = window.innerHeight - this.height - 15;

        this.container = scene.add.container(this.x, this.y).setDepth(5000).setScrollFactor(0);

        this.bg = scene.add.rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x111111, 0.9)
            .setStrokeStyle(1, 0x555555);
        this.container.add(this.bg);

        this.viewRect = scene.add.rectangle(this.width / 2, this.height / 2, 10, 10, 0xffffff, 0.2)
            .setStrokeStyle(1, 0x00ff00);
        this.container.add(this.viewRect);

        // Интерактивность убрана — клики обрабатывает GameScene глобально
        // через isInside() + handleClick() (надёжнее с прокручиваемой камерой).
    }

    /**
     * Обработка клика по мини-карте (вызывается GameScene).
     */
    public handleClick(sx: number, sy: number) {
        if (!this.isInside(sx, sy)) return;
        const localX = sx - this.x;
        const localY = sy - this.y;
        this.onJump((localX / this.width) * this.worldWidth, (localY / this.height) * this.worldHeight);
    }

    /**
     * Находится ли точка (в экранных координатах) внутри мини-карты.
     * Используется GameScene, чтобы игнорировать выделение/тултипы над мини-картой.
     */
    public isInside(sx: number, sy: number): boolean {
        return sx >= this.x && sx <= this.x + this.width &&
               sy >= this.y && sy <= this.y + this.height;
    }

    /**
     * Обновляем точки объектов и рамку обзора камеры.
     */
    public update(
        camera: Phaser.Cameras.Scene2D.Camera,
        units: BaseUnit[],
        factories: Factory[],
        hqs: HQ[],
        towers: LaserTower[],
        walls: Wall[],
        fields: ResourceField[],
        clouds: ProbabilityCloud[]
    ) {
        // Рамка обзора: где сейчас камера
        const camX = (camera.scrollX / this.worldWidth) * this.width;
        const camY = (camera.scrollY / this.worldHeight) * this.height;
        const camW = (camera.width / this.worldWidth) * this.width;
        const camH = (camera.height / this.worldHeight) * this.height;
        this.viewRect.setPosition(camX + camW / 2, camY + camH / 2);
        this.viewRect.setSize(camW, camH);

        // Точки объектов
        this.dots.forEach(d => d.destroy());
        this.dots = [];

        const addDot = (wx: number, wy: number, color: number, size: number = 2) => {
            if (wx < 0 || wy < 0 || wx > this.worldWidth || wy > this.worldHeight) return;
            const dx = (wx / this.worldWidth) * this.width;
            const dy = (wy / this.worldHeight) * this.height;
            const dot = this.scene.add.rectangle(dx, dy, size, size, color, 1);
            this.container.add(dot);
            this.dots.push(dot);
        };

        // Жилы ресурсов (жёлтые, крупные)
        for (const f of fields) if (f.active) addDot(f.x, f.y, 0xf1c40f, 5);
        // Облака вероятности (фиолетовые, крупные)
        for (const c of clouds) addDot(c.x, c.y, 0x9b59b6, 5);
        // Стены (серые)
        for (const w of walls) if (w.active) addDot(w.x, w.y, 0x7f8c8d, 2);
        // HQ (синие/красные, крупные)
        for (const hq of hqs) if (hq.active) addDot(hq.x, hq.y, hq.team === 1 ? 0x3498db : 0xe74c3c, 6);
        // Фабрики (по цвету команды)
        for (const f of factories) if (f.active) addDot(f.x, f.y, f.team === 1 ? 0x2980b9 : 0xc0392b, 3);
        // Башни (серые)
        for (const t of towers) if (t.active) addDot(t.x, t.y, 0x95a5a6, 3);
        // Юниты (по цвету команды)
        for (const u of units) if (u.active) addDot(u.x, u.y, u.team === 1 ? 0x3498db : 0xe74c3c, 2);
    }
}
