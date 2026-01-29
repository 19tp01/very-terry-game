import { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

interface SlideshowPhoto {
    id: string;
    photoUrl: string;
    createdAt: number;
}

// Convert a Firebase Storage URL to its thumbnail version
// Original: .../filename.jpg -> .../filename_200x200.webp
function getThumbnailUrl(photoUrl: string): string {
    try {
        const url = new URL(photoUrl);
        // The path is URL-encoded in Firebase Storage URLs
        // e.g., /v0/b/bucket/o/rooms%2FVTRY%2Fslideshow%2F1234-photo.jpg
        const pathMatch = url.pathname.match(/\/o\/(.+)/);
        if (!pathMatch) return photoUrl;

        const encodedPath = pathMatch[1];
        const decodedPath = decodeURIComponent(encodedPath);

        // Replace extension with _200x200.webp
        const thumbPath = decodedPath.replace(/\.[^.]+$/, '_200x200.webp');
        const encodedThumbPath = encodeURIComponent(thumbPath);

        // Rebuild URL with thumbnail path
        url.pathname = url.pathname.replace(encodedPath, encodedThumbPath);
        return url.toString();
    } catch {
        return photoUrl; // Fallback to original if parsing fails
    }
}

interface SlideshowModalProps {
    roomCode: string;
    onClose: () => void;
}

export default function SlideshowModal({ roomCode, onClose }: SlideshowModalProps) {
    const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Subscribe to slideshow photos
    useEffect(() => {
        const slideshowRef = ref(db, `rooms/${roomCode}/slideshow`);

        const unsubscribe = onValue(slideshowRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const photoList = Object.entries(data).map(([id, photo]) => ({
                    id,
                    ...(photo as Omit<SlideshowPhoto, 'id'>),
                }));
                // Sort by createdAt descending (newest first)
                photoList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
                setPhotos(photoList);
            } else {
                setPhotos([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [roomCode]);

    const deletePhoto = async (photo: SlideshowPhoto) => {
        if (deleting) return;

        const confirm = window.confirm('Delete this photo from the slideshow?');
        if (!confirm) return;

        setDeleting(photo.id);

        try {
            // Delete from database
            await remove(ref(db, `rooms/${roomCode}/slideshow/${photo.id}`));

            // Try to delete original and thumbnail from storage
            try {
                const url = new URL(photo.photoUrl);
                const pathMatch = url.pathname.match(/\/o\/(.+)/);
                if (pathMatch) {
                    const storagePath = decodeURIComponent(pathMatch[1]);
                    // Delete original
                    const fileRef = storageRef(storage, storagePath);
                    await deleteObject(fileRef);
                    // Delete thumbnail
                    const thumbPath = storagePath.replace(/\.[^.]+$/, '_200x200.webp');
                    const thumbRef = storageRef(storage, thumbPath);
                    await deleteObject(thumbRef).catch(() => {}); // Ignore if thumbnail doesn't exist
                }
            } catch {
                // Storage deletion failed - file may already be deleted or URL format changed
                console.log('Could not delete from storage, continuing...');
            }
        } catch (error) {
            console.error('Error deleting photo:', error);
            alert('Failed to delete photo. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    const deleteAllPhotos = async () => {
        if (photos.length === 0) return;

        const confirm = window.confirm(`Delete all ${photos.length} slideshow photos? This cannot be undone.`);
        if (!confirm) return;

        setDeleting('all');

        try {
            for (const photo of photos) {
                await remove(ref(db, `rooms/${roomCode}/slideshow/${photo.id}`));

                // Try to delete original and thumbnail from storage
                try {
                    const url = new URL(photo.photoUrl);
                    const pathMatch = url.pathname.match(/\/o\/(.+)/);
                    if (pathMatch) {
                        const storagePath = decodeURIComponent(pathMatch[1]);
                        // Delete original
                        const fileRef = storageRef(storage, storagePath);
                        await deleteObject(fileRef);
                        // Delete thumbnail
                        const thumbPath = storagePath.replace(/\.[^.]+$/, '_200x200.webp');
                        const thumbRef = storageRef(storage, thumbPath);
                        await deleteObject(thumbRef).catch(() => {});
                    }
                } catch {
                    // Continue even if storage deletion fails
                }
            }
        } catch (error) {
            console.error('Error deleting photos:', error);
            alert('Some photos could not be deleted. Please try again.');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-sage/20">
                    <div>
                        <h3 className="font-semibold text-dark text-lg">Manage Slideshow</h3>
                        <p className="text-sm text-dark opacity-60">
                            {photos.length} photo{photos.length !== 1 ? 's' : ''} in slideshow
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-dark opacity-60 hover:opacity-100 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-dark opacity-60">Loading...</p>
                        </div>
                    ) : photos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-dark opacity-60 mb-2">No slideshow photos</p>
                            <p className="text-sm text-dark opacity-40">
                                Photos can be uploaded at /upload
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                            {photos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="relative aspect-square rounded-lg overflow-hidden group"
                                >
                                    <img
                                        src={getThumbnailUrl(photo.photoUrl)}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {/* Delete overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => deletePhoto(photo)}
                                            disabled={deleting !== null}
                                            className="w-10 h-10 rounded-full bg-retro-red text-white flex items-center justify-center hover:bg-deep-red transition-colors disabled:opacity-50"
                                        >
                                            {deleting === photo.id ? (
                                                <span className="animate-spin">...</span>
                                            ) : (
                                                <span className="text-xl">×</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-sage/20 flex gap-3">
                    {photos.length > 0 && (
                        <button
                            onClick={deleteAllPhotos}
                            disabled={deleting !== null}
                            className="px-4 py-2 rounded-lg font-medium bg-retro-red/10 text-retro-red hover:bg-retro-red/20 transition-colors disabled:opacity-50"
                        >
                            {deleting === 'all' ? 'Deleting...' : 'Delete All'}
                        </button>
                    )}
                    <div className="flex-1" />
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
