import { useState, useEffect, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../lib/firebase";

const ROOM_CODE = "VTRY";
const SLIDE_DURATION = 5000; // 5 seconds per photo
const PROMPT_DURATION = 20000; // 20 seconds per prompt
const PRELOAD_COUNT = 2; // Number of upcoming images to preload

interface SlideshowPhoto {
    id: string;
    photoUrl: string;
    createdAt: number;
}

interface SlidePrompt {
    id: string;
    prompt: string;
    answer: string;
    createdAt: number;
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

const TypewriterText = ({
    text,
    speed = 50,
    delay = 0,
}: {
    text: string;
    speed?: number;
    delay?: number;
}) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
        setDisplayedText("");

        let intervalId: any;
        const timeoutId = setTimeout(() => {
            let i = 0;
            intervalId = setInterval(() => {
                if (i < text.length) {
                    setDisplayedText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(intervalId);
                }
            }, speed);
        }, delay);

        return () => {
            clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [text, speed, delay]);

    return <span>{displayedText}</span>;
};

export default function Slideshow() {
    const [photos, setPhotos] = useState<SlideshowPhoto[]>([]);
    const [prompts, setPrompts] = useState<SlidePrompt[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
    const [promptPosition, setPromptPosition] = useState(0);
    const [loading, setLoading] = useState(true);
    const knownPhotoIds = useRef<Set<string>>(new Set());

    // Subscribe to slideshow photos in the room
    useEffect(() => {
        const slideshowRef = ref(db, `rooms/${ROOM_CODE}/slideshow`);

        const unsubscribe = onValue(slideshowRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allPhotos = Object.entries(data).map(([id, photo]) => ({
                    id,
                    ...(photo as Omit<SlideshowPhoto, "id">),
                }));

                // Check if there are new photos
                const currentIds = new Set(allPhotos.map((p) => p.id));
                const hasNewPhotos = allPhotos.some((p) => !knownPhotoIds.current.has(p.id));

                if (hasNewPhotos || knownPhotoIds.current.size === 0) {
                    // Shuffle when we get new photos
                    setPhotos(shuffleArray(allPhotos));
                    knownPhotoIds.current = currentIds;
                }
            } else {
                setPhotos([]);
                knownPhotoIds.current = new Set();
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Subscribe to prompts
    useEffect(() => {
        const promptsRef = ref(db, `rooms/${ROOM_CODE}/prompts`);

        const unsubscribe = onValue(promptsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const allPrompts = Object.entries(data).map(([id, prompt]) => ({
                    id,
                    ...(prompt as Omit<SlidePrompt, "id">),
                }));
                // Shuffle prompts initially
                setPrompts(shuffleArray(allPrompts));
            } else {
                setPrompts([]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Auto-advance slideshow
    useEffect(() => {
        if (photos.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % photos.length);
        }, SLIDE_DURATION);

        return () => clearInterval(interval);
    }, [photos.length]);

    // Auto-advance prompts
    useEffect(() => {
        if (prompts.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
            // Pick a random position (0-3)
            setPromptPosition(Math.floor(Math.random() * 4));
        }, PROMPT_DURATION);

        return () => clearInterval(interval);
    }, [prompts.length]);

    // Reset index if photos change and index is out of bounds
    useEffect(() => {
        if (currentIndex >= photos.length && photos.length > 0) {
            setCurrentIndex(0);
        }
    }, [photos.length, currentIndex]);

    // Preload upcoming images to prevent loading flicker
    useEffect(() => {
        if (photos.length <= 1) return;

        for (let i = 1; i <= PRELOAD_COUNT; i++) {
            const nextIndex = (currentIndex + i) % photos.length;
            const img = new Image();
            img.src = photos[nextIndex].photoUrl;
        }
    }, [currentIndex, photos]);

    if (loading) {
        return (
            <div className="h-screen bg-dark flex items-center justify-center">
                <p className="text-cream text-xl">Loading...</p>
            </div>
        );
    }

    if (photos.length === 0) {
        return (
            <div className="h-screen bg-dark flex flex-col items-center justify-center p-6">
                <h1 className="text-display text-4xl text-cream mb-4">No Photos Yet</h1>
                <p className="text-cream opacity-60 mb-6">Add photos at terrypi.com/upload</p>
            </div>
        );
    }

    const currentPhoto = photos[currentIndex];
    const currentPrompt = prompts.length > 0 ? prompts[currentPromptIndex] : null;

    // Position definitions
    const positions = [
        "top-12 left-12", // Top Left
        "top-12 right-12", // Top Right
        "top-1/2 left-12 -translate-y-1/2", // Center Left
        "top-1/2 right-12 -translate-y-1/2", // Center Right
    ];

    const currentPositionClass = positions[promptPosition] || positions[0];

    return (
        <div className="h-screen bg-harvest-gold flex flex-col relative overflow-hidden">
            {/* Main Photo - smaller with more padding */}
            <div className="flex-1 flex items-center justify-center p-24 min-h-0">
                <img
                    key={currentPhoto.id}
                    src={currentPhoto.photoUrl}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                />
            </div>

            {/* Prompt Overlay */}
            {currentPrompt && (
                <div className={`absolute ${currentPositionClass} pointer-events-none z-20`}>
                    <div
                        key={currentPrompt.id} // Re-mount on change to restart typewriter
                        className="bg-black/60 backdrop-blur-sm p-8 rounded-xl max-w-lg text-center shadow-lg animate-fade-in-up"
                    >
                        <h2 className="text-cream text-xl md:text-2xl font-display mb-4 leading-normal break-words">
                            <TypewriterText text={currentPrompt.prompt} speed={70} />
                        </h2>
                        <div className="text-retro-gold text-base md:text-lg font-serif italic leading-relaxed break-words">
                            <TypewriterText
                                text={`"${currentPrompt.answer}"`}
                                speed={70}
                                delay={currentPrompt.prompt.length * 100 + 1000}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Join link - bottom left */}
            <div className="absolute bottom-4 left-8 text-left z-10">
                <p className="text-cream/50 text-lg">Join the game</p>
                <p className="text-cream text-3xl font-semibold">terrypi.com</p>
            </div>

            {/* Prompts link - bottom center */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center z-10">
                <p className="text-cream/50 text-lg">Answer questions</p>
                <p className="text-cream text-3xl font-semibold">terrypi.com/prompt</p>
            </div>

            {/* Upload link - bottom right */}
            <div className="absolute bottom-4 right-8 text-right z-10">
                <p className="text-cream/50 text-lg">Add photos</p>
                <p className="text-cream text-3xl font-semibold">terrypi.com/upload</p>
            </div>

            {/* Photo counter - top right */}
            <div className="absolute top-6 right-8 text-cream/40 text-sm z-10">
                {currentIndex + 1} / {photos.length}
            </div>
        </div>
    );
}
