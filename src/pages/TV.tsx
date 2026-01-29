import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useGameState } from '../hooks/useGameState';
import TVLobby from '../components/tv/TVLobby';
import TVCountdown from '../components/tv/TVCountdown';
import TVPhoto from '../components/tv/TVPhoto';
import TVVoting from '../components/tv/TVVoting';
import TVResults from '../components/tv/TVResults';
import TVScoreboard from '../components/tv/TVScoreboard';
import type { Player } from '../types/game';

export default function TV() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const roomCode = searchParams.get('room') || 'VTRY';

    const { game, players, currentPhoto, getPlayer, leaderboard, loading } = useGameState(roomCode);

    // Navigate to finish page when game mode is 'finished'
    useEffect(() => {
        if (game.mode === 'finished') {
            navigate(`/finish?room=${roomCode}`);
        }
    }, [game.mode, roomCode, navigate]);

    // Helper to get presenters with proper typing
    const getPresenters = (): Player[] => {
        return game.selectedPresenters
            .map(id => getPlayer(id))
            .filter((p): p is Player => p !== undefined);
    };

    if (loading) {
        return (
            <div className="h-screen bg-cream flex items-center justify-center">
                <p className="text-display text-4xl text-retro-green">Loading...</p>
            </div>
        );
    }

    const renderContent = () => {
        // Handle modes first (lobby, slideshow)
        if (game.mode === 'lobby') {
            return <TVLobby roomCode={roomCode} players={players} />;
        }

        if (game.mode === 'slideshow') {
            return (
                <TVPhoto
                    photo={currentPhoto}
                    owner={currentPhoto ? getPlayer(currentPhoto.odUid) : undefined}
                    phase="photo"
                    timer={game.timer}
                    presenters={[]}
                />
            );
        }

        // Game mode - switch on phase
        switch (game.phase) {
            case 'countdown':
                return <TVCountdown timer={game.timer} />;

            case 'photo':
            case 'volunteering':
            case 'pitches':
                return (
                    <TVPhoto
                        photo={currentPhoto}
                        owner={currentPhoto ? getPlayer(currentPhoto.odUid) : undefined}
                        phase={game.phase}
                        timer={game.timer}
                        presenters={getPresenters()}
                    />
                );

            case 'voting':
                return (
                    <TVVoting
                        photo={currentPhoto}
                        presenters={getPresenters()}
                        votes={game.votes}
                        timer={game.timer}
                    />
                );

            case 'results':
                return (
                    <TVResults
                        photo={currentPhoto}
                        realOwner={game.realOwnerId ? getPlayer(game.realOwnerId) : undefined}
                        winners={game.results?.winners || []}
                        correctVoterCount={game.results?.correctVoters?.length || 0}
                        getPlayer={getPlayer}
                    />
                );

            case 'scoreboard':
                return <TVScoreboard players={leaderboard} results={game.results} />;

            default:
                return <TVLobby roomCode={roomCode} players={players} />;
        }
    };

    return (
        <div className="h-screen bg-cream overflow-hidden">
            {renderContent()}
        </div>
    );
}
