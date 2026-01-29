import type { Submission, Player } from '../../types/game';

interface Winner {
    odUid: string;
    votes: number;
    isRealOwner: boolean;
    pointsAwarded: number;
}

interface TVResultsProps {
    photo: Submission | null;
    realOwner?: Player;
    winners: Winner[];
    correctVoterCount: number;
    getPlayer: (id: string) => Player | undefined;
}

export default function TVResults({ photo, realOwner, winners, correctVoterCount, getPlayer }: TVResultsProps) {
    const blufferWon = winners.some(w => !w.isRealOwner);
    const realOwnerWon = winners.some(w => w.isRealOwner);

    let headline = "Truth!";
    if (blufferWon && !realOwnerWon) {
        headline = "Bluffed!";
    } else if (blufferWon && realOwnerWon) {
        headline = "It's a tie!";
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-8">
            {/* Result Title */}
            <h2 className="text-display text-5xl md:text-6xl text-retro-red mb-8 animate-fade-in-up">
                {headline}
            </h2>

            <div className="flex items-center gap-12">
                {/* Photo */}
                <div className="polaroid-frame" style={{ '--rotation': '-2deg', width: '280px' } as React.CSSProperties}>
                    {photo ? (
                        <img
                            src={photo.photoUrl}
                            alt="The photo"
                            className="w-full aspect-square object-cover"
                        />
                    ) : (
                        <div className="w-full aspect-square bg-faded-paper" />
                    )}
                </div>

                {/* Real Owner Reveal */}
                <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <p className="text-dark opacity-60 text-xl mb-4">This photo belongs to</p>

                    <div className="flex flex-col items-center">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-retro-green bg-faded-paper mb-4">
                            {realOwner?.selfieUrl ? (
                                <img
                                    src={realOwner.selfieUrl}
                                    alt={realOwner.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">
                                    👤
                                </div>
                            )}
                        </div>
                        <p className="text-display text-4xl text-retro-green">
                            {realOwner?.name || 'Unknown'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Points Awarded */}
            <div className="mt-10 text-center animate-fade-in-up space-y-2" style={{ animationDelay: '0.6s' }}>
                {winners.map(winner => {
                    const player = getPlayer(winner.odUid);
                    return (
                        <p key={winner.odUid} className="text-dark text-xl">
                            <span className="font-bold">{player?.name || 'Unknown'}</span>
                            {winner.isRealOwner ? '' : ' (bluffer)'} earns{' '}
                            <span className="text-retro-red font-bold">+{winner.pointsAwarded}</span>
                        </p>
                    );
                })}
                {correctVoterCount > 0 && (
                    <p className="text-retro-green text-lg mt-2">
                        {correctVoterCount} voter{correctVoterCount !== 1 ? 's' : ''} guessed correctly (+1 each)
                    </p>
                )}
            </div>
        </div>
    );
}
