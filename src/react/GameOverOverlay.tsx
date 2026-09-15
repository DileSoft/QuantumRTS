import { gameBridge } from '../ui/react/gameBridge';
import { useBridge } from './useBridge';

export function GameOverOverlay() {
    const gameOver = useBridge(s => s.gameOver);
    if (!gameOver) return null;

    return (
        <div id="game-over-overlay">
            <h1 style={{ fontSize: 64, marginBottom: 20 }}>{gameOver.message}</h1>
            <button
                id="restart-btn"
                style={{
                    padding: '15px 40px', fontSize: 24, cursor: 'pointer',
                    background: '#444', color: 'white', border: '2px solid #888', borderRadius: 8
                }}
                onClick={() => gameBridge.callAction('restart')}
            >
                Играть снова
            </button>
        </div>
    );
}
