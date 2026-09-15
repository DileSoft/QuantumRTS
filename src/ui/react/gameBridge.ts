import { CONFIG } from '../../config';

/**
 * Тип записи в логе событий.
 */
export type EventLogType = 'info' | 'success' | 'warning' | 'danger';

export interface LogEntry {
    id: number;
    message: string;
    type: EventLogType;
    timeLabel: string;
}

export interface SelectionState {
    builder: boolean;
    factory: boolean;
    hq: boolean;
}

export interface AffordabilityState {
    harvester: boolean;
    factory: boolean;
    tank: boolean;
}

export interface GameOverState {
    winner: number;
    message: string;
}

export type BridgeActionName = 'spawnHarvester' | 'focusBase' | 'build' | 'produce' | 'restart';

interface BridgeSnapshot {
    creditsBlue: number;
    creditsRed: number;
    selection: SelectionState;
    affordability: AffordabilityState;
    log: LogEntry[];
    gameOver: GameOverState | null;
}

const initialSnapshot: BridgeSnapshot = {
    creditsBlue: CONFIG.startCredits,
    creditsRed: CONFIG.startCredits,
    selection: { builder: false, factory: false, hq: false },
    affordability: { harvester: false, factory: false, tank: false },
    log: [],
    gameOver: null
};

let snapshot: BridgeSnapshot = { ...initialSnapshot, selection: { ...initialSnapshot.selection }, affordability: { ...initialSnapshot.affordability }, log: [] };
let nextLogId = 1;

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
    listeners.forEach(l => l());
}

function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// --- Действия (регистрирует GameScene, вызывает React) ---
const actions = new Map<BridgeActionName, () => void>();

export const gameBridge = {
    subscribe(listener: Listener): () => void {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },

    getSnapshot(): BridgeSnapshot {
        return snapshot;
    },

    setCredits(blue: number, red: number) {
        if (snapshot.creditsBlue === blue && snapshot.creditsRed === red) return;
        snapshot = { ...snapshot, creditsBlue: blue, creditsRed: red };
        emit();
    },

    setSelection(selection: SelectionState) {
        const s = snapshot.selection;
        if (s.builder === selection.builder && s.factory === selection.factory && s.hq === selection.hq) return;
        snapshot = { ...snapshot, selection: { ...selection } };
        emit();
    },

    setAffordability(affordability: AffordabilityState) {
        const a = snapshot.affordability;
        if (a.harvester === affordability.harvester && a.factory === affordability.factory && a.tank === affordability.tank) return;
        snapshot = { ...snapshot, affordability: { ...affordability } };
        emit();
    },

    log(message: string, type: EventLogType = 'info', gameTime: number = 0) {
        const entry: LogEntry = { id: nextLogId++, message, type, timeLabel: formatTime(gameTime) };
        const log = [...snapshot.log, entry];
        while (log.length > CONFIG.notifications.maxEntries) {
            log.shift();
        }
        snapshot = { ...snapshot, log };
        emit();
    },

    clearLog() {
        if (snapshot.log.length === 0) return;
        snapshot = { ...snapshot, log: [] };
        emit();
    },

    setGameOver(state: GameOverState) {
        snapshot = { ...snapshot, gameOver: state };
        emit();
    },

    clearGameOver() {
        if (snapshot.gameOver === null) return;
        snapshot = { ...snapshot, gameOver: null };
        emit();
    },

    reset() {
        snapshot = { ...initialSnapshot, selection: { ...initialSnapshot.selection }, affordability: { ...initialSnapshot.affordability }, log: [] };
        emit();
    },

    registerAction(name: BridgeActionName, fn: () => void) {
        actions.set(name, fn);
    },

    unregisterAction(name: BridgeActionName) {
        actions.delete(name);
    },

    unregisterAllActions() {
        actions.clear();
    },

    callAction(name: BridgeActionName) {
        actions.get(name)?.();
    }
};
