import { useState } from 'react';
import type { Player, Submission } from '../../types/game';

interface PlayerModalProps {
    player: Player;
    submissions: Submission[];
    hideOwners: boolean;
    onAdjustPoints: (amount: number) => void;
    onKickPlayer: () => void;
    onDeletePlayer: () => void;
    onClose: () => void;
}

export default function PlayerModal({
    player,
    submissions,
    hideOwners,
    onAdjustPoints,
    onKickPlayer,
    onDeletePlayer,
    onClose,
}: PlayerModalProps) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-sage/20">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-faded-paper">
                            {player.selfieUrl ? (
                                <img src={player.selfieUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">👤</div>
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-dark text-lg">{player.name}</h3>
                            <p className="text-sm text-dark opacity-60">
                                {player.isOnline ? '🟢 Online' : '⚪ Offline'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-dark opacity-60 hover:opacity-100 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Points */}
                <div className="p-4 border-b border-sage/20">
                    <h4 className="font-semibold text-dark mb-3">Points</h4>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => onAdjustPoints(-1)}
                            className="w-12 h-12 rounded-full bg-faded-paper hover:bg-sage/30 text-2xl font-bold"
                        >
                            −
                        </button>
                        <span className="text-display text-4xl text-retro-red w-20 text-center">
                            {player.score}
                        </span>
                        <button
                            onClick={() => onAdjustPoints(1)}
                            className="w-12 h-12 rounded-full bg-faded-paper hover:bg-sage/30 text-2xl font-bold"
                        >
                            +
                        </button>
                    </div>
                    <div className="flex justify-center gap-2 mt-3">
                        <button
                            onClick={() => onAdjustPoints(-5)}
                            className="px-3 py-1 rounded bg-faded-paper hover:bg-sage/30 text-sm"
                        >
                            −5
                        </button>
                        <button
                            onClick={() => onAdjustPoints(5)}
                            className="px-3 py-1 rounded bg-faded-paper hover:bg-sage/30 text-sm"
                        >
                            +5
                        </button>
                    </div>
                </div>

                {/* Submitted Photos */}
                <div className="p-4 border-b border-sage/20">
                    <h4 className="font-semibold text-dark mb-3">
                        Submitted Photos ({submissions.length})
                    </h4>
                    {hideOwners ? (
                        <p className="text-dark opacity-50 text-sm">Hidden (names hidden mode is on)</p>
                    ) : submissions.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {submissions.map(sub => (
                                <div
                                    key={sub.id}
                                    className={`relative aspect-square rounded-lg overflow-hidden ${
                                        sub.hasBeenPlayed ? 'opacity-50' : ''
                                    }`}
                                >
                                    <img
                                        src={sub.photoUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                    {sub.hasBeenPlayed && (
                                        <div className="absolute top-1 right-1 bg-dark text-white text-xs px-1 rounded">
                                            Played
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-dark opacity-50 text-sm">No photos submitted</p>
                    )}
                </div>

                {/* Player Actions */}
                <div className="p-4 space-y-3">
                    {/* Disconnect */}
                    <div>
                        <button
                            onClick={onKickPlayer}
                            disabled={!player.isOnline}
                            className="w-full py-3 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {player.isOnline ? 'Disconnect Player' : 'Already Offline'}
                        </button>
                        <p className="text-xs text-dark opacity-50 mt-1 text-center">
                            Disconnects their session so they can rejoin on another device
                        </p>
                    </div>

                    {/* Delete */}
                    <div>
                        {confirmDelete ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="flex-1 py-3 rounded-lg bg-faded-paper text-dark font-semibold transition-colors hover:bg-sage/20"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onDeletePlayer}
                                    className="flex-1 py-3 rounded-lg bg-red-500 text-white font-semibold transition-colors hover:bg-red-600"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(true)}
                                className="w-full py-3 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 font-semibold transition-colors"
                            >
                                Delete Player
                            </button>
                        )}
                        <p className="text-xs text-dark opacity-50 mt-1 text-center">
                            Permanently removes player and their photos from the game
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
