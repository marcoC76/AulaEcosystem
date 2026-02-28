import { useState, useEffect } from 'react';

export function LiveClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const timeString = time.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });

    const dateString = time.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    return (
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-900/50 border border-gray-700 backdrop-blur-sm animate-pulse-slow">
            <div className="text-xl font-mono font-bold tracking-wider text-emerald-400">
                {timeString}
            </div>
            <div className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-0.5">
                {dateString}
            </div>
        </div>
    );
}
