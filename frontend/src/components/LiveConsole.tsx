import { useState, useEffect, useRef } from 'react';
import { cn } from '../lib/utils';

interface LiveConsoleProps {
    className?: string;
    logs?: string[];
}

const DEFAULT_LOGS = [
    "[SYSTEM]: Initializing Neural Net...",
    "[NETWORK]: Uplink established with Satellite-7.",
    "[AI]: Analyzing thermal variances in Sector 4.",
    "[WARN]: Temperature spike detected at 38.42N, 27.14E.",
    "[DB]: Syncing 24TB of geospatial data...",
    "[SYSTEM]: Optimizing predictive models.",
    "[AI]: Structural integrity analysis confirmed.",
    "[NETWORK]: Checked local station availability: 8/10 active.",
    "[SEC]: Encryption protocol updated to AES-256.",
    "[SYS]: Heartbeat signal received from drones."
];

export function LiveConsole({ className, logs = DEFAULT_LOGS }: LiveConsoleProps) {
    const [displayLogs, setDisplayLogs] = useState<string[]>([]);
    const [currentLogIndex, setCurrentLogIndex] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-typing simulator
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentLogIndex((prev) => (prev + 1) % logs.length);

            const timestamp = new Date().toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            });

            setDisplayLogs((prev) => {
                const newLog = `> ${timestamp} ${logs[currentLogIndex]}`;
                // Keep last 15 lines
                const updated = [...prev, newLog];
                if (updated.length > 15) updated.shift();
                return updated;
            });

        }, 2200); // New log every 2.2 seconds

        return () => clearInterval(interval);
    }, [currentLogIndex, logs]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [displayLogs]);

    return (
        <div className={cn("glass-panel rounded-xl overflow-hidden font-mono text-xs", className)}>
            {/* Terminal Header */}
            <div className="bg-black/60 px-4 py-2 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-white/50 text-[10px] uppercase tracking-wider">AI_Risk_Detection_Shell_v4.0</span>
                </div>
                <div className="text-green-500/70 text-[10px]">LIVE</div>
            </div>

            {/* Terminal Body */}
            <div
                ref={scrollRef}
                className="relative h-64 p-4 overflow-y-auto bg-black/80 space-y-1 text-green-500/90"
            >
                <div className="scanline absolute inset-0 z-10 opacity-20 pointer-events-none" />

                {displayLogs.map((log, i) => (
                    <div key={i} className="break-all opacity-80 hover:opacity-100 transition-opacity">
                        {log}
                    </div>
                ))}

                {/* Typing Cursor */}
                <div className="flex items-center gap-1 mt-2">
                    <span className="text-green-400">{">"}</span>
                    <span className="w-2 h-4 bg-green-500 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
