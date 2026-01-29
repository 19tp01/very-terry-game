import { useState } from 'react';
import type { Submission, Player } from '../../types/game';

interface QueuePanelProps {
    queuedPhotos: Submission[];
    availablePhotos: Submission[];
    hideOwners: boolean;
    getPlayer: (id: string) => Player | undefined;
    onAddToQueue: (photoId: string) => void;
    onRemoveFromQueue: (photoId: string) => void;
    onMoveInQueue: (fromIndex: number, toIndex: number) => void;
    onPlayNext: () => void;
    onClose: () => void;
}

export default function QueuePanel({
    queuedPhotos,
    availablePhotos,
    hideOwners,
    getPlayer,
    onAddToQueue,
    onRemoveFromQueue,
    onMoveInQueue,
    onPlayNext,
    onClose,
}: QueuePanelProps) {
    const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-end p-4 z-50">
            <div className="bg-white rounded-xl w-full max-w-md h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-sage/20">
                    <h3 className="font-semibold text-dark text-lg">Photo Queue</h3>
                    <button
                        onClick={onClose}
                        className="text-dark opacity-60 hover:opacity-100 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Queue List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <h4 className="font-medium text-dark mb-2 text-sm opacity-60">
                        Up Next ({queuedPhotos.length})
                    </h4>
                    {queuedPhotos.length === 0 ? (
                        <p className="text-center text-dark opacity-40 py-8">
                            Queue is empty. Add photos below.
                        </p>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {queuedPhotos.map((photo, index) => (
                                <div
                                    key={photo.id}
                                    draggable
                                    onDragStart={() => setDraggedPhotoId(photo.id)}
                                    onDragEnd={() => setDraggedPhotoId(null)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                        if (draggedPhotoId && draggedPhotoId !== photo.id) {
                                            const fromIdx = queuedPhotos.findIndex(p => p.id === draggedPhotoId);
                                            if (fromIdx !== -1) {
                                                onMoveInQueue(fromIdx, index);
                                            }
                                        }
                                    }}
                                    className={`flex items-center gap-3 p-2 rounded-lg border-2 transition-all cursor-grab ${
                                        draggedPhotoId === photo.id
                                            ? 'border-retro-green bg-sage/10 opacity-50'
                                            : 'border-sage/20 bg-faded-paper hover:border-sage/40'
                                    }`}
                                >
                                    {/* Drag Handle */}
                                    <div className="text-dark opacity-40 select-none">⋮⋮</div>

                                    {/* Position */}
                                    <div className="w-6 h-6 rounded-full bg-retro-green text-white text-sm flex items-center justify-center font-bold">
                                        {index + 1}
                                    </div>

                                    {/* Photo Thumbnail */}
                                    <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                        <img
                                            src={photo.photoUrl}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Caption or Owner */}
                                    <div className="flex-1 min-w-0">
                                        {photo.caption ? (
                                            <p className="text-sm text-dark truncate">{photo.caption}</p>
                                        ) : !hideOwners && getPlayer(photo.odUid) ? (
                                            <p className="text-sm text-dark opacity-60">by {getPlayer(photo.odUid)?.name}</p>
                                        ) : (
                                            <p className="text-sm text-dark opacity-40">Photo {index + 1}</p>
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => onRemoveFromQueue(photo.id)}
                                        className="text-red-500 hover:text-red-700 text-lg px-2"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Available Photos */}
                    <h4 className="font-medium text-dark mb-2 text-sm opacity-60">
                        Available Photos ({availablePhotos.length})
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                        {availablePhotos.map(photo => (
                            <button
                                key={photo.id}
                                onClick={() => onAddToQueue(photo.id)}
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
                        {availablePhotos.length === 0 && (
                            <p className="col-span-3 text-center text-dark opacity-40 py-4 text-sm">
                                All photos are queued or played
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-sage/20">
                    <button
                        onClick={() => {
                            onPlayNext();
                            onClose();
                        }}
                        disabled={queuedPhotos.length === 0}
                        className="w-full btn btn-primary disabled:opacity-50"
                    >
                        Play Next Photo
                    </button>
                </div>
            </div>
        </div>
    );
}
