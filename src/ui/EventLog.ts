import { CONFIG } from '../config';

/**
 * Тип записи в логе событий.
 */
export type EventLogType = 'info' | 'success' | 'warning' | 'danger';

/**
 * Лог игровых событий (DOM-панель поверх канваса).
 * Хранит последние N записей с игровым временем, автоскролл вниз.
 */
export class EventLog {
    private container: HTMLElement | null;
    private entries: number = 0;

    constructor() {
        this.container = document.getElementById('event-log');
    }

    /**
     * Добавить запись в лог.
     * @param message текст события
     * @param type тип (цвет) записи
     * @param gameTime игровое время в мс (для метки)
     */
    public log(message: string, type: EventLogType = 'info', gameTime: number = 0) {
        if (!this.container) return;

        const maxEntries = CONFIG.notifications.maxEntries;

        const entry = document.createElement('div');
        entry.className = `event-log-entry event-log-${type}`;

        const timeLabel = this.formatTime(gameTime);
        entry.textContent = `[${timeLabel}] ${message}`;

        this.container.appendChild(entry);
        this.entries++;

        // Удаляем старые записи сверх лимита
        while (this.entries > maxEntries && this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
            this.entries--;
        }

        // Автоскролл вниз
        this.container.scrollTop = this.container.scrollHeight;
    }

    /**
     * Очистить лог (при рестарте сцены).
     */
    public clear() {
        if (!this.container) return;
        this.container.innerHTML = '';
        this.entries = 0;
    }

    private formatTime(ms: number): string {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}
