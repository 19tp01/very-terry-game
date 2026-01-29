import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, push, set } from 'firebase/database';
import { storage, db } from '../lib/firebase';

interface SubmissionData {
    playerName: string;
    selfie: File;
    requiredPhotos: File[];
    bonusPhotos: File[];
    roomCode: string;
}

interface UploadResult {
    success: boolean;
    playerId?: string;
    error?: string;
}

export function usePhotoUpload() {
    const uploadPhoto = async (
        file: File,
        roomCode: string,
        folder: string
    ): Promise<string> => {
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.name}`;
        const storageRef = ref(storage, `rooms/${roomCode}/${folder}/${fileName}`);

        await uploadBytes(storageRef, file);
        return getDownloadURL(storageRef);
    };

    const submitPlayer = async (data: SubmissionData): Promise<UploadResult> => {
        try {
            const { playerName, selfie, requiredPhotos, bonusPhotos, roomCode } = data;

            // Create player reference and get ID
            const playersRef = dbRef(db, `rooms/${roomCode}/players`);
            const newPlayerRef = push(playersRef);
            const playerId = newPlayerRef.key!;

            // Upload selfie first
            const selfieUrl = await uploadPhoto(selfie, roomCode, `selfies/${playerId}`);

            // Save player data BEFORE creating submissions
            // This ensures the player record exists before any submissions reference it
            await set(newPlayerRef, {
                name: playerName,
                selfieUrl,
                score: 0,
                hasVolunteeredCount: 0,
                createdAt: Date.now(),
            });

            // Now upload required photos and create submissions
            const submissionsRef = dbRef(db, `rooms/${roomCode}/submissions`);

            for (const photo of requiredPhotos) {
                const photoUrl = await uploadPhoto(photo, roomCode, `photos/${playerId}`);
                const newSubmissionRef = push(submissionsRef);
                await set(newSubmissionRef, {
                    odUid: playerId,
                    photoUrl,
                    caption: '',
                    hasBeenPlayed: false,
                    createdAt: Date.now(),
                });
            }

            // Upload bonus photos to slideshow (separate from game submissions)
            const slideshowRef = dbRef(db, `rooms/${roomCode}/slideshow`);
            for (const bonusPhoto of bonusPhotos) {
                const bonusUrl = await uploadPhoto(bonusPhoto, roomCode, `slideshow`);
                const newSlideshowRef = push(slideshowRef);
                await set(newSlideshowRef, {
                    photoUrl: bonusUrl,
                    createdAt: Date.now(),
                });
            }

            return { success: true, playerId };
        } catch (error) {
            console.error('Submission error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Upload failed',
            };
        }
    };

    return { submitPlayer, uploadPhoto };
}
