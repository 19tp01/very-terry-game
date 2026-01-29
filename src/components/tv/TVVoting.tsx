import type { Submission, Player } from '../../types/game';
import PlayerAvatar from '../shared/PlayerAvatar';
import PolaroidPhoto from '../shared/PolaroidPhoto';
import StringLights from './StringLights';
import SleighTimer from './SleighTimer';

interface TVVotingProps {
    photo: Submission | null;
    presenters: Player[];
    votes: Record<string, string>;
    timer: { endsAt: number | null; duration: number | null } | null;
}

export default function TVVoting({ photo, presenters, votes, timer }: TVVotingProps) {


    // Count votes per presenter
    const voteCounts: Record<string, number> = {};
    presenters.forEach(p => { voteCounts[p.id] = 0; });
    Object.values(votes).forEach(votedFor => {
        if (voteCounts[votedFor] !== undefined) {
            voteCounts[votedFor]++;
        }
    });



    return (
        <div className="h-full flex flex-col p-8 relative overflow-hidden">
            {/* String Lights */}
            <StringLights position="top-left" />
            <StringLights position="top-right" />


            {/* Header */}
            <div className="text-center mb-12 relative z-10">
                <h2 className="text-display text-5xl md:text-6xl text-retro-green mb-8">
                    Who's telling the truth?
                </h2>

            </div>

            {/* Sleigh Timer */}
            <div className="w-full relative z-20">
                <SleighTimer timer={timer} />
            </div>

            <div className="flex-1 flex gap-12 items-start justify-center max-w-7xl mx-auto w-full relative z-10">
                {/* Photo (Left Side) */}
                <div className="flex-shrink-0 animate-polaroid-drop" style={{ '--rotation': '-3deg' } as React.CSSProperties}>
                    <PolaroidPhoto 
                        photo={photo} 
                        size="custom" 
                        customWidth="420px" 
                        rotation={-3} 
                    />
                </div>

                {/* Presenters Grid (Right Side) */}
                <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-12 justify-items-center content-center max-h-full overflow-y-auto p-4">
                    {presenters.map((presenter, index) => {
                        const count = voteCounts[presenter.id];
                        const isEven = index % 2 === 0;
                        
                        return (
                            <div 
                                key={presenter.id} 
                                className={`
                                    relative flex items-center gap-4 group transition-all duration-300 w-full max-w-[350px]
                                    ${isEven ? 'animate-slide-in-left' : 'animate-slide-in-right'}
                                    stagger-${Math.min(index + 1, 5)}
                                `}
                            >
                                {/* Avatar Container */}
                                <div className="relative flex-shrink-0 z-20">
                                    <PlayerAvatar 
                                        player={presenter} 
                                        size="2xl" 
                                        borderColor="green"
                                        className="transform group-hover:scale-105 transition-transform duration-300" 
                                    />
                                    
                                    {/* Vote Count Badge */}
                                    {count > 0 && (
                                        <div className="absolute -top-2 -right-2 w-12 h-12 bg-retro-red rounded-full flex items-center justify-center shadow-lg border-2 border-cream animate-bounce-in z-30">
                                            <span className="text-display text-2xl text-white transform -rotate-12">
                                                {count}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Player Name */}
                                <div className="bg-white/80 backdrop-blur-sm px-5 py-2 rounded-xl shadow-sm -ml-6 pt-2 pb-2 pl-9 border border-sage/20 flex-1 min-w-0 z-10 relative">
                                    <p className="font-semibold text-xl text-dark leading-snug break-words">
                                        {presenter.name}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
