import type { Submission, Player } from "../../types/game";
import { useTimer } from "../../hooks/useTimer";
import PlayerAvatar from "../shared/PlayerAvatar";
import PolaroidPhoto from "../shared/PolaroidPhoto";

// TVPhoto only handles these specific phases
type PhotoDisplayPhase = "photo" | "volunteering" | "pitches";

interface TVPhotoProps {
    photo: Submission | null;
    owner?: Player;
    phase: PhotoDisplayPhase;
    timer: { endsAt: number | null; duration: number | null } | null;
    presenters?: Player[];
}

export default function TVPhoto({ photo, phase, timer, presenters = [] }: TVPhotoProps) {
    const timeLeft = useTimer(timer);

    const phaseLabels: Record<PhotoDisplayPhase, { headline: string; subtitle?: string }> = {
        photo: { headline: "Whose photo is this?" },
        volunteering: {
            headline: "Whose photo is this?",
            subtitle: "Claim it if you think you can convince everyone!"
        },
        pitches: { headline: "Who took this photo?" },
    };
    const { headline: phaseLabel, subtitle: phaseSubtitle } = phaseLabels[phase];

    // Pitches phase: Grid layout (2 Left, Photo, 2 Right)
    if (phase === "pitches") {
        // Split presenters into left and right groups
        const midPoint = Math.ceil(presenters.length / 2);
        const leftPresenters = presenters.slice(0, midPoint);
        const rightPresenters = presenters.slice(midPoint);

        return (
            <div className="h-full flex flex-col items-center justify-center relative overflow-hidden p-8">
                
                {/* Title */}
                <h2 className="text-display text-5xl md:text-6xl text-retro-green mb-12 text-center animate-fade-in-up">
                    {phaseLabel}
                </h2>

                {/* Main Content Grid */}
                <div className="flex items-center justify-center gap-20 w-full max-w-[90vw]">
                    
                    {/* Left Presenters Column */}
                    <div className="flex flex-col gap-12 w-64 items-center animate-slide-in-left">
                        {leftPresenters.map((presenter) => (
                            <div key={presenter.id} className="flex flex-col items-center scale-110">
                                <PlayerAvatar
                                    player={presenter}
                                    size="3xl"
                                />
                                <div className="mt-[-1rem] bg-retro-green text-white px-4 py-2 rounded-md shadow-md whitespace-nowrap border border-white transform rotate-0 z-20">
                                    <span className="text-display text-xl tracking-wide">
                                        {presenter.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Central Content Stack (Photo) */}
                    <div className="flex flex-col items-center animate-bounce-in z-20">
                        <div className="relative transform hover:scale-105 transition-transform duration-500">
                            <PolaroidPhoto
                                photo={photo}
                                size="custom"
                                customWidth="420px"
                                customPadding="20px 20px 80px 20px"
                                rotation={0}
                                className="shadow-2xl"
                            />
                        </div>
                        
                        <p className="text-display text-3xl md:text-4xl text-retro-red mt-10 text-center animate-pulse whitespace-nowrap">
                            Time to make your pitch
                        </p>
                    </div>

                    {/* Right Presenters Column */}
                    <div className="flex flex-col gap-12 w-64 items-center animate-slide-in-right">
                         {rightPresenters.map((presenter) => (
                            <div key={presenter.id} className="flex flex-col items-center scale-110">
                                <PlayerAvatar
                                    player={presenter}
                                    size="3xl"
                                />
                                <div className="mt-[-1rem] bg-retro-green text-white px-4 py-2 rounded-md shadow-md whitespace-nowrap border border-white transform rotate-0 z-20">
                                    <span className="text-display text-xl tracking-wide">
                                        {presenter.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                 {/* Timer */}
                 {timeLeft !== null && timeLeft > 0 && (
                    <div className="absolute bottom-8 right-10 text-display text-6xl text-retro-red">
                        {timeLeft}
                    </div>
                )}
            </div>
        );
    }

    // Default layout for other phases
    return (
        <div className="h-full flex flex-col items-center justify-center p-8">
            {/* Phase Label */}
            <h2 className="text-display text-4xl md:text-5xl text-retro-green mb-2">
                {phaseLabel}
            </h2>
            {phaseSubtitle && (
                <p className="text-dark opacity-70 text-xl mb-8">{phaseSubtitle}</p>
            )}
            {!phaseSubtitle && <div className="mb-6" />}

            {/* Photo Display */}
            <PolaroidPhoto photo={photo} size="tv" rotation={0} className="mb-8" />

            {/* Timer */}
            {timeLeft !== null && timeLeft > 0 && (
                <div className="text-display text-6xl text-retro-red">{timeLeft}</div>
            )}
        </div>
    );
}
