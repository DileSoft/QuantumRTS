import { CONFIG } from '../config';
import { gameBridge } from '../ui/react/gameBridge';
import { useBridge } from './useBridge';

export function Controls() {
    const selection = useBridge(s => s.selection);
    const affordability = useBridge(s => s.affordability);

    return (
        <div id="controls">
            {selection.hq && (
                <button
                    id="spawn-harvester"
                    disabled={!affordability.harvester}
                    style={{
                        opacity: affordability.harvester ? 1 : 0.5,
                        background: affordability.harvester ? '#444' : '#333',
                        borderColor: affordability.harvester ? '#666' : '#a33'
                    }}
                    onClick={() => gameBridge.callAction('spawnHarvester')}
                >
                    Spawn Harvester ({CONFIG.costs.harvester})
                </button>
            )}
            <button id="focus-base" onClick={() => gameBridge.callAction('focusBase')}>🎯 База</button>
            {selection.builder && (
                <button
                    id="build-btn"
                    disabled={!affordability.factory}
                    style={{
                        opacity: affordability.factory ? 1 : 0.5,
                        borderColor: affordability.factory ? '#666' : '#a33'
                    }}
                    onClick={() => gameBridge.callAction('build')}
                >
                    Build Factory ({CONFIG.costs.factory})
                </button>
            )}
            {selection.factory && (
                <button
                    id="produce-btn"
                    disabled={!affordability.tank}
                    style={{
                        opacity: affordability.tank ? 1 : 0.5,
                        borderColor: affordability.tank ? '#666' : '#a33'
                    }}
                    onClick={() => gameBridge.callAction('produce')}
                >
                    Produce Tank ({CONFIG.costs.tank})
                </button>
            )}
        </div>
    );
}
