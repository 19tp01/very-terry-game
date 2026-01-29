interface StringLightsProps {
    position?: 'top-left' | 'top-right';
    className?: string; // Add className prop
}

export default function StringLights({ position = 'top-left', className = '' }: StringLightsProps) {
    const isLeft = position === 'top-left';
    
    // Increased size and fixed path to connect to top at both ends
    const width = 500;
    const height = 120;
    
    // Path coordinates
    const pathD = isLeft 
        ? `M0,0 Q250,100 ${width},0` // Left corner to mid-top
        : `M${width},0 Q250,100 0,0`; // Right corner to mid-top (mirrored logic)

    // More bulbs, bigger size
    const bulbCount = 8;
    const bulbs = Array.from({ length: bulbCount }).map((_, i) => {
        // ... existing logic ...
        // t goes from 0.1 to 0.9 to avoid corners
        const t = (i + 1) / (bulbCount + 1);
        const x = isLeft ? t * width : width - (t * width);
        
        // Quadratic bezier y = (1-t)^2 * y0 + 2(1-t)t * y1 + t^2 * y2
        // y0=0, y1=100, y2=0
        const y = 2 * (1 - t) * t * 100;
        
        // Colors cycle
        const colors = ['bg-retro-red', 'bg-retro-green', 'bg-harvest-gold', 'bg-retro-red', 'bg-retro-green', 'bg-harvest-gold'];
        const color = colors[i % colors.length];
        
        return { x, y, color };
    });

    return (
        <div className={`absolute top-0 ${isLeft ? 'left-0' : 'right-0'} z-20 pointer-events-none ${className}`}>
            <svg 
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-auto"
            >
                {/* The Wire */}
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="#2D3A2E" 
                    strokeWidth="3"
                    strokeLinecap="round"
                />
                
                {/* The Bulbs */}
                {bulbs.map((bulb, i) => (
                    <g key={i} className={`animate-warm-pulse`} style={{ animationDelay: `${i * 0.15}s` }}>
                        {/* Bulb Socket */}
                        <rect 
                            x={bulb.x - 4} 
                            y={bulb.y} 
                            width="8" 
                            height="8" 
                            fill="#1a1a1a" 
                            rx="1"
                        />
                        {/* Bulb Glass */}
                        <circle 
                            cx={bulb.x} 
                            cy={bulb.y + 10} 
                            r="10" 
                            className={bulb.color === 'bg-harvest-gold' ? 'fill-[#D4A84B]' : bulb.color === 'bg-retro-red' ? 'fill-[#D95B43]' : 'fill-[#6A8E4E]'}
                        />
                         {/* Glow effect */}
                        <circle 
                            cx={bulb.x} 
                            cy={bulb.y + 10} 
                            r="16" 
                            fill="white"
                            className="opacity-30 mix-blend-overlay"
                        />
                    </g>
                ))}
            </svg>
        </div>
    );
}
