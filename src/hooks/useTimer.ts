import { useState, useEffect } from 'react';

interface Timer {
    endsAt: number | null;
    duration: number | null;
}

/**
 * Hook to track countdown timer state
 * @param timer - Timer object with endsAt timestamp
 * @returns timeLeft in seconds (null if no timer, 0 if ended)
 */
export function useTimer(timer: Timer | null): number | null {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!timer?.endsAt) {
            setTimeLeft(null);
            return;
        }

        const updateTimer = () => {
            const remaining = Math.max(0, Math.ceil((timer.endsAt! - Date.now()) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 500);
        return () => clearInterval(interval);
    }, [timer?.endsAt]);

    return timeLeft;
}
