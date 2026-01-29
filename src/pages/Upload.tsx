import { useState } from "react";
import { Link } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ref as dbRef, push, set } from "firebase/database";
import { storage, db } from "../lib/firebase";
import heic2any from "heic2any";

const ROOM_CODE = "VTRY";

// Convert HEIC to JPEG if needed, otherwise return original file
async function convertHeicIfNeeded(file: File): Promise<Blob> {
    const isHeic = file.type === "image/heic" ||
                   file.type === "image/heif" ||
                   file.name.toLowerCase().endsWith(".heic") ||
                   file.name.toLowerCase().endsWith(".heif");

    if (isHeic) {
        const converted = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 1, // Full quality
        });
        return Array.isArray(converted) ? converted[0] : converted;
    }

    return file;
}

export default function Upload() {
    const [photos, setPhotos] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploaded, setUploaded] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        setPhotos((prev) => [...prev, ...files]);
        e.target.value = "";
    };

    const removePhoto = (index: number) => {
        setPhotos((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (photos.length === 0) return;

        setUploading(true);
        setProgress(0);

        const slideshowRef = dbRef(db, `rooms/${ROOM_CODE}/slideshow`);

        for (let i = 0; i < photos.length; i++) {
            const photo = photos[i];

            // Convert HEIC to JPEG if needed (no compression, full quality)
            const imageBlob = await convertHeicIfNeeded(photo);

            // Upload to Firebase Storage
            const timestamp = Date.now();
            const baseName = photo.name.replace(/\.(heic|heif)$/i, ".jpg");
            const fileName = `${timestamp}-${baseName}`;
            const storageRef = ref(storage, `rooms/${ROOM_CODE}/slideshow/${fileName}`);
            await uploadBytes(storageRef, imageBlob);
            const photoUrl = await getDownloadURL(storageRef);

            // Add to slideshow collection (separate from game submissions)
            const newPhotoRef = push(slideshowRef);
            await set(newPhotoRef, {
                photoUrl,
                createdAt: Date.now(),
            });

            setProgress(Math.round(((i + 1) / photos.length) * 100));
        }

        setUploading(false);
        setUploaded(true);
        setPhotos([]);
    };

    if (uploaded) {
        return (
            <div className="min-h-screen bg-cream flex items-center justify-center p-6">
                <div className="text-center animate-fade-in-up">
                    <h1 className="text-display text-4xl text-retro-green mb-4">
                        Photos Uploaded!
                    </h1>
                    <p className="text-dark opacity-60 mb-6">
                        They'll appear in the slideshow during the party.
                    </p>
                    <button
                        onClick={() => setUploaded(false)}
                        className="btn btn-primary"
                    >
                        Upload More
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
            <div className="text-center w-full max-w-md">
                <h1 className="text-display text-4xl text-retro-red mb-2">
                    Slideshow Photos
                </h1>
                <p className="text-dark opacity-60 mb-6">
                    Add photos to the party slideshow!
                </p>

                {/* Photo Grid */}
                {photos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {photos.map((photo, index) => (
                            <div
                                key={index}
                                className="relative aspect-square bg-white rounded-lg overflow-hidden shadow-md"
                            >
                                <img
                                    src={URL.createObjectURL(photo)}
                                    alt={`Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-retro-red text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Photos Button */}
                <label className="block mb-6 cursor-pointer">
                    <div className="border-2 border-dashed border-sage rounded-lg p-8 hover:border-retro-green transition-colors">
                        <span className="text-4xl block mb-2">📷</span>
                        <span className="text-dark opacity-60">
                            Tap to add photos
                        </span>
                    </div>
                    <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </label>

                {/* Upload Button */}
                {photos.length > 0 && (
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="btn btn-primary w-full mb-6"
                    >
                        {uploading
                            ? `Uploading... ${progress}%`
                            : `Upload ${photos.length} Photo${photos.length !== 1 ? "s" : ""}`}
                    </button>
                )}

                {/* Link to join game */}
                <div className="pt-4 border-t border-sage/30">
                    <p className="text-dark opacity-60 text-sm mb-2">
                        Want to play the game?
                    </p>
                    <Link
                        to="/submit"
                        className="text-retro-green font-semibold hover:underline"
                    >
                        Join the game →
                    </Link>
                </div>
            </div>
        </div>
    );
}
