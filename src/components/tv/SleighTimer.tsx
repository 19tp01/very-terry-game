import { useEffect, useState } from 'react';

const babySleigh = '/assets/baby_sleigh.png';

interface SleighTimerProps {
    timer: { endsAt: number | null; duration: number | null } | null;
}

export default function SleighTimer({ timer }: SleighTimerProps) {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!timer?.endsAt || !timer.duration) {
            setProgress(100);
            return;
        }

        const updateProgress = () => {
            const now = Date.now();
            const remaining = Math.max(0, timer.endsAt! - now);
            const total = timer.duration! * 1000;
            // Invert progress: 0% at start (full time), 100% at end (0 time)
            // Or typically timers go from full to empty. 
            // The request says "moves from one side to the other... tracks the progress".
            // Let's assume moving from Left (0%) to Right (100%) as time *passes*.
            const elapsed = total - remaining;
            const newProgress = Math.min(100, (elapsed / total) * 100);
            setProgress(newProgress);
        };

        const interval = setInterval(updateProgress, 16); // ~60fps
        updateProgress();

        return () => clearInterval(interval);
    }, [timer]);

    // Don't show if no timer
    if (!timer?.endsAt) return null;

    // Configuration
    const totalSparkles = 40;
    const amplitude = 30; // Height of the waves
    
    // Helper to calculate position on an irregular path
    // t goes from 0 (Start/Right) to 1 (End/Left)
    const getPosition = (t: number) => {
        // x: approaches from 100% (Right) to 0% (Left)
        const x = 100 - (t * 100);
        
        // y: Irregular path "ups and downs"
        // Base arc (parabola) + Sine wave
        const arcY = -4 * 20 * t * (1 - t); // Slight overarching curve
        const sineY = Math.sin(t * Math.PI * 4) * amplitude; // 2 full waves
        
        const y = arcY + sineY;
        
        // Calculate tangent angle for rotation?
        // derivative of sineY is cos(...) * ...
        // approximate rotation
        
        return { x, y };
    };

    const currentPos = getPosition(progress / 100);
    const rotation = Math.cos((progress / 100) * Math.PI * 4) * 5; 

    return (
        <div className="relative w-full h-48 pointer-events-none">
            {/* The Track (Sparkle Trail) */}
            <div className="absolute inset-0">
                {Array.from({ length: totalSparkles }).map((_, i) => {
                    const sparkleT = i / (totalSparkles - 1); // 0 to 1
                    const pos = getPosition(sparkleT);
                    
                    // Reveal logic: Trail is REVEALED as sleigh passes? 
                    // Or "leaves behind". Yes, revealed behind.
                    // Sleigh moves Right(t=0) to Left(t=1).
                    // So path from 0 to currentT is "future" (unrevealed)?
                    // Wait:
                    // Sleigh starts at t=0 (Right). Trail is empty.
                    // Sleigh moves to t=0.5. Trail from 0 to 0.5 should appear?
                    // User said "leaves behind a permanent trail".
                    // So yes, t <= progress/100 should be visible.
                    const isRevealed = sparkleT <= (progress / 100);

                    return (
                        <div 
                            key={i} 
                            className={`
                                absolute w-3 h-3 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2
                                ${isRevealed ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}
                            `}
                            style={{ 
                                left: `${pos.x}%`, 
                                top: `calc(50% + ${pos.y}px)` 
                            }}
                        >
                            <div className="w-full h-full bg-harvest-gold animate-pulse rounded-full shadow-[0_0_8px_2px_#D4A84B]" 
                                 style={{ animationDelay: `${i * 0.05}s` }} 
                            />
                        </div>
                    );
                })}
            </div>

            {/* The Sleigh */}
            <div 
                className="absolute w-80 h-80 transition-all duration-75 ease-linear z-10"
                style={{ 
                    left: `${currentPos.x}%`,
                    top: `calc(50% + ${currentPos.y}px - 1.5rem)`, // Closer to path
                    transform: `translateX(-50%) translateY(-50%) rotate(${rotation}deg)`,
                    
                }} 
            >
                <img 
                    src={babySleigh} 
                    alt="Sleigh Timer" 
                    className="w-full h-full object-contain"
                />
            </div>
        </div>
    );
}
