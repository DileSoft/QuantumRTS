import { CONFIG } from '../config';

/**
 * Экономика одной команды: кредиты + пассивный доход.
 * Доступ к инстансам команд — через GameScene.getEconomy(team).
 */
export class Economy {
    private credits: number;
    private readonly team: number;

    constructor(team: number, startCredits: number = CONFIG.startCredits) {
        this.team = team;
        this.credits = startCredits;
    }

    public getTeam(): number {
        return this.team;
    }

    public getCredits(): number {
        return Math.floor(this.credits);
    }

    /**
     * Пытается списать amount кредитов.
     * @returns true, если списание прошло; false — если не хватает.
     */
    public spend(amount: number): boolean {
        if (this.credits < amount) return false;
        this.credits -= amount;
        return true;
    }

    public add(amount: number): void {
        this.credits += amount;
    }

    /**
     * Пассивный доход. Вызывается из update() сцены.
     */
    public update(delta: number): void {
        this.credits += CONFIG.passiveIncomePerSec * (delta / 1000);
    }
}
