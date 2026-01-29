import type { Player } from '../../types/game';

interface TVLobbyProps {
    roomCode: string;
    players: Player[];
}

export default function TVLobby({ roomCode, players }: TVLobbyProps) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-8 relative">
            {/* Room Code - top right */}
            <div className="absolute top-6 right-8 text-right">
                <p className="text-dark/40 text-sm">ROOM CODE:</p>
                <p className="text-dark/60 text-lg font-semibold">{roomCode}</p>
            </div>

            {/* Baby image */}
            <img
                src="/assets/baby.png"
                alt=""
                className="w-32 h-32 md:w-40 md:h-40 object-contain mb-4"
            />

            {/* Title */}
            <h1 className="text-display text-7xl md:text-9xl text-retro-red mb-8">
                A Very Terry Recap
            </h1>

            {/* Join URL */}
            <div className="mb-12 text-center">
                <p className="text-dark opacity-60 text-xl mb-2">Join at</p>
                <p className="text-display text-5xl md:text-6xl text-retro-green">
                    terrypi.com/play
                </p>
            </div>

            {/* Players Grid */}
            <div className="w-full max-w-4xl">
                <p className="text-center text-dark opacity-60 mb-6">
                    {players.length} player{players.length !== 1 ? 's' : ''} joined
                </p>

                <div className="flex flex-wrap justify-center gap-4">
                    {players.map((player, index) => (
                        <div
                            key={player.id}
                            className="flex flex-col items-center animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.1}s` }}
                        >
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white bg-faded-paper">
                                {player.selfieUrl ? (
                                    <img
                                        src={player.selfieUrl}
                                        alt={player.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl">
                                        👤
                                    </div>
                                )}
                            </div>
                            <p className="mt-2 text-dark font-semibold text-sm md:text-base">
                                {player.name}
                            </p>
                        </div>
                    ))}
                </div>

                {players.length === 0 && (
                    <p className="text-center text-dark opacity-40 text-lg">
                        Waiting for players to join...
                    </p>
                )}
            </div>
        </div>
    );
}
