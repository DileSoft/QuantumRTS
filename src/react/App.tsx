import { CreditsHud } from './CreditsHud';
import { Controls } from './Controls';
import { EventLogView } from './EventLogView';
import { GameOverOverlay } from './GameOverOverlay';
import { Instructions } from './Instructions';
import './App.css';

export function App() {
    return (
        <>
            <CreditsHud />
            <EventLogView />
            <div id="ui-layer">
                <Controls />
                <Instructions />
            </div>
            <GameOverOverlay />
        </>
    );
}
