import { useState, useEffect } from 'react';
import type { Player } from '../../types/game';

interface Winner {
    odUid: string;
    votes: number;
    isRealOwner: boolean;
    pointsAwarded: number;
}

interface Results {
    realOwnerId: string;
    realOwnerVotes: number;
    winners: Winner[];
    correctVoters: string[];
    voterPointsAwarded: number;
}

interface TVScoreboardProps {
    players: Player[];
    results?: Results | null;
}

export default function TVScoreboard({ players, results }: TVScoreboardProps) {
    // Animation stages: 0 = show old scores, 1 = animate winners, 2 = animate voters
    const [stage, setStage] = useState(0);
    const [displayScores, setDisplayScores] = useState<Record<string, number>>({});
    const [showingBonus, setShowingBonus] = useState<Record<string, number>>({});

    // Calculate what the scores were BEFORE results were applied
    const previousScores: Record<string, number> = {};
    players.forEach(p => {
        let oldScore = p.score;
        // Subtract winner points if this player was a winner
        const winnerEntry = results?.winners?.find(w => w.odUid === p.id);
        if (winnerEntry) {
            oldScore -= winnerEntry.pointsAwarded;
        }
        // Subtract voter point if this player voted correctly
        if (results?.correctVoters?.includes(p.id)) {
            oldScore -= 1;
        }
        previousScores[p.id] = Math.max(0, oldScore);
    });

    // Initialize display scores on mount
    useEffect(() => {
        if (results) {
            // Start with previous scores
            setDisplayScores(previousScores);
            setStage(0);

            // Stage 1: Animate winner points after 1 second
            const timer1 = setTimeout(() => {
                setStage(1);
                const bonuses: Record<string, number> = {};
                results.winners?.forEach(w => {
                    bonuses[w.odUid] = w.pointsAwarded;
                });
                setShowingBonus(bonuses);

                // Update display scores for winners
                setDisplayScores(prev => {
                    const updated = { ...prev };
                    results.winners?.forEach(w => {
                        updated[w.odUid] = (prev[w.odUid] || 0) + w.pointsAwarded;
                    });
                    return updated;
                });
            }, 1000);

            // Stage 2: Animate voter points after 3 seconds
            const timer2 = setTimeout(() => {
                setStage(2);
                const bonuses: Record<string, number> = {};
                results.correctVoters?.forEach(id => {
                    bonuses[id] = 1;
                });
                setShowingBonus(bonuses);

                // Update display scores for voters
                setDisplayScores(prev => {
                    const updated = { ...prev };
                    results.correctVoters?.forEach(id => {
                        updated[id] = (prev[id] || 0) + 1;
                    });
                    return updated;
                });
            }, 3000);

            // Clear bonuses after animation
            const timer3 = setTimeout(() => {
                setShowingBonus({});
            }, 4500);

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        } else {
            // No results, just show current scores
            const scores: Record<string, number> = {};
            players.forEach(p => { scores[p.id] = p.score; });
            setDisplayScores(scores);
        }
    }, [results?.realOwnerId]); // Only re-run when results change

    // Sort by display scores for ranking
    const sortedPlayers = [...players].sort((a, b) =>
        (displayScores[b.id] || b.score) - (displayScores[a.id] || a.score)
    );

    const topScore = Math.max(...Object.values(displayScores), 1);

    return (
        <div className="h-full flex flex-col items-center justify-center p-8">
            {/* Title */}
            <h2 className="text-display text-5xl md:text-6xl text-retro-green mb-10">
                Scoreboard
            </h2>

            {/* Leaderboard */}
            <div className="w-full max-w-2xl space-y-4">
                {sortedPlayers.map((player, index) => {
                    const score = displayScores[player.id] ?? player.score;
                    const bonus = showingBonus[player.id];

                    return (
                        <div
                            key={player.id}
                            className="flex items-center gap-4 animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            {/* Rank */}
                            <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl
                                ${index === 0 ? 'bg-retro-red text-white' : 'bg-faded-paper text-dark'}
                            `}>
                                {index + 1}
                            </div>

                            {/* Avatar */}
                            <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white bg-faded-paper shrink-0 relative">
                                {player.selfieUrl ? (
                                    <img
                                        src={player.selfieUrl}
                                        alt={player.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-2xl">
                                        👤
                                    </div>
                                )}
                            </div>

                            {/* Name & Score Bar */}
                            <div className="flex-1 relative">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-dark text-lg">{player.name}</p>
                                    <div className="flex items-center gap-2">
                                        {/* Animated bonus popup */}
                                        {bonus && (
                                            <span
                                                className="text-retro-green font-bold text-xl animate-bounce-in"
                                                key={`${player.id}-${stage}`}
                                            >
                                                +{bonus}
                                            </span>
                                        )}
                                        <p className="text-display text-2xl text-retro-red transition-all duration-500">
                                            {score}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-4 bg-faded-paper rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-700 rounded-full ${index === 0 ? 'bg-retro-red' : 'bg-retro-green'}`}
                                        style={{ width: topScore > 0 ? `${(score / topScore) * 100}%` : '0%' }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}

                {players.length === 0 && (
                    <p className="text-center text-dark opacity-40 text-lg">
                        No scores yet
                    </p>
                )}
            </div>
        </div>
    );
}
