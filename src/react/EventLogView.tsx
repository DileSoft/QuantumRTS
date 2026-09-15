import { useEffect, useRef } from 'react';
import { useBridge } from './useBridge';

export function EventLogView() {
    const log = useBridge(s => s.log);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [log]);

    return (
        <div id="event-log" ref={ref}>
            {log.map(e => (
                <div key={e.id} className={`event-log-entry event-log-${e.type}`}>
                    [{e.timeLabel}] {e.message}
                </div>
            ))}
        </div>
    );
}
