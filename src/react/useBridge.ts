import { useSyncExternalStore } from 'react';
import { gameBridge } from '../ui/react/gameBridge';

function select<T>(selector: (s: ReturnType<typeof gameBridge.getSnapshot>) => T): T {
    return selector(gameBridge.getSnapshot());
}

export function useBridge<T>(selector: (s: ReturnType<typeof gameBridge.getSnapshot>) => T): T {
    return useSyncExternalStore(
        gameBridge.subscribe,
        () => select(selector),
        () => select(selector)
    );
}
