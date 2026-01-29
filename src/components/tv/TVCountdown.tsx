import { useTimer } from '../../hooks/useTimer';

interface TVCountdownProps {
    timer: { endsAt: number | null; duration: number | null } | null;
}

export default function TVCountdown({ timer }: TVCountdownProps) {
    const timeLeft = useTimer(timer);

    // Show nothing if timer hasn't started
    if (timeLeft === null) {
        return (
            <div className="h-full flex items-center justify-center bg-cream">
                <p className="text-display text-4xl text-dark opacity-50">Get ready...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center bg-cream relative overflow-hidden">
            {/* Animated background pulse */}
            <div
                className="absolute inset-0 bg-retro-red/10 animate-pulse"
                style={{ animationDuration: '1s' }}
            />

            {/* Countdown number */}
            <div
                key={timeLeft}
                className="relative z-10 animate-bounce-in"
            >
                {timeLeft > 0 ? (
                    <span className="text-display text-[20rem] leading-none text-retro-red drop-shadow-2xl">
                        {timeLeft}
                    </span>
                ) : (
                    <span className="text-display text-9xl text-retro-green animate-pulse">
                        GO!
                    </span>
                )}
            </div>

            {/* Label */}
            <p className="relative z-10 text-display text-3xl text-dark/50 mt-8">
                {timeLeft > 0 ? 'Next photo in...' : ''}
            </p>
        </div>
    );
}
