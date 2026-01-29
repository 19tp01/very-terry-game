import { useSearchParams } from "react-router-dom";
import { useGameState } from "../hooks/useGameState";

export default function Finish() {
    const [searchParams] = useSearchParams();
    const roomCode = searchParams.get("room") || "VTRY";

    const { players, loading } = useGameState(roomCode);

    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const top3 = sortedPlayers.slice(0, 3);
    const runnersUp = sortedPlayers.slice(3);

    // Calculate Awards
    const mostEnthusiastic = [...players].sort(
        (a, b) => b.hasVolunteeredCount - a.hasVolunteeredCount
    )[0];

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <p className="text-display text-3xl text-retro-green">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Title */}
            <h1 className="text-display text-6xl text-retro-red mb-8 animate-fade-in-up uppercase tracking-widest">
                Final Results
            </h1>

            <div className="w-full max-w-7xl grid grid-cols-12 gap-8 h-[80vh] items-center">
                {/* LEFT COLUMN: The Podium (Col Span 8) */}
                <div className="col-span-8 flex items-end justify-center h-full pb-12 gap-4">
                    {/* 2nd Place */}
                    {top3[1] && (
                        <div
                            className="flex flex-col items-center animate-slide-in-left"
                            style={{ animationDelay: "0.2s" }}
                        >
                            <div className="mb-4 flex flex-col items-center">
                                <div className="scale-90">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300 shadow-lg">
                                        {top3[1].selfieUrl ? (
                                            <img
                                                src={top3[1].selfieUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-display text-2xl text-dark mt-2">
                                    {top3[1].name}
                                </p>
                                <p className="text-display text-3xl text-retro-red">
                                    {top3[1].score} pts
                                </p>
                            </div>
                            <div className="w-40 h-48 bg-gray-300 rounded-t-lg flex items-start justify-center pt-4 shadow-xl border-t-4 border-white/30">
                                <span className="text-display text-6xl text-gray-400 opacity-50">
                                    2
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 1st Place */}
                    {top3[0] && (
                        <div className="flex flex-col items-center z-10 animate-bounce-in">
                            <div className="mb-4 flex flex-col items-center">
                                <div className="scale-125">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-yellow-400 shadow-xl relative">
                                        {/* Crown Icon or similar could go here */}
                                        {top3[0].selfieUrl ? (
                                            <img
                                                src={top3[0].selfieUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-yellow-100" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-display text-4xl text-dark mt-4">
                                    {top3[0].name}
                                </p>
                                <p className="text-display text-5xl text-retro-red">
                                    {top3[0].score} pts
                                </p>
                            </div>
                            <div className="w-48 h-64 bg-yellow-400 rounded-t-lg flex items-start justify-center pt-4 shadow-2xl border-t-4 border-white/30 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                                <span className="text-display text-8xl text-yellow-600 opacity-50">
                                    1
                                </span>
                            </div>
                        </div>
                    )}

                    {/* 3rd Place */}
                    {top3[2] && (
                        <div
                            className="flex flex-col items-center animate-slide-in-right"
                            style={{ animationDelay: "0.4s" }}
                        >
                            <div className="mb-4 flex flex-col items-center">
                                <div className="scale-90">
                                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-amber-700 shadow-lg">
                                        {top3[2].selfieUrl ? (
                                            <img
                                                src={top3[2].selfieUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-amber-800" />
                                        )}
                                    </div>
                                </div>
                                <p className="text-display text-2xl text-dark mt-2">
                                    {top3[2].name}
                                </p>
                                <p className="text-display text-3xl text-retro-red">
                                    {top3[2].score} pts
                                </p>
                            </div>
                            <div className="w-40 h-32 bg-amber-700 rounded-t-lg flex items-start justify-center pt-4 shadow-xl border-t-4 border-white/30">
                                <span className="text-display text-6xl text-amber-900 opacity-50">
                                    3
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Runners Up & Awards (Col Span 4) */}
                <div className="col-span-4 flex flex-col h-full justify-between py-12">
                    {/* Runners Up List */}
                    <div className="bg-white/50 p-6 rounded-2xl shadow-sm backdrop-blur-sm max-h-[50vh] overflow-y-auto">
                        <div className="space-y-3">
                            {runnersUp.map((player, i) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-white/80 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-dark opacity-40 ml-2 w-6">
                                            #{i + 4}
                                        </span>
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                            {player.selfieUrl && (
                                                <img
                                                    src={player.selfieUrl}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <span className="font-semibold text-dark">
                                            {player.name}
                                        </span>
                                    </div>
                                    <span className="font-bold text-retro-red px-3">
                                        {player.score}
                                    </span>
                                </div>
                            ))}
                            {runnersUp.length === 0 && (
                                <p className="text-center opacity-40 italic">No other players</p>
                            )}
                        </div>
                    </div>

                    {/* Awards Section */}
                    <div className="mt-6">
                        <h3 className="text-display text-2xl text-retro-green mb-4 text-center">
                            Superlatives
                        </h3>
                        <div className="bg-white p-4 rounded-xl shadow-md border-2 border-retro-green/20 relative overflow-hidden transform rotate-1">
                            <div className="absolute top-0 right-0 p-2 opacity-10 text-retro-green">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                            </div>

                            <p className="text-center text-xs uppercase tracking-widest font-bold text-retro-green mb-2">
                                Most Enthusiastic
                            </p>

                            {mostEnthusiastic && mostEnthusiastic.hasVolunteeredCount > 0 ? (
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-retro-green shrink-0">
                                        {mostEnthusiastic.selfieUrl && (
                                            <img
                                                src={mostEnthusiastic.selfieUrl}
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-xl text-dark leading-tight">
                                            {mostEnthusiastic.name}
                                        </p>
                                        <p className="text-sm opacity-60">
                                            {mostEnthusiastic.hasVolunteeredCount} volunteerings
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center italic opacity-50 py-4">
                                    No volunteers yet!
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
