import { useBridge } from './useBridge';

export function CreditsHud() {
    const blue = useBridge(s => s.creditsBlue);
    const red = useBridge(s => s.creditsRed);
    return (
        <div id="credits-hud">🔵 {blue}   🔴 {red}</div>
    );
}
