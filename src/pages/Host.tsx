import { useSearchParams } from 'react-router-dom';
import { useGameState, defaultTimerSettings } from '../hooks/useGameState';
import { ref, set, update, remove } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { GameMode, GamePhase, Submission, TimerSettings } from '../types/game';
import { useState, useEffect, useCallback } from 'react';
import { useTimer } from '../hooks/useTimer';
import QueuePanel from '../components/host/QueuePanel';
import PlayerModal from '../components/host/PlayerModal';
import SettingsPanel from '../components/host/SettingsPanel';
import ResetModal from '../components/host/ResetModal';
import SlideshowModal from '../components/host/SlideshowModal';

// Phase advancement map - defined outside component to avoid recreation
const nextPhaseMap: Record<GamePhase, GamePhase | null> = {
    countdown: 'volunteering',
    photo: 'volunteering',
    volunteering: 'pitches',
    pitches: 'voting',
    voting: 'results',
    results: 'scoreboard',
    scoreboard: null,
};

export default function Host() {
    const [searchParams] = useSearchParams();
    const roomCode = searchParams.get('room') || 'VTRY';

    // All hooks must be called before any conditional returns
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const { game, players, submissions, getPlayer, loading } = useGameState(roomCode);
    const [managingPlayerId, setManagingPlayerId] = useState<string | null>(null);
    const [hideOwners, setHideOwners] = useState<boolean>(true);
    const [showQueuePanel, setShowQueuePanel] = useState<boolean>(false);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
    const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
    const [showSlideshowModal, setShowSlideshowModal] = useState<boolean>(false);
    const [hideOfflinePhotos, setHideOfflinePhotos] = useState<boolean>(true);
    const timeLeft = useTimer(game.timer);

    const correctPassword = import.meta.env.VITE_HOST_PASSWORD || '';

    // Advance to next phase with auto-timer - must be before conditional returns
    const advanceToNextPhase = useCallback(async () => {
        const nextPhase = nextPhaseMap[game.phase];
        if (!nextPhase) return;

        const timerDuration = game.timerSettings?.[nextPhase as keyof TimerSettings] || 0;
        const now = Date.now();

        // Auto-select presenters when moving from volunteering to pitches
        if (nextPhase === 'pitches' && game.phase === 'volunteering') {
            const volunteerIds = Object.keys(game.volunteers || {});
            const realOwnerId = game.realOwnerId;

            // Build list of presenters: real owner is always included, then others
            const selectedPresenters: string[] = [];

            // Always include real owner (they must present their own photo!)
            if (realOwnerId) {
                selectedPresenters.push(realOwnerId);
            }

            // Get other volunteers (not the real owner)
            const otherVolunteers = volunteerIds.filter(id => id !== realOwnerId);

            // Sort by hasVolunteeredCount (lowest first for fairness), then randomize ties
            const sortedOthers = otherVolunteers
                .map(id => ({ id, count: getPlayer(id)?.hasVolunteeredCount || 0 }))
                .sort((a, b) => {
                    if (a.count !== b.count) return a.count - b.count;
                    return Math.random() - 0.5; // Random tiebreaker
                })
                .map(v => v.id);

            // Fill up to 4 total presenters (3 others + real owner)
            const maxOthers = 3;
            const selectedOthers = sortedOthers.slice(0, maxOthers);
            selectedPresenters.push(...selectedOthers);

            // Increment hasVolunteeredCount for selected presenters
            for (const id of selectedPresenters) {
                const player = getPlayer(id);
                if (player) {
                    await update(ref(db, `rooms/${roomCode}/players/${id}`), {
                        hasVolunteeredCount: (player.hasVolunteeredCount || 0) + 1,
                    });
                }
            }

            // Shuffle the presenters for random order
            for (let i = selectedPresenters.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [selectedPresenters[i], selectedPresenters[j]] = [selectedPresenters[j], selectedPresenters[i]];
            }

            await update(ref(db, `rooms/${roomCode}/game`), {
                phase: nextPhase,
                mode: 'game',
                selectedPresenters,
                timer: timerDuration > 0 ? {
                    endsAt: now + timerDuration * 1000,
                    duration: timerDuration,
                } : null,
            });
            return; // Exit early, we already updated
        }

        await update(ref(db, `rooms/${roomCode}/game`), {
            phase: nextPhase,
            mode: 'game',
            timer: timerDuration > 0 ? {
                endsAt: now + timerDuration * 1000,
                duration: timerDuration,
            } : null,
        });

        // Auto-reveal results when entering results phase
        if (nextPhase === 'results' && game.phase === 'voting') {
            // Call revealResults to handle scoring
            // Note: We need to do this inline since revealResults is defined later
            const realOwnerId = game.realOwnerId;
            if (realOwnerId) {
                const votes = game.votes || {};
                const presenters = game.selectedPresenters || [];

                // Count votes per presenter
                const voteCounts: Record<string, number> = {};
                presenters.forEach(id => { voteCounts[id] = 0; });
                Object.values(votes).forEach(votedFor => {
                    if (voteCounts[votedFor] !== undefined) {
                        voteCounts[votedFor]++;
                    }
                });

                // Find max votes
                const maxVotes = Math.max(...Object.values(voteCounts), 0);

                // Find all winners (those tied for max votes)
                const winnerIds = Object.entries(voteCounts)
                    .filter(([, count]) => count === maxVotes && maxVotes > 0)
                    .map(([id]) => id);

                // If no votes cast and only real owner presenting, they auto-win
                const noVotesCast = Object.keys(votes).length === 0;
                if (noVotesCast && presenters.length === 1 && presenters[0] === realOwnerId) {
                    winnerIds.push(realOwnerId);
                }

                // Find voters who correctly voted for real owner
                const correctVoters = Object.entries(votes)
                    .filter(([, votedFor]) => votedFor === realOwnerId)
                    .map(([odUid]) => odUid);

                const realOwnerVotes = voteCounts[realOwnerId] || 0;
                const realOwnerWonMajority = winnerIds.includes(realOwnerId);

                // Build winners array with points
                const winners: Array<{
                    odUid: string;
                    votes: number;
                    isRealOwner: boolean;
                    pointsAwarded: number;
                }> = [];

                for (const odUid of winnerIds) {
                    const isRealOwner = odUid === realOwnerId;
                    // Real owner wins majority: +3, Bluffer wins majority: +4
                    const pointsAwarded = isRealOwner ? 3 : 4;
                    winners.push({
                        odUid,
                        votes: voteCounts[odUid] || 0,
                        isRealOwner,
                        pointsAwarded,
                    });

                    // Award points to winner
                    const winner = getPlayer(odUid);
                    if (winner) {
                        await update(ref(db, `rooms/${roomCode}/players/${odUid}`), {
                            score: (winner.score || 0) + pointsAwarded,
                        });
                    }
                }

                // Award points to correct voters
                // If real owner won majority, correct voters are in majority: +1
                // If real owner lost majority, correct voters are in minority: +2
                const voterPoints = realOwnerWonMajority ? 1 : 2;
                for (const odUid of correctVoters) {
                    const voter = getPlayer(odUid);
                    if (voter) {
                        await update(ref(db, `rooms/${roomCode}/players/${odUid}`), {
                            score: (voter.score || 0) + voterPoints,
                        });
                    }
                }

                await update(ref(db, `rooms/${roomCode}/game`), {
                    results: {
                        realOwnerId,
                        realOwnerVotes,
                        winners,
                        correctVoters,
                        voterPointsAwarded: voterPoints,
                    },
                });
            }
        }
    }, [game.phase, game.timerSettings, game.realOwnerId, game.votes, game.selectedPresenters, game.volunteers, roomCode, getPlayer]);

    // Auto-advance when timer ends - must be before conditional returns
    useEffect(() => {
        if (!game.autoAdvance || !game.timer?.endsAt) return;

        const checkAndAdvance = () => {
            const remaining = game.timer!.endsAt! - Date.now();
            if (remaining <= 0) {
                advanceToNextPhase();
            }
        };

        const interval = setInterval(checkAndAdvance, 500);
        return () => clearInterval(interval);
    }, [game.autoAdvance, game.timer, advanceToNextPhase]);

    // Password protection - early return after all hooks
    if (!isAuthenticated) {
        return (
            <div className="h-screen bg-cream flex items-center justify-center p-6">
                <div className="text-center">
                    <h1 className="text-display text-4xl text-retro-green mb-6">Host Access</h1>
                    <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && passwordInput === correctPassword) {
                                setIsAuthenticated(true);
                            }
                        }}
                        placeholder="Enter password..."
                        className="input-field text-center text-lg mb-4"
                        autoFocus
                    />
                    <button
                        onClick={() => {
                            if (passwordInput === correctPassword) {
                                setIsAuthenticated(true);
                            }
                        }}
                        className="btn btn-primary"
                    >
                        Enter
                    </button>
                </div>
            </div>
        );
    }

    // Get player's submissions
    const getPlayerSubmissions = (playerId: string) => {
        return submissions.filter(s => s.odUid === playerId);
    };

    // Player management functions
    const adjustPoints = async (playerId: string, amount: number) => {
        const player = getPlayer(playerId);
        if (!player) return;
        const newScore = Math.max(0, player.score + amount);
        await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
            score: newScore,
        });
    };

    const kickPlayer = async (playerId: string) => {
        // Mark player as offline (disconnects their session)
        await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
            isOnline: false,
        });

        setManagingPlayerId(null);
    };

    // Helper to delete a file from storage given its URL
    const deleteFromStorage = async (url: string) => {
        try {
            // Firebase Storage URLs look like:
            // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/PATH%2FTO%2FFILE?alt=media&token=...
            const urlObj = new URL(url);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
            if (pathMatch) {
                const storagePath = decodeURIComponent(pathMatch[1]);
                const fileRef = storageRef(storage, storagePath);
                await deleteObject(fileRef);
            } else {
                console.log('Could not parse storage path from URL:', url);
            }
        } catch (error) {
            // File may already be deleted or URL format changed
            console.log('Could not delete from storage:', url, error);
        }
    };

    const deletePlayer = async (playerId: string) => {
        const player = getPlayer(playerId);
        const playerSubmissions = getPlayerSubmissions(playerId);

        // Delete player's selfie from storage
        if (player?.selfieUrl) {
            await deleteFromStorage(player.selfieUrl);
        }

        // Delete all submission photos from storage and database
        for (const sub of playerSubmissions) {
            await deleteFromStorage(sub.photoUrl);
            await remove(ref(db, `rooms/${roomCode}/submissions/${sub.id}`));
        }

        // Remove from queue if any of their photos are queued
        const currentQueue = game.photoQueue || [];
        const updatedQueue = currentQueue.filter(
            photoId => !playerSubmissions.some(s => s.id === photoId)
        );
        if (updatedQueue.length !== currentQueue.length) {
            await update(ref(db, `rooms/${roomCode}/game`), {
                photoQueue: updatedQueue,
            });
        }

        // Remove player from database
        await remove(ref(db, `rooms/${roomCode}/players/${playerId}`));

        setManagingPlayerId(null);
    };

    const managingPlayer = managingPlayerId ? getPlayer(managingPlayerId) : null;
    const managingPlayerSubmissions = managingPlayerId ? getPlayerSubmissions(managingPlayerId) : [];

    // Firebase update helpers
    const setMode = async (mode: GameMode) => {
        await update(ref(db, `rooms/${roomCode}/game`), { mode });
    };

    const setPhase = async (phase: GamePhase) => {
        await update(ref(db, `rooms/${roomCode}/game`), { phase, mode: 'game' });
    };

    // Queue management
    const addToQueue = async (photoId: string) => {
        const currentQueue = game.photoQueue || [];
        if (currentQueue.includes(photoId)) return;
        await update(ref(db, `rooms/${roomCode}/game`), {
            photoQueue: [...currentQueue, photoId],
        });
    };

    const removeFromQueue = async (photoId: string) => {
        const currentQueue = game.photoQueue || [];
        await update(ref(db, `rooms/${roomCode}/game`), {
            photoQueue: currentQueue.filter(id => id !== photoId),
        });
    };

    const moveInQueue = async (fromIndex: number, toIndex: number) => {
        const currentQueue = [...(game.photoQueue || [])];
        const [removed] = currentQueue.splice(fromIndex, 1);
        currentQueue.splice(toIndex, 0, removed);
        await update(ref(db, `rooms/${roomCode}/game`), {
            photoQueue: currentQueue,
        });
    };

    const playNextInQueue = async () => {
        const queue = game.photoQueue || [];
        if (queue.length === 0) {
            alert('Queue is empty! Add photos to the queue first.');
            return;
        }

        const nextPhotoId = queue[0];
        const photo = submissions.find(s => s.id === nextPhotoId);
        if (!photo) return;

        const countdownDuration = game.timerSettings?.countdown || 3;

        // Remove from queue, set as current, start countdown phase
        await update(ref(db, `rooms/${roomCode}/game`), {
            photoQueue: queue.slice(1),
            currentPhotoId: nextPhotoId,
            realOwnerId: photo.odUid,
            mode: 'game',
            phase: 'countdown',
            volunteers: {},
            selectedPresenters: [],
            votes: {},
            results: null,
            timer: {
                endsAt: Date.now() + countdownDuration * 1000,
                duration: countdownDuration,
            },
        });

        // Mark photo as played
        await update(ref(db, `rooms/${roomCode}/submissions/${nextPhotoId}`), {
            hasBeenPlayed: true,
        });
    };

    // Update timer settings
    const updateTimerSetting = async (phase: keyof TimerSettings, value: number) => {
        const current = game.timerSettings || defaultTimerSettings;
        await update(ref(db, `rooms/${roomCode}/game`), {
            timerSettings: {
                ...current,
                [phase]: Math.max(0, value),
            },
        });
    };

    // Toggle auto-advance
    const toggleAutoAdvance = async () => {
        await update(ref(db, `rooms/${roomCode}/game`), {
            autoAdvance: !game.autoAdvance,
        });
    };

    // Skip to next phase immediately
    const skipToNextPhase = async () => {
        await advanceToNextPhase();
    };


    const startTimer = async (seconds: number) => {
        await update(ref(db, `rooms/${roomCode}/game`), {
            timer: {
                endsAt: Date.now() + seconds * 1000,
                duration: seconds,
            },
        });
    };

    const clearTimer = async () => {
        await update(ref(db, `rooms/${roomCode}/game`), {
            timer: null,
        });
    };

    // Shuffle the order of presenters
    const shufflePresenters = async () => {
        const current = [...(game.selectedPresenters || [])];
        // Fisher-Yates shuffle
        for (let i = current.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [current[i], current[j]] = [current[j], current[i]];
        }
        await update(ref(db, `rooms/${roomCode}/game`), {
            selectedPresenters: current,
        });
    };

    const revealResults = async () => {
        const realOwnerId = game.realOwnerId;
        if (!realOwnerId) return;

        const votes = game.votes || {};
        const presenters = game.selectedPresenters || [];

        // Count votes per presenter
        const voteCounts: Record<string, number> = {};
        presenters.forEach(id => { voteCounts[id] = 0; });
        Object.values(votes).forEach(votedFor => {
            if (voteCounts[votedFor] !== undefined) {
                voteCounts[votedFor]++;
            }
        });

        // Find max votes
        const maxVotes = Math.max(...Object.values(voteCounts), 0);

        // Find all winners (those tied for max votes)
        const winnerIds = Object.entries(voteCounts)
            .filter(([, count]) => count === maxVotes && maxVotes > 0)
            .map(([id]) => id);

        // If no votes cast and only real owner presenting, they auto-win
        const noVotesCast = Object.keys(votes).length === 0;
        if (noVotesCast && presenters.length === 1 && presenters[0] === realOwnerId) {
            winnerIds.push(realOwnerId);
        }

        // Find voters who correctly voted for real owner
        const correctVoters = Object.entries(votes)
            .filter(([, votedFor]) => votedFor === realOwnerId)
            .map(([odUid]) => odUid);

        const realOwnerVotes = voteCounts[realOwnerId] || 0;
        const realOwnerWonMajority = winnerIds.includes(realOwnerId);

        // Build winners array with points
        const winners: Array<{
            odUid: string;
            votes: number;
            isRealOwner: boolean;
            pointsAwarded: number;
        }> = [];

        for (const winnerId of winnerIds) {
            const isRealOwner = winnerId === realOwnerId;
            // Real owner wins majority: +3, Bluffer wins majority: +4
            const pointsAwarded = isRealOwner ? 3 : 4;
            winners.push({
                odUid: winnerId,
                votes: voteCounts[winnerId] || 0,
                isRealOwner,
                pointsAwarded,
            });

            // Award points to winner
            const winner = getPlayer(winnerId);
            if (winner) {
                await update(ref(db, `rooms/${roomCode}/players/${winnerId}`), {
                    score: (winner.score || 0) + pointsAwarded,
                });
            }
        }

        // Award points to correct voters
        // If real owner won majority, correct voters are in majority: +1
        // If real owner lost majority, correct voters are in minority: +2
        const voterPoints = realOwnerWonMajority ? 1 : 2;
        for (const odUid of correctVoters) {
            const voter = getPlayer(odUid);
            if (voter) {
                await update(ref(db, `rooms/${roomCode}/players/${odUid}`), {
                    score: (voter.score || 0) + voterPoints,
                });
            }
        }

        await update(ref(db, `rooms/${roomCode}/game`), {
            results: {
                realOwnerId,
                realOwnerVotes,
                winners,
                correctVoters,
                voterPointsAwarded: voterPoints,
            },
        });
    };

    // Find orphaned submissions (where odUid doesn't match any player)
    const getOrphanedSubmissions = () => {
        const playerIds = new Set(players.map(p => p.id));
        return submissions.filter(s => !playerIds.has(s.odUid));
    };

    const cleanupOrphanedSubmissions = async () => {
        const orphaned = getOrphanedSubmissions();
        if (orphaned.length === 0) {
            alert('No orphaned submissions found.');
            return;
        }

        const confirm = window.confirm(
            `Found ${orphaned.length} orphaned submission(s) with no matching player. Delete them?`
        );
        if (!confirm) return;

        // Remove orphaned submissions from queue first
        const orphanedIds = new Set(orphaned.map(s => s.id));
        const currentQueue = game.photoQueue || [];
        const updatedQueue = currentQueue.filter(id => !orphanedIds.has(id));
        if (updatedQueue.length !== currentQueue.length) {
            await update(ref(db, `rooms/${roomCode}/game`), {
                photoQueue: updatedQueue,
            });
        }

        // Delete orphaned submissions from storage and database
        for (const sub of orphaned) {
            await deleteFromStorage(sub.photoUrl);
            await remove(ref(db, `rooms/${roomCode}/submissions/${sub.id}`));
        }

        alert(`Deleted ${orphaned.length} orphaned submission(s).`);
    };

    const initializeRoom = async () => {
        // Reset game state
        await set(ref(db, `rooms/${roomCode}/game`), {
            mode: 'lobby',
            phase: 'photo',
            photoQueue: [],
            currentPhotoId: null,
            realOwnerId: null,
            timer: null,
            volunteers: {},
            selectedPresenters: [],
            votes: {},
            results: null,
            timerSettings: game.timerSettings || defaultTimerSettings,
            autoAdvance: game.autoAdvance !== undefined ? game.autoAdvance : true,
        });

        // Reset all photos to unplayed
        for (const submission of submissions) {
            await update(ref(db, `rooms/${roomCode}/submissions/${submission.id}`), {
                hasBeenPlayed: false,
            });
        }

        // Reset all player scores
        for (const player of players) {
            await update(ref(db, `rooms/${roomCode}/players/${player.id}`), {
                score: 0,
                hasVolunteeredCount: 0,
            });
        }

        setShowResetModal(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center">
                <p className="text-display text-3xl text-retro-green">Loading...</p>
            </div>
        );
    }

    // Get IDs of online players
    const onlinePlayerIds = new Set(players.filter(p => p.isOnline).map(p => p.id));

    const notInQueue = submissions.filter(s => {
        if (s.hasBeenPlayed || game.photoQueue.includes(s.id)) return false;
        if (hideOfflinePhotos && !onlinePlayerIds.has(s.odUid)) return false;
        return true;
    });
    const queuedPhotos = (game.photoQueue || []).map(id => submissions.find(s => s.id === id)).filter(Boolean) as Submission[];
    const currentPhoto = submissions.find(s => s.id === game.currentPhotoId);

    return (
        <div className="min-h-screen bg-cream p-4 md:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <h1 className="text-display text-3xl md:text-4xl text-retro-red">Host Control</h1>
                    <p className="text-dark opacity-60">Room: {roomCode}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Start Game / Play Next - Primary action */}
                    <button
                        onClick={playNextInQueue}
                        disabled={queuedPhotos.length === 0}
                        className="btn btn-primary text-sm disabled:opacity-50"
                    >
                        {game.mode === 'lobby' ? 'Start Game' : `Play Next (${queuedPhotos.length})`}
                    </button>
                    <button
                        onClick={() => setShowQueuePanel(!showQueuePanel)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            showQueuePanel
                                ? 'bg-retro-green text-white'
                                : 'bg-faded-paper text-dark'
                        }`}
                    >
                        Queue
                    </button>
                    <button
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            showSettingsPanel
                                ? 'bg-retro-green text-white'
                                : 'bg-faded-paper text-dark'
                        }`}
                    >
                        Settings
                    </button>
                    <button
                        onClick={() => setHideOwners(!hideOwners)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            hideOwners
                                ? 'bg-sage text-white'
                                : 'bg-faded-paper text-dark'
                        }`}
                    >
                        {hideOwners ? '🙈' : '👁'}
                    </button>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-faded-paper text-dark hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => setShowFinishModal(true)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-retro-red text-white hover:bg-deep-red transition-colors"
                    >
                        Finish Game
                    </button>
                </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setMode('lobby')}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                        game.mode === 'lobby'
                            ? 'bg-retro-green text-white'
                            : 'bg-white text-dark hover:bg-sage/20'
                    }`}
                >
                    Lobby
                </button>
                <button
                    onClick={() => setMode('game')}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                        game.mode === 'game'
                            ? 'bg-retro-green text-white'
                            : 'bg-white text-dark hover:bg-sage/20'
                    }`}
                >
                    Game
                </button>
                <button
                    onClick={() => setShowSlideshowModal(true)}
                    className="flex-1 py-3 rounded-lg font-semibold transition-colors bg-white text-dark hover:bg-sage/20"
                >
                    Manage Slideshow
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Mode/Phase Controls */}
                <div className="space-y-4">
                    {/* Current Status with Timer */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-semibold text-dark">Current Status</h2>
                            <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                                game.autoAdvance ? 'bg-retro-green text-white' : 'bg-faded-paper text-dark'
                            }`}>
                                {game.autoAdvance ? 'Auto' : 'Manual'}
                            </div>
                        </div>
                        <p className="text-display text-xl text-retro-green capitalize mb-2">
                            {game.mode === 'game' ? `Game: ${game.phase}` : game.mode}
                        </p>
                        {/* Timer display */}
                        {timeLeft !== null && timeLeft > 0 && (
                            <div className="flex items-center justify-between mt-3 p-3 bg-faded-paper rounded-lg">
                                <span className="text-display text-3xl text-retro-red">{timeLeft}s</span>
                                <button
                                    onClick={skipToNextPhase}
                                    className="px-3 py-1 rounded bg-retro-red text-white text-sm font-medium hover:bg-deep-red transition-colors"
                                >
                                    Skip
                                </button>
                            </div>
                        )}
                        {timeLeft === 0 && (
                            <div className="mt-3 p-3 bg-retro-green/10 rounded-lg text-center">
                                <span className="text-retro-green font-medium">Timer ended</span>
                            </div>
                        )}
                        {/* Next Phase button - show when no timer running */}
                        {game.mode === 'game' && timeLeft === null && nextPhaseMap[game.phase] && (
                            <button
                                onClick={skipToNextPhase}
                                className="w-full mt-3 btn btn-green"
                            >
                                Next: {nextPhaseMap[game.phase]}
                            </button>
                        )}
                    </div>

                    {/* Game Phase Controls - Only show in game mode */}
                    {game.mode === 'game' && (
                        <div className="bg-white rounded-lg p-4 border border-sage/30">
                            <h2 className="font-semibold text-dark mb-3">Game Phase</h2>
                            <div className="grid grid-cols-2 gap-2">
                                <PhaseButton phase="countdown" current={game.phase} onClick={() => setPhase('countdown')} />
                                <PhaseButton phase="volunteering" current={game.phase} onClick={() => setPhase('volunteering')} />
                                <PhaseButton phase="pitches" current={game.phase} onClick={() => setPhase('pitches')} />
                                <PhaseButton phase="voting" current={game.phase} onClick={() => setPhase('voting')} />
                                <PhaseButton phase="results" current={game.phase} onClick={() => setPhase('results')} />
                                <PhaseButton phase="scoreboard" current={game.phase} onClick={() => setPhase('scoreboard')} />
                            </div>
                        </div>
                    )}

                    {/* Quick Timer Controls */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <h2 className="font-semibold text-dark mb-3">Quick Timer</h2>
                        <div className="flex gap-2 flex-wrap">
                            <button onClick={() => startTimer(15)} className="btn btn-secondary text-sm py-2 px-3">15s</button>
                            <button onClick={() => startTimer(30)} className="btn btn-secondary text-sm py-2 px-3">30s</button>
                            <button onClick={() => startTimer(60)} className="btn btn-secondary text-sm py-2 px-3">60s</button>
                            <button onClick={clearTimer} className="btn btn-secondary text-sm py-2 px-3">Clear</button>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <h2 className="font-semibold text-dark mb-3">Actions</h2>
                        <div className="space-y-2">
                            <button
                                onClick={shufflePresenters}
                                disabled={game.selectedPresenters.length === 0}
                                className="w-full btn btn-green text-sm disabled:opacity-50"
                            >
                                Shuffle Presenter Order
                            </button>
                            <button
                                onClick={revealResults}
                                disabled={game.phase !== 'voting'}
                                className="w-full btn btn-primary text-sm disabled:opacity-50"
                            >
                                Reveal Results
                            </button>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Current Photo & Volunteers */}
                <div className="space-y-4">
                    {/* Current Photo */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <h2 className="font-semibold text-dark mb-3">Current Photo</h2>
                        {currentPhoto ? (
                            <div className="space-y-3">
                                <div className="polaroid-frame mx-auto" style={{ '--rotation': '0deg', width: '200px' } as React.CSSProperties}>
                                    <img
                                        src={currentPhoto.photoUrl}
                                        alt="Current"
                                        className="w-full aspect-square object-cover"
                                    />
                                </div>
                                {!hideOwners && (
                                    <p className="text-center text-sm text-dark">
                                        Owner: <span className="font-semibold">{getPlayer(currentPhoto.odUid)?.name || 'Unknown'}</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-dark opacity-40">No photo selected</p>
                        )}
                    </div>

                    {/* Queued Photos Preview */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-dark">
                                Queue ({queuedPhotos.length})
                            </h2>
                            {queuedPhotos.length > 0 && (
                                <button
                                    onClick={() => setShowQueuePanel(true)}
                                    className="text-sm text-retro-green hover:underline"
                                >
                                    Manage
                                </button>
                            )}
                        </div>
                        {queuedPhotos.length > 0 ? (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {queuedPhotos.slice(0, 6).map((photo, idx) => (
                                    <div
                                        key={photo.id}
                                        className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden"
                                    >
                                        <img
                                            src={photo.photoUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-0 left-0 bg-retro-green text-white text-xs px-1 rounded-br font-bold">
                                            {idx + 1}
                                        </div>
                                    </div>
                                ))}
                                {queuedPhotos.length > 6 && (
                                    <div className="w-16 h-16 shrink-0 rounded-lg bg-faded-paper flex items-center justify-center">
                                        <span className="text-dark opacity-60 text-sm">+{queuedPhotos.length - 6}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-dark opacity-40 text-sm py-2">
                                No photos in queue
                            </p>
                        )}
                    </div>

                    {/* Claims / Presenters - context-sensitive based on phase */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        {game.phase === 'volunteering' ? (
                            <>
                                <h2 className="font-semibold text-dark mb-3">
                                    Claims ({Object.keys(game.volunteers).length})
                                </h2>
                                <p className="text-dark opacity-50 text-sm">
                                    {Object.keys(game.volunteers).length === 0
                                        ? 'Waiting for players to claim...'
                                        : `${Object.keys(game.volunteers).length} player${Object.keys(game.volunteers).length !== 1 ? 's' : ''} claiming this photo`
                                    }
                                </p>
                            </>
                        ) : game.selectedPresenters.length > 0 ? (
                            <>
                                <h2 className="font-semibold text-dark mb-3">
                                    Presenters ({game.selectedPresenters.length})
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {game.selectedPresenters.map(id => {
                                        const player = getPlayer(id);
                                        return (
                                            <div
                                                key={id}
                                                className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-sage text-white"
                                            >
                                                {player?.name || id}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <>
                                <h2 className="font-semibold text-dark mb-3">Presenters</h2>
                                <p className="text-dark opacity-40 text-sm">
                                    Presenters will be selected after the claim phase
                                </p>
                            </>
                        )}
                    </div>

                    {/* Votes */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <h2 className="font-semibold text-dark mb-3">
                            Votes ({Object.keys(game.votes).length})
                        </h2>
                        <div className="space-y-1">
                            {game.selectedPresenters.map(id => {
                                const player = getPlayer(id);
                                const voteCount = Object.values(game.votes).filter(v => v === id).length;
                                return (
                                    <div key={id} className="flex justify-between text-sm">
                                        <span>{player?.name || id}</span>
                                        <span className="font-semibold">{voteCount}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Photo Grid */}
                <div className="space-y-4">
                    {/* Players - Click to manage */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <h2 className="font-semibold text-dark mb-2">Players ({players.length})</h2>
                        <p className="text-xs text-dark opacity-50 mb-3">Click to manage</p>
                        <div className="flex flex-wrap gap-2">
                            {players.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => setManagingPlayerId(player.id)}
                                    className="flex items-center gap-2 bg-faded-paper hover:bg-sage/20 px-2 py-1 rounded-full transition-colors"
                                >
                                    <div className="w-6 h-6 rounded-full overflow-hidden bg-sage/20">
                                        {player.selfieUrl ? (
                                            <img src={player.selfieUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                                        )}
                                    </div>
                                    <span className="text-sm">{player.name}</span>
                                    <span className="text-xs text-retro-red font-semibold">{player.score}</span>
                                    {player.isOnline && (
                                        <span className="w-2 h-2 bg-retro-green rounded-full"></span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Available Photos - Add to Queue */}
                    <div className="bg-white rounded-lg p-4 border border-sage/30">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-semibold text-dark">
                                Available ({notInQueue.length})
                            </h2>
                            {notInQueue.length > 0 && (
                                <button
                                    onClick={async () => {
                                        // Add all to queue
                                        for (const photo of notInQueue) {
                                            await addToQueue(photo.id);
                                        }
                                    }}
                                    className="text-sm text-retro-green hover:underline"
                                >
                                    Add All
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {notInQueue.map(photo => (
                                <button
                                    key={photo.id}
                                    onClick={() => addToQueue(photo.id)}
                                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-retro-green transition-all group"
                                >
                                    <img
                                        src={photo.photoUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Hover overlay */}
                                    <div className="absolute inset-0 bg-retro-green/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-white text-2xl">+</span>
                                    </div>
                                    {/* Owner name */}
                                    {!hideOwners && getPlayer(photo.odUid) && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 px-1 truncate">
                                            {getPlayer(photo.odUid)?.name}
                                        </div>
                                    )}
                                </button>
                            ))}
                            {notInQueue.length === 0 && (
                                <p className="col-span-3 text-center text-dark opacity-40 text-sm py-4">
                                    All photos queued or played
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Queue Panel Modal */}
            {showQueuePanel && (
                <QueuePanel
                    queuedPhotos={queuedPhotos}
                    availablePhotos={notInQueue}
                    hideOwners={hideOwners}
                    getPlayer={getPlayer}
                    onAddToQueue={addToQueue}
                    onRemoveFromQueue={removeFromQueue}
                    onMoveInQueue={moveInQueue}
                    onPlayNext={playNextInQueue}
                    onClose={() => setShowQueuePanel(false)}
                />
            )}

            {/* Player Management Modal */}
            {managingPlayer && (
                <PlayerModal
                    player={managingPlayer}
                    submissions={managingPlayerSubmissions}
                    hideOwners={hideOwners}
                    onAdjustPoints={(amount) => adjustPoints(managingPlayer.id, amount)}
                    onKickPlayer={() => kickPlayer(managingPlayer.id)}
                    onDeletePlayer={() => deletePlayer(managingPlayer.id)}
                    onClose={() => setManagingPlayerId(null)}
                />
            )}

            {/* Settings Panel Modal */}
            {showSettingsPanel && (
                <SettingsPanel
                    timerSettings={game.timerSettings || defaultTimerSettings}
                    autoAdvance={game.autoAdvance}
                    hideOfflinePhotos={hideOfflinePhotos}
                    orphanedCount={getOrphanedSubmissions().length}
                    onToggleAutoAdvance={toggleAutoAdvance}
                    onToggleHideOfflinePhotos={() => setHideOfflinePhotos(!hideOfflinePhotos)}
                    onUpdateTimerSetting={updateTimerSetting}
                    onCleanupOrphans={cleanupOrphanedSubmissions}
                    onClose={() => setShowSettingsPanel(false)}
                />
            )}

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <ResetModal
                    onConfirm={initializeRoom}
                    onCancel={() => setShowResetModal(false)}
                />
            )}

            {/* Finish Game Confirmation Modal */}
            {showFinishModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h3 className="text-display text-2xl text-retro-red mb-4">Finish Game?</h3>
                        <p className="text-dark mb-6">
                            This will end the game and show the final results screen. Are you sure you want to finish?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowFinishModal(false)}
                                className="flex-1 py-3 rounded-lg font-semibold bg-faded-paper text-dark hover:bg-sage/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await update(ref(db, `rooms/${roomCode}/game`), {
                                        mode: 'finished',
                                    });
                                    setShowFinishModal(false);
                                }}
                                className="flex-1 py-3 rounded-lg font-semibold bg-retro-red text-white hover:bg-deep-red transition-colors"
                            >
                                Finish Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slideshow Management Modal */}
            {showSlideshowModal && (
                <SlideshowModal
                    roomCode={roomCode}
                    onClose={() => setShowSlideshowModal(false)}
                />
            )}
        </div>
    );
}

// Phase button component
function PhaseButton({ phase, current, onClick }: { phase: GamePhase; current: GamePhase; onClick: () => void }) {
    const isActive = phase === current;
    return (
        <button
            onClick={onClick}
            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                    ? 'bg-retro-green text-white'
                    : 'bg-faded-paper text-dark hover:bg-sage/30'
            }`}
        >
            {phase}
        </button>
    );
}

