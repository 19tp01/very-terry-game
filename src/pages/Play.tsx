import { useSearchParams } from "react-router-dom";
import { useGameState } from "../hooks/useGameState";
import { ref, update, remove } from "firebase/database";
import { db } from "../lib/firebase";
import { useEffect, useState } from "react";
import { useTimer } from "../hooks/useTimer";

export default function Play() {
    const [searchParams, setSearchParams] = useSearchParams();
    const roomCodeFromUrl = searchParams.get("room");

    const [roomCode, setRoomCode] = useState<string>(roomCodeFromUrl || "");
    const [joinedRoom, setJoinedRoom] = useState<string | null>(roomCodeFromUrl || null);
    const [playerId, setPlayerId] = useState<string | null>(null);
    const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [showRoomInput, setShowRoomInput] = useState(!roomCodeFromUrl);

    const { game, players, currentPhoto, getPlayer, leaderboard, loading } = useGameState(
        joinedRoom || "NONE"
    );
    const timeLeft = useTimer(game.timer);

    // Check localStorage for existing player session
    useEffect(() => {
        if (roomCodeFromUrl) {
            const stored = localStorage.getItem(`player_${roomCodeFromUrl}`);
            if (stored) {
                setPlayerId(stored);
                setJoinedRoom(roomCodeFromUrl);
            }
        }
    }, [roomCodeFromUrl]);

    // Mark player as online when joining, offline when leaving
    useEffect(() => {
        if (!joinedRoom || !playerId) return;

        // Mark online
        update(ref(db, `rooms/${joinedRoom}/players/${playerId}`), {
            isOnline: true,
        });

        // Mark offline on page close
        const handleUnload = () => {
            update(ref(db, `rooms/${joinedRoom}/players/${playerId}`), {
                isOnline: false,
            });
        };

        window.addEventListener("beforeunload", handleUnload);
        return () => {
            window.removeEventListener("beforeunload", handleUnload);
            handleUnload();
        };
    }, [joinedRoom, playerId]);

    // Enter room code to see player list
    const enterRoom = () => {
        if (!roomCode.trim()) return;
        const upperRoomCode = roomCode.toUpperCase().trim();
        setJoinedRoom(upperRoomCode);
        setSearchParams({ room: upperRoomCode });
        setShowRoomInput(false);
    };

    // Select a player to join as
    const selectPlayer = async (selectedPlayerId: string) => {
        if (!joinedRoom) return;

        const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
        if (!selectedPlayer) return;

        // Check if player is already online
        if (selectedPlayer.isOnline) {
            alert("This player is already connected on another device!");
            return;
        }

        setIsJoining(true);
        try {
            // Mark as online
            await update(ref(db, `rooms/${joinedRoom}/players/${selectedPlayerId}`), {
                isOnline: true,
            });

            setPlayerId(selectedPlayerId);
            localStorage.setItem(`player_${joinedRoom}`, selectedPlayerId);
        } catch (error) {
            console.error("Error joining as player:", error);
        } finally {
            setIsJoining(false);
        }
    };

    const player = playerId ? getPlayer(playerId) : null;
    const isPresenter = game.selectedPresenters.includes(playerId || "");
    const hasVolunteered = playerId ? !!game.volunteers[playerId] : false;
    const hasVoted = playerId ? !!game.votes[playerId] : false;

    // Actions
    const volunteer = async () => {
        if (!playerId) return;
        await update(ref(db, `rooms/${roomCode}/game/volunteers`), {
            [playerId]: true,
        });
    };

    const unvolunteer = async () => {
        if (!playerId) return;
        await remove(ref(db, `rooms/${roomCode}/game/volunteers/${playerId}`));
    };

    const vote = async (votedForId: string) => {
        if (!playerId) return;
        await update(ref(db, `rooms/${roomCode}/game/votes`), {
            [playerId]: votedForId,
        });
    };

    // Step 1: Enter room code
    if (showRoomInput || !joinedRoom) {
        return (
            <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
                <h1 className="text-display text-5xl text-retro-red mb-2">A Very Terry Recap</h1>
                <p className="text-dark opacity-60 mb-8">Enter the room code to join</p>

                <div className="w-full max-w-xs space-y-4">
                    <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="ROOM CODE"
                        className="input-field text-center text-2xl uppercase tracking-widest"
                        maxLength={10}
                        onKeyDown={(e) => e.key === "Enter" && enterRoom()}
                        autoFocus
                    />

                    <button
                        onClick={enterRoom}
                        disabled={!roomCode.trim()}
                        className="w-full btn btn-primary disabled:opacity-50"
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Select your player from the list
    if (!playerId) {
        // Filter to only players with selfies (who have submitted)
        const availablePlayers = players.filter((p) => p.selfieUrl);
        const selectedPlayer = selectedPlayerId
            ? players.find((p) => p.id === selectedPlayerId)
            : null;

        return (
            <div className="h-screen bg-cream flex flex-col">
                {/* Fixed Header */}
                <div className="flex-shrink-0 bg-cream pt-[calc(24px+env(safe-area-inset-top))] pb-4 px-6 border-b border-sage/20">
                    <h1 className="text-display text-4xl text-retro-red text-center">
                        A Very Terry Recap
                    </h1>
                    <p className="text-dark opacity-60 text-center mt-1">Room: {joinedRoom}</p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-display text-2xl text-retro-green">
                                Loading players...
                            </p>
                        </div>
                    ) : availablePlayers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <p className="text-dark opacity-60 mb-4">
                                No players have submitted photos yet.
                            </p>
                            <a href={`/submit?room=${joinedRoom}`} className="btn btn-secondary">
                                Submit Photos
                            </a>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-display text-2xl text-dark text-center mb-4">
                                Who are you?
                            </h2>
                            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto pb-4">
                                {/* New Player Button */}
                                <a
                                    href={`/submit?room=${joinedRoom}`}
                                    className="relative p-4 rounded-xl transition-all bg-white border-2 border-dashed border-retro-green hover:bg-retro-green/10 active:scale-95"
                                >
                                    <div className="w-16 h-16 mx-auto rounded-full mb-2 bg-retro-green/20 flex items-center justify-center">
                                        <span className="text-3xl text-retro-green font-bold">
                                            +
                                        </span>
                                    </div>
                                    <p className="font-semibold text-sm text-retro-green text-center">
                                        New Player
                                    </p>
                                </a>
                                {availablePlayers.map((p) => {
                                    const isSelected = selectedPlayerId === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setSelectedPlayerId(p.id)}
                                            disabled={p.isOnline}
                                            className={`relative p-4 rounded-xl transition-all ${
                                                p.isOnline
                                                    ? "bg-faded-paper opacity-50 cursor-not-allowed"
                                                    : isSelected
                                                    ? "bg-retro-green/10 border-2 border-retro-green scale-[1.02]"
                                                    : "bg-white border-2 border-sage/30 active:scale-95"
                                            }`}
                                        >
                                            <div
                                                className={`w-16 h-16 mx-auto rounded-full overflow-hidden mb-2 shadow-sm ${
                                                    isSelected
                                                        ? "border-4 border-retro-green"
                                                        : "border-3 border-white"
                                                }`}
                                            >
                                                <img
                                                    src={p.selfieUrl}
                                                    alt={p.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <p
                                                className={`font-semibold text-sm ${
                                                    isSelected ? "text-retro-green" : "text-dark"
                                                }`}
                                            >
                                                {p.name}
                                            </p>
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-retro-green text-white rounded-full flex items-center justify-center text-sm">
                                                    ✓
                                                </div>
                                            )}
                                            {p.isOnline && (
                                                <div className="absolute top-2 right-2 bg-sage text-white text-xs px-2 py-0.5 rounded-full">
                                                    Online
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Sticky Footer */}
                <div className="flex-shrink-0 bg-white border-t border-sage/20 p-4 pb-8 safe-area-bottom">
                    {selectedPlayer ? (
                        <button
                            onClick={() => selectPlayer(selectedPlayer.id)}
                            disabled={isJoining}
                            className="w-full btn btn-primary py-4 text-lg disabled:opacity-50"
                        >
                            {isJoining ? "Joining..." : `Join as ${selectedPlayer.name}`}
                        </button>
                    ) : (
                        <p className="text-center text-dark opacity-50 py-2">
                            Select yourself above to join
                        </p>
                    )}
                    <button
                        onClick={() => setShowRoomInput(true)}
                        className="w-full mt-3 py-2 text-dark opacity-60 hover:opacity-100 text-sm transition-opacity"
                    >
                        ← Different Room
                    </button>
                </div>
            </div>
        );
    }

    // Show loading while fetching room data
    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <p className="text-display text-3xl text-retro-green">Loading...</p>
            </div>
        );
    }

    // If player not found (stale localStorage), clear and show join form
    if (!player) {
        localStorage.removeItem(`player_${joinedRoom}`);
        setPlayerId(null);
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <p className="text-display text-3xl text-retro-green">Reconnecting...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white border-b border-sage/20 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-faded-paper">
                        {player.selfieUrl ? (
                            <img
                                src={player.selfieUrl}
                                alt=""
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">👤</div>
                        )}
                    </div>
                    <div>
                        <p className="font-semibold text-dark">{player.name}</p>
                        <p className="text-xs text-dark opacity-60">Room: {roomCode}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-display text-2xl text-retro-red">{player.score}</p>
                    <p className="text-xs text-dark opacity-60">points</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-4">
                {/* Lobby Mode */}
                {game.mode === "lobby" && (
                    <div className="text-center py-12">
                        <h2 className="text-display text-4xl text-retro-green mb-4">
                            Waiting for game to start...
                        </h2>
                        <p className="text-dark opacity-60 mb-8">
                            {players.length} player{players.length !== 1 ? "s" : ""} joined
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {players.map((p) => (
                                <div key={p.id} className="flex flex-col items-center">
                                    <div
                                        className={`w-12 h-12 rounded-full overflow-hidden border-2 ${
                                            p.id === playerId
                                                ? "border-retro-green"
                                                : "border-white"
                                        }`}
                                    >
                                        {p.selfieUrl ? (
                                            <img
                                                src={p.selfieUrl}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-faded-paper flex items-center justify-center">
                                                👤
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs mt-1 text-dark">{p.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Countdown Phase */}
                {game.mode === "game" && game.phase === "countdown" && (
                    <div className="text-center py-12">
                        <h2 className="text-display text-4xl text-retro-green mb-6">
                            Get ready...
                        </h2>
                        {timeLeft !== null && timeLeft > 0 && (
                            <p
                                className="text-display text-8xl text-retro-red animate-bounce-in"
                                key={timeLeft}
                            >
                                {timeLeft}
                            </p>
                        )}
                        {game.realOwnerId === playerId && (
                            <p className="text-display text-2xl text-retro-green mt-8 animate-pulse">
                                Your photo is next!
                            </p>
                        )}
                    </div>
                )}

                {/* Slideshow Mode / Photo Phase */}
                {(game.mode === "slideshow" ||
                    (game.mode === "game" && game.phase === "photo")) && (
                    <div className="text-center py-8">
                        <h2 className="text-display text-3xl text-retro-green mb-6">
                            {game.mode === "slideshow" ? "Photo Slideshow" : "Whose photo is this?"}
                        </h2>
                        {currentPhoto && (
                            <div
                                className="polaroid-frame polaroid-frame-lg mx-auto"
                                style={{ "--rotation": "0deg" } as React.CSSProperties}
                            >
                                <img
                                    src={currentPhoto.photoUrl}
                                    alt="Mystery photo"
                                    className="w-full aspect-square object-cover"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Volunteering Phase */}
                {game.mode === "game" && game.phase === "volunteering" && (
                    <div className="text-center py-8">
                        {game.realOwnerId === playerId ? (
                            <>
                                <h2 className="text-display text-3xl text-retro-red mb-2">
                                    This is your photo!
                                </h2>
                                <p className="text-dark opacity-70 mb-6">Get ready to present it</p>

                                {currentPhoto && (
                                    <div
                                        className="polaroid-frame polaroid-frame-lg mx-auto mb-8 ring-4 ring-retro-red"
                                        style={{ "--rotation": "0deg" } as React.CSSProperties}
                                    >
                                        <img
                                            src={currentPhoto.photoUrl}
                                            alt="Your photo"
                                            className="w-full aspect-square object-cover"
                                        />
                                    </div>
                                )}

                                <div className="w-full max-w-xs mx-auto py-6 rounded-2xl bg-retro-red/10 border-2 border-retro-red text-retro-red font-bold text-xl">
                                    You're presenting
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="text-display text-3xl text-retro-green mb-2">
                                    Want to bluff?
                                </h2>
                                <p className="text-dark opacity-70 mb-4">
                                    Claim this photo and try to convince everyone it's yours
                                </p>
                                {timeLeft !== null && timeLeft > 0 && (
                                    <p className="text-display text-5xl text-retro-red mb-6">
                                        {timeLeft}
                                    </p>
                                )}

                                {currentPhoto && (
                                    <div
                                        className="polaroid-frame polaroid-frame-lg mx-auto mb-8"
                                        style={{ "--rotation": "0deg" } as React.CSSProperties}
                                    >
                                        <img
                                            src={currentPhoto.photoUrl}
                                            alt="Mystery photo"
                                            className="w-full aspect-square object-cover"
                                        />
                                    </div>
                                )}

                                <button
                                    onClick={hasVolunteered ? unvolunteer : volunteer}
                                    className={`w-full max-w-xs py-6 rounded-2xl text-xl font-bold transition-all ${
                                        hasVolunteered
                                            ? "bg-retro-green text-white"
                                            : "bg-faded-paper text-dark border-2 border-sage hover:bg-sage/20"
                                    }`}
                                >
                                    {hasVolunteered ? "✓ Claimed!" : "Claim It"}
                                </button>

                                <p className="text-dark opacity-60 mt-4">
                                    {Object.keys(game.volunteers).length} claiming
                                </p>
                            </>
                        )}
                    </div>
                )}

                {/* Pitches Phase */}
                {game.mode === "game" && game.phase === "pitches" && (
                    <div className="text-center py-8">
                        {isPresenter ? (
                            <>
                                <h2 className="text-display text-3xl text-retro-red mb-2">
                                    Convince them it's yours!
                                </h2>
                                <p className="text-dark opacity-70 mb-6">
                                    Everyone pitches at the same time
                                </p>
                            </>
                        ) : (
                            <>
                                <h2 className="text-display text-3xl text-retro-green mb-2">
                                    Listen to the pitches
                                </h2>
                                <p className="text-dark opacity-70 mb-6">
                                    Who sounds most convincing?
                                </p>
                            </>
                        )}

                        {currentPhoto && (
                            <div
                                className="polaroid-frame polaroid-frame-lg mx-auto mb-8"
                                style={{ "--rotation": "0deg" } as React.CSSProperties}
                            >
                                <img
                                    src={currentPhoto.photoUrl}
                                    alt="Mystery photo"
                                    className="w-full aspect-square object-cover"
                                />
                            </div>
                        )}

                        <p className="text-sm text-dark opacity-50 mb-3">Presenters</p>
                        <div className="flex flex-wrap justify-center gap-3 max-w-sm mx-auto">
                            {game.selectedPresenters.map((id) => {
                                const presenter = getPlayer(id);
                                const isYou = id === playerId;
                                return (
                                    <div
                                        key={id}
                                        className={`flex flex-col items-center p-3 rounded-xl ${
                                            isYou
                                                ? "bg-retro-green/20 ring-2 ring-retro-green"
                                                : "bg-white"
                                        }`}
                                    >
                                        <div
                                            className={`w-14 h-14 rounded-full overflow-hidden ${
                                                isYou
                                                    ? "border-3 border-retro-green"
                                                    : "border-2 border-white shadow-sm"
                                            }`}
                                        >
                                            {presenter?.selfieUrl ? (
                                                <img
                                                    src={presenter.selfieUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-faded-paper flex items-center justify-center">
                                                    👤
                                                </div>
                                            )}
                                        </div>
                                        <span
                                            className={`text-sm font-medium mt-1 ${
                                                isYou ? "text-retro-green" : "text-dark"
                                            }`}
                                        >
                                            {isYou ? "You" : presenter?.name || "Unknown"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Voting Phase */}
                {game.mode === "game" && game.phase === "voting" && (
                    <div className="text-center py-8">
                        <h2 className="text-display text-3xl text-retro-green mb-2">
                            Who's telling the truth?
                        </h2>
                        {timeLeft !== null && timeLeft > 0 && (
                            <p className="text-display text-5xl text-retro-red mb-6">{timeLeft}</p>
                        )}

                        {isPresenter ? (
                            <div className="py-12">
                                <p className="text-xl text-dark">
                                    You're a presenter - you can't vote!
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 max-w-xs mx-auto">
                                    {game.selectedPresenters.map((id) => {
                                        const presenter = getPlayer(id);
                                        const isVotedFor = game.votes[playerId || ""] === id;
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => vote(id)}
                                                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
                                                    isVotedFor
                                                        ? "bg-retro-red text-white"
                                                        : "bg-white text-dark hover:bg-sage/10 border border-sage/30"
                                                }`}
                                            >
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-faded-paper">
                                                    {presenter?.selfieUrl ? (
                                                        <img
                                                            src={presenter.selfieUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            👤
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-lg">
                                                    {presenter?.name || "Unknown"}
                                                </span>
                                                {isVotedFor && <span className="ml-auto">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {hasVoted && (
                                    <p className="text-dark opacity-50 text-sm mt-4">
                                        Tap another name to change your vote
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Results Phase */}
                {game.mode === "game" && game.phase === "results" && (
                    <div className="text-center py-8">
                        {/* Determine if a bluffer won */}
                        {(() => {
                            const blufferWon =
                                game.results?.winners?.some((w) => !w.isRealOwner) || false;
                            const realOwnerWon =
                                game.results?.winners?.some((w) => w.isRealOwner) || false;
                            const youVotedCorrectly =
                                playerId && game.results?.correctVoters?.includes(playerId);

                            return (
                                <>
                                    <h2 className="text-display text-4xl text-retro-red mb-6">
                                        {blufferWon && !realOwnerWon
                                            ? "Bluffed!"
                                            : blufferWon && realOwnerWon
                                            ? "It's a tie!"
                                            : "Truth!"}
                                    </h2>

                                    {game.realOwnerId && (
                                        <div className="mb-6">
                                            <p className="text-dark opacity-60 mb-2">
                                                The photo belongs to
                                            </p>
                                            <div className="inline-flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-retro-green mb-2">
                                                    {getPlayer(game.realOwnerId)?.selfieUrl ? (
                                                        <img
                                                            src={
                                                                getPlayer(game.realOwnerId)
                                                                    ?.selfieUrl
                                                            }
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-faded-paper flex items-center justify-center text-2xl">
                                                            👤
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-display text-2xl text-retro-green">
                                                    {getPlayer(game.realOwnerId)?.name || "Unknown"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Show winners and their points */}
                                    {game.results?.winners && game.results.winners.length > 0 && (
                                        <div className="mb-4 space-y-1">
                                            {game.results.winners.map((winner) => (
                                                <p key={winner.odUid} className="text-dark text-lg">
                                                    <span className="font-bold">
                                                        {getPlayer(winner.odUid)?.name}
                                                    </span>
                                                    {winner.isRealOwner
                                                        ? " (real owner)"
                                                        : " (bluffer)"}{" "}
                                                    earns{" "}
                                                    <span className="text-retro-red font-bold">
                                                        +{winner.pointsAwarded}
                                                    </span>
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Show if you voted correctly */}
                                    {youVotedCorrectly && (
                                        <p className="text-retro-green font-bold text-lg">
                                            You guessed correctly! +1 point
                                        </p>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Scoreboard Phase */}
                {game.mode === "game" && game.phase === "scoreboard" && (
                    <div className="py-8">
                        <h2 className="text-display text-4xl text-retro-green text-center mb-8">
                            Scoreboard
                        </h2>

                        <div className="space-y-3 max-w-md mx-auto">
                            {leaderboard.map((p, index) => {
                                const isYou = p.id === playerId;
                                return (
                                    <div
                                        key={p.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl ${
                                            isYou
                                                ? "bg-retro-green/10 border-2 border-retro-green"
                                                : "bg-white"
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                                index === 0
                                                    ? "bg-retro-red text-white"
                                                    : "bg-faded-paper text-dark"
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-faded-paper">
                                            {p.selfieUrl ? (
                                                <img
                                                    src={p.selfieUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    👤
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-semibold flex-1">{p.name}</span>
                                        <span className="text-display text-xl text-retro-red">
                                            {p.score}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
