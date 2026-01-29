import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";
import type {
    GameMode,
    GamePhase,
    Player,
    Submission,
    GameState,
    TimerSettings,
} from "../types/game";

// Re-export types for convenience
export type { GameMode, GamePhase, Player, Submission, GameState, TimerSettings };

// Firebase data shapes (partial, as they come from DB)
interface FirebasePlayerData {
    name: string;
    selfieUrl?: string;
    score?: number;
    hasVolunteeredCount?: number;
    isOnline?: boolean;
}

interface FirebaseSubmissionData {
    odUid: string;
    photoUrl: string;
    caption?: string;
    hasBeenPlayed?: boolean;
    isBonus?: boolean;
}

// Default timer durations in seconds (0 = disabled, host triggers manually)
export const defaultTimerSettings: TimerSettings = {
    countdown: 3,
    volunteering: 15,
    pitches: 0, // Host triggers voting manually
    voting: 30,
    results: 10,
};

export interface RoomData {
    game: GameState;
    players: Player[];
    submissions: Submission[];
}

const defaultGameState: GameState = {
    mode: "lobby",
    phase: "photo",
    photoQueue: [],
    currentPhotoId: null,
    realOwnerId: null,
    timer: null,
    volunteers: {},
    selectedPresenters: [],
    votes: {},
    results: null,
    timerSettings: defaultTimerSettings,
    autoAdvance: true,
};

export function useGameState(roomCode: string) {
    const [game, setGame] = useState<GameState>(defaultGameState);
    const [players, setPlayers] = useState<Player[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!roomCode) return;

        const gameRef = ref(db, `rooms/${roomCode}/game`);
        const playersRef = ref(db, `rooms/${roomCode}/players`);
        const submissionsRef = ref(db, `rooms/${roomCode}/submissions`);

        const unsubGame = onValue(
            gameRef,
            (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    setGame({
                        mode: data.mode || "lobby",
                        phase: data.phase || "photo",
                        photoQueue: data.photoQueue || [],
                        currentPhotoId: data.currentPhotoId || null,
                        realOwnerId: data.realOwnerId || null,
                        timer: data.timer || null,
                        volunteers: data.volunteers || {},
                        selectedPresenters: data.selectedPresenters || [],
                        votes: data.votes || {},
                        results: data.results || null,
                        timerSettings: data.timerSettings || defaultTimerSettings,
                        autoAdvance: data.autoAdvance !== undefined ? data.autoAdvance : true,
                    });
                } else {
                    setGame(defaultGameState);
                }
                setLoading(false);
            },
            (err) => {
                setError(err.message);
                setLoading(false);
            }
        );

        const unsubPlayers = onValue(playersRef, (snapshot) => {
            const data = snapshot.val() as Record<string, FirebasePlayerData> | null;
            if (data) {
                const playerList: Player[] = Object.entries(data).map(([id, p]) => ({
                    id,
                    name: p.name,
                    selfieUrl: p.selfieUrl || "",
                    score: p.score || 0,
                    hasVolunteeredCount: p.hasVolunteeredCount || 0,
                    isOnline: p.isOnline || false,
                }));
                setPlayers(playerList);
            } else {
                setPlayers([]);
            }
        });

        const unsubSubmissions = onValue(submissionsRef, (snapshot) => {
            const data = snapshot.val() as Record<string, FirebaseSubmissionData> | null;
            if (data) {
                const subList: Submission[] = Object.entries(data).map(([id, s]) => ({
                    id,
                    odUid: s.odUid,
                    photoUrl: s.photoUrl,
                    caption: s.caption || "",
                    hasBeenPlayed: s.hasBeenPlayed || false,
                    isBonus: s.isBonus || false,
                }));
                setSubmissions(subList);
            } else {
                setSubmissions([]);
            }
        });

        return () => {
            unsubGame();
            unsubPlayers();
            unsubSubmissions();
        };
    }, [roomCode]);

    // Helper to get current photo
    const currentPhoto = submissions.find((s) => s.id === game.currentPhotoId) || null;

    // Helper to get player by ID
    const getPlayer = (playerId: string) => players.find((p) => p.id === playerId);

    // Helper to get sorted leaderboard
    const leaderboard = [...players].sort((a, b) => b.score - a.score);

    return {
        game,
        players,
        submissions,
        currentPhoto,
        getPlayer,
        leaderboard,
        loading,
        error,
    };
}
