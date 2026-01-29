// Top-level modes
export type GameMode = 'lobby' | 'slideshow' | 'game' | 'finished';

// Phases within 'game' mode
export type GamePhase = 'countdown' | 'photo' | 'volunteering' | 'pitches' | 'voting' | 'results' | 'scoreboard';

// Combined for backwards compatibility
export type FullPhase = GameMode | GamePhase;

// Timer settings for auto-advance
export interface TimerSettings {
    countdown: number;     // Fixed 3 seconds
    volunteering: number;  // Default 30
    pitches: number;       // Default 60
    voting: number;        // Default 30
    results: number;       // Default 10
}

export interface Player {
    id: string;
    name: string;
    selfieUrl: string;
    score: number;
    hasVolunteeredCount: number;
    isOnline?: boolean;
}

export interface Submission {
    id: string;
    odUid: string;
    photoUrl: string;
    caption: string;
    hasBeenPlayed: boolean;
    isBonus: boolean;
}

export interface GameState {
    mode: GameMode;
    phase: GamePhase;
    photoQueue: string[]; // Ordered list of photo IDs to play
    currentPhotoId: string | null;
    realOwnerId: string | null;
    timer: {
        endsAt: number | null;
        duration: number | null;
    } | null;
    volunteers: Record<string, boolean>;
    selectedPresenters: string[];
    votes: Record<string, string>;
    results: {
        realOwnerId: string;
        realOwnerVotes: number;
        // Winners are presenters who tied for most votes
        winners: Array<{
            odUid: string;
            votes: number;
            isRealOwner: boolean;
            pointsAwarded: number;
        }>;
        // Voters who correctly picked the real owner
        correctVoters: string[];
        voterPointsAwarded: number; // Always 1 if they voted correctly
    } | null;
    // Auto-advance settings
    timerSettings: TimerSettings;
    autoAdvance: boolean;
}
