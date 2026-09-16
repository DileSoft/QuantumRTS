import { CreditsHud } from './CreditsHud';
import { Controls } from './Controls';
import { EventLogView } from './EventLogView';
import { GameOverOverlay } from './GameOverOverlay';
import { Instructions } from './Instructions';
import { useBridge } from './useBridge';
import './App.css';

export function App() {
    const hudVisible = useBridge(s => s.hudVisible);
    return (
        <>
            {hudVisible && (
                <>
                    <CreditsHud />
                    <EventLogView />
                    <div id="ui-layer">
                        <Controls />
                        <Instructions />
                    </div>
                </>
            )}
            <GameOverOverlay />
        </>
    );
}
