import { useState, useEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import PhotoUpload from "../components/PhotoUpload";
import { usePhotoUpload } from "../hooks/usePhotoUpload";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import StringLights from "../components/tv/StringLights";

// Static assets from public folder
const photosIcon = "/assets/photos_icon.png";
const profile1 = "/assets/profile_1.jpg";
const profile2 = "/assets/profile_2.jpg";
const babyMystery = "/assets/baby_mystery.png";

const allMemories = [
    "/assets/memories/20250728-IMG_6014.jpg",
    "/assets/memories/20250728-IMG_6053.jpg",
    "/assets/memories/IMG_6193.jpg",
    "/assets/memories/IMG_6498.jpg",
    "/assets/memories/IMG_6651.jpg",
];

// Shuffle once at module load time (not during render)
const shuffledMemories = [...allMemories].sort(() => 0.5 - Math.random());
const randomMemories = [shuffledMemories[0], shuffledMemories[1]];

const exampleImages = [
    "/assets/examples/0D136AA5-EE8D-416C-B723-FED0039F8AC8.jpeg",
    "/assets/examples/C9362E66-C91A-4088-A9A6-549D5CFCE367.jpeg",
    "/assets/examples/IMG_0102.jpeg",
    "/assets/examples/IMG_0761.jpeg",
    "/assets/examples/IMG_0798.jpeg",
    "/assets/examples/IMG_1095.JPG",
    "/assets/examples/IMG_2188.jpeg",
    "/assets/examples/IMG_2230.jpeg",
    "/assets/examples/IMG_2318.jpeg",
    "/assets/examples/IMG_9167.jpeg",
    "/assets/examples/Subject 14.PNG",
];

const Reveal = ({
    children,
    delay = 0,
    className = "",
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`${className} ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
            style={{ animationDelay: `${delay}s` }}
        >
            {children}
        </div>
    );
};

const PromptCarousel = () => {
    const prompts = [
        "A meme that defined your year",
        "Something you forgot you took a photo of",
        "A spicy iMessage screenshot",
        "A trip you took this year",
        "An object that has a story",
        "A 2am photo from this year",
        "An unforgettable meal",
    ];

    const [index, setIndex] = useState(0);
    const [fadeKey, setFadeKey] = useState(0);

    const promptCount = prompts.length;
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % promptCount);
            setFadeKey((prev) => prev + 1);
        }, 3000); // Change every 3 seconds

        return () => clearInterval(interval);
    }, [promptCount]);

    return (
        <p
            key={fadeKey}
            className="text-retro-gold text-typewriter text-base md:text-xl mb-1 animate-fade-in-up"
        >
            {prompts[index]}
        </p>
    );
};

export default function Submit() {
    const [searchParams] = useSearchParams();
    const roomCode = searchParams.get("room") || "VTRY";

    const [playerName, setPlayerName] = useState("");
    const [selfie, setSelfie] = useState<File | null>(null);
    const [requiredPhotos, setRequiredPhotos] = useState<(File | null)[]>([null, null, null, null]);
    const [bonusPhotos, setBonusPhotos] = useState<File[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { submitPlayer } = usePhotoUpload();

    const requiredPhotoCount = requiredPhotos.filter(Boolean).length;
    const canSubmit = playerName.trim() && selfie && requiredPhotoCount >= 1 && !isSubmitting;

    const handleRequiredPhotoSelect = (index: number, file: File) => {
        const newPhotos = [...requiredPhotos];
        newPhotos[index] = file;
        setRequiredPhotos(newPhotos);
    };

    const handleRequiredPhotoRemove = (index: number) => {
        const newPhotos = [...requiredPhotos];
        newPhotos[index] = null;
        setRequiredPhotos(newPhotos);
    };

    const handleSubmit = async () => {
        if (!canSubmit || !selfie) return;

        setIsSubmitting(true);
        setError(null);

        const result = await submitPlayer({
            playerName: playerName.trim(),
            selfie,
            requiredPhotos: requiredPhotos.filter((p): p is File => p !== null),
            bonusPhotos,
            roomCode,
        });

        setIsSubmitting(false);

        if (result.success) {
            setIsSubmitted(true);
        } else {
            setError(result.error || "Something went wrong");
        }
    };

    /* State for Intro Sequence */
    const [introComplete, setIntroComplete] = useState(false);
    const [canScroll, setCanScroll] = useState(false); // Disable scroll initially
    const cameraRef = useRef<HTMLDivElement>(null);
    const flashRef = useRef<HTMLDivElement>(null);

    /* GSAP Animation for Sections */
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const section1Ref = useRef<HTMLDivElement>(null);
    const section2Ref = useRef<HTMLDivElement>(null);
    const sectionHowToRef = useRef<HTMLDivElement>(null); // New Section
    const section3Ref = useRef<HTMLDivElement>(null);
    const section4Ref = useRef<HTMLDivElement>(null);

    const titleRef = useRef<HTMLHeadingElement>(null);
    const babyImageRef = useRef<HTMLImageElement>(null);
    const scrollIndicatorRef = useRef<HTMLDivElement>(null);

    const polaroidFrameRef = useRef<HTMLDivElement>(null);
    const leftPolaroidRef = useRef<HTMLDivElement>(null);
    const rightPolaroidRef = useRef<HTMLDivElement>(null);
    const lightsRef = useRef<HTMLDivElement>(null); // Single ref for mobile lights
    const transitionOverlayRef = useRef<HTMLDivElement>(null);
    const photosIconRef = useRef<HTMLImageElement>(null);

    // Intro Animation Sequence
    useEffect(() => {
        if (isSubmitted) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                onComplete: () => setIntroComplete(true),
            });

            // 1. Camera slides up to CENTER
            tl.fromTo(
                cameraRef.current,
                { y: "150%", opacity: 0 },
                { y: "0%", opacity: 1, duration: 1.2 }
            );

            // 2. Camera "breathing" / aiming
            tl.to(cameraRef.current, {
                scale: 1.05,
                duration: 0.5,
                yoyo: true,
                repeat: 1,
                ease: "sine.inOut",
            });

            // 3. FLASH! (Bright white screen) - Ends at full opacity
            tl.to(flashRef.current, {
                opacity: 1,
                duration: 0.1,
                ease: "power2.in",
                onStart: () => {
                    // Start fading out the camera behind the flash
                    gsap.to(cameraRef.current, { opacity: 0, duration: 0.2 });
                },
            });
            // Note: We DO NOT fade out here. We switch views while white.
        });

        return () => ctx.revert();
    }, [isSubmitted]);

    // Main Page Animations (Run after intro)
    useEffect(() => {
        if (!introComplete || isSubmitted) return;

        gsap.registerPlugin(ScrollTrigger);

        const sections = [section1Ref, section2Ref, sectionHowToRef, section3Ref, section4Ref];

        const ctx = gsap.context(() => {
            // Flash Effect for all sections (except first, which has intro)
            sections.slice(1).forEach((sectionRef) => {
                const section = sectionRef.current;
                if (!section) return;

                const flash = section.querySelector(".camera-flash");

                ScrollTrigger.create({
                    trigger: section,
                    start: "top center", // Trigger slightly earlier
                    onEnter: () => {
                        if (flash) {
                            gsap.fromTo(
                                flash,
                                { opacity: 1 },
                                { opacity: 0, duration: 1.5, ease: "power2.out" }
                            );
                        }
                    },
                });
            });

            // Photos Icon Rotation
            if (photosIconRef.current && section2Ref.current && scrollContainerRef.current) {
                gsap.to(photosIconRef.current, {
                    rotation: 360, // Full rotation
                    ease: "none",
                    scrollTrigger: {
                        trigger: section2Ref.current,
                        scroller: scrollContainerRef.current, // Define scroller!
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 0.5, // Smoother scrub
                    },
                });
            }

            // SECTION 1 SEQUENCED ANIMATION
            // Timeline: White Overlay Fade -> Frame Drops In -> Photo Develops -> Text Reveal
            const s1Tl = gsap.timeline();

            // Initial States
            gsap.set(titleRef.current, { opacity: 0, y: -20 });
            gsap.set(scrollIndicatorRef.current, { opacity: 0, y: 10 });
            // Start way up (simulating inside the camera/slot), fully visible (opacity 1)
            gsap.set(polaroidFrameRef.current, { y: "-100vh", rotation: 0, opacity: 1 });

            // Initial States for Side Polaroids and Lights
            gsap.set(leftPolaroidRef.current, { x: -200, opacity: 0, rotation: -15 });
            gsap.set(rightPolaroidRef.current, { x: 200, opacity: 0, rotation: 15 });
            gsap.set(lightsRef.current, { opacity: 0, y: -30 });

            // 1. Fade out the white overlay (transition from intro)
            if (transitionOverlayRef.current) {
                s1Tl.to(transitionOverlayRef.current, {
                    opacity: 0,
                    duration: 2,
                    ease: "power2.inOut",
                });
            }

            // 2. Polaroid Frame Drops in (Overlapping with fade)
            if (polaroidFrameRef.current) {
                // Phase 1: Slow Ejection (Mechanical - "Slowly, slowly")
                s1Tl.to(
                    polaroidFrameRef.current,
                    {
                        y: "-90%", // Moves to just hanging in view
                        rotation: 0,
                        duration: 5,
                    },
                    "-=4"
                ); // Starts shortly after fade begins

                // Phase 2: The Drop (Gravity - "Falls down all at once")
                s1Tl.to(polaroidFrameRef.current, {
                    y: "0%",
                    rotation: -3,
                    duration: 0.6,
                    ease: "back.out(0.5)", // Heavy thud, minimal bounce
                });
            }

            // 3. Photo Develops (Happening during eject/drop)
            if (babyImageRef.current) {
                s1Tl.fromTo(
                    babyImageRef.current,
                    {
                        filter: "blur(30px) grayscale(100%) sepia(100%)", // More dramatic start
                        opacity: 0.8,
                    },
                    {
                        filter: "blur(0px) grayscale(0%) sepia(0%)",
                        opacity: 1,
                        duration: 2.5,
                    },
                    "-=2.8" // Start almost immediately with ejection
                );
            }

            // 4. Text & Side Polaroids come in
            const finalRevealTime = "<"; // Sync with text reveal

            if (titleRef.current) {
                s1Tl.to(titleRef.current, {
                    y: 0,
                    opacity: 1,
                    duration: 0.8,
                    ease: "back.out(1.2)",
                });
            }

            // Reveal string lights with text
            if (lightsRef.current) {
                s1Tl.to(
                    lightsRef.current,
                    { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
                    finalRevealTime
                );
            }

            if (leftPolaroidRef.current) {
                s1Tl.to(
                    leftPolaroidRef.current,
                    {
                        x: 0,
                        opacity: 1,
                        rotation: -6,
                        duration: 1,
                        ease: "power2.out",
                    },
                    finalRevealTime
                );
            }

            if (rightPolaroidRef.current) {
                s1Tl.to(
                    rightPolaroidRef.current,
                    {
                        x: 0,
                        opacity: 1,
                        rotation: 6,
                        duration: 1,
                        ease: "power2.out",
                    },
                    finalRevealTime
                );
            }

            if (scrollIndicatorRef.current) {
                s1Tl.to(
                    scrollIndicatorRef.current,
                    { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
                    "<0.2" // Start slightly after title
                );
            }

            s1Tl.call(() => setCanScroll(true));
        }); // Scope handled globally due to multi-section refs

        return () => ctx.revert();
    }, [introComplete, isSubmitted]);

    if (isSubmitted) {
        return (
            <div className="h-screen bg-cream flex items-center justify-center p-6">
                <div className="text-center animate-fade-in-up">
                    <h1 className="text-display text-5xl text-retro-green mb-6">You're In!</h1>
                    <p className="text-dark opacity-60">The game will begin after dinner!</p>
                    <div
                        className="mt-8 polaroid-frame inline-block"
                        style={{ "--rotation": "-3deg" } as React.CSSProperties}
                    >
                        <div className="w-48 h-48 overflow-hidden">
                            {selfie && (
                                <img
                                    src={URL.createObjectURL(selfie)}
                                    alt="Your selfie"
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        <p className="polaroid-caption mt-3">{playerName}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Intro Screen Overlay
    if (!introComplete) {
        return (
            <div className="h-screen w-full bg-cream flex flex-col items-center justify-center overflow-hidden relative">
                {/* The Camera */}
                <div ref={cameraRef} className="relative z-10 w-1/4 max-w-[200px]">
                    <img
                        src="/assets/polaroid.png"
                        alt="Polaroid Camera"
                        className="w-full h-auto"
                    />
                </div>

                {/* Full Screen Flash Overlay for Intro */}
                <div
                    ref={flashRef}
                    className="absolute inset-0 bg-white z-50 opacity-0 pointer-events-none"
                ></div>
            </div>
        );
    }

    return (
        <div
            ref={scrollContainerRef}
            className={`h-screen md:h-auto md:min-h-screen snap-y md:snap-none snap-mandatory bg-cream ${
                canScroll ? "overflow-y-scroll md:overflow-visible" : "overflow-hidden"
            }`}
        >
            {/* Section 1: Welcome - Red & Retro */}
            <section
                ref={section1Ref}
                className="snap-section md:h-auto md:min-h-screen md:py-20 bg-retro-red flex flex-col items-center justify-center px-6 relative overflow-hidden"
            >
                {/* Transition Overlay (Fade from White) */}
                <div
                    ref={transitionOverlayRef}
                    className="absolute inset-0 bg-white z-40 pointer-events-none"
                ></div>

                <div className="text-center relative max-w-4xl mx-auto w-full">
                    {/* String Lights (Mobile optimized placement) */}
                    <div
                        ref={lightsRef}
                        className="absolute top-10 -left-[10%] w-[120%] z-0 pointer-events-none opacity-0 md:hidden"
                    >
                        <StringLights className="w-full" position="top-left" />
                    </div>

                    {/* Title is hidden initially by GSAP logic */}
                    <h1
                        ref={titleRef}
                        className="text-display text-5xl mt-8 md:text-8xl text-cream opacity-0 relative z-20"
                    >
                        A Very Terry Recap
                    </h1>

                    <div className="relative h-96 flex justify-center items-center mb-10">
                        {/* Left Memory */}
                        <div
                            ref={leftPolaroidRef}
                            className="absolute left-[-3rem] md:left-0 z-0 opacity-0"
                        >
                            <div className="bg-white p-4 pb-12 shadow-lg w-52 md:w-64">
                                <div className="overflow-hidden bg-black/10 aspect-square">
                                    <img
                                        src={randomMemories[0]}
                                        alt="Memory 1"
                                        className="w-full h-full object-cover block"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Central Baby Photo */}
                        <div
                            ref={polaroidFrameRef}
                            className="relative z-10 inline-block opacity-0"
                        >
                            {/* Removed shadow-2xl and hover rotate for now to ensure smooth animation */}
                            <div className="bg-white p-4 pb-12 shadow-xl">
                                <div className="overflow-hidden bg-black/10">
                                    <img
                                        ref={babyImageRef}
                                        src="/assets/baby_bg.jpeg"
                                        alt="Very baby"
                                        className="w-64 h-auto block"
                                    />
                                </div>
                                <p className="font-handwriting text-center mt-3 text-dark/70 text-lg"></p>
                            </div>
                        </div>

                        {/* Right Memory */}
                        <div
                            ref={rightPolaroidRef}
                            className="absolute right-[-3rem] md:right-0 z-0 opacity-0"
                        >
                            <div className="bg-white p-4 pb-12 shadow-lg w-52 md:w-64">
                                <div className="overflow-hidden bg-black/10 aspect-square">
                                    <img
                                        src={randomMemories[1]}
                                        alt="Memory 2"
                                        className="w-full h-full object-cover block"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={scrollIndicatorRef} className="text-white opacity-0 relative z-20">
                        <p className="text-sm mb-2 font-bold uppercase tracking-widest">
                            Scroll to begin
                        </p>
                        <span className="text-3xl animate-bounce block">↓</span>
                    </div>
                </div>
            </section>

            {/* Section 2: About You - Cream */}
            <section
                ref={section2Ref}
                className="snap-section md:h-auto md:min-h-screen md:py-20 bg-cream flex flex-col items-center justify-center px-6 relative overflow-hidden"
            >
                {/* Rotating Photos Icon */}
                <div className="absolute top-4 md:top-16 left-1/2 -translate-x-1/2 z-10 w-24 opacity-80">
                    <img
                        ref={photosIconRef}
                        src={photosIcon}
                        alt="Photos"
                        className="w-full h-auto"
                    />
                </div>

                <div className="text-center max-w-md w-full pt-28">
                    <Reveal>
                        <h2 className="text-display text-3xl md:text-3xl text-retro-green mb-3 leading-tight">
                            Let's play a game...
                            <br />
                            using our camera rolls!
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-dark opacity-60 text-md md:text-base mb-6 px-4">
                            You've taken and saved a lot of photos this year. It's time to look back
                            at them! But first, let's get to know you.
                        </p>
                    </Reveal>

                    <Reveal delay={0.2}>
                        <input
                            type="text"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            placeholder="Your name..."
                            className="input-field text-center text-md mb-6"
                            maxLength={20}
                        />
                    </Reveal>

                    <Reveal delay={0.3}>
                        <div className="relative flex justify-center items-end mb-6 w-full max-w-3xl mx-auto">
                            {/* Left Profile Example */}
                            {/* Mobile: Absolute, pushed offscreen */}
                            {/* Desktop: Static in flex, full size */}
                            <div className="absolute left-[-8rem] polaroid-frame-lg bg-white opacity-60 grayscale hover:grayscale-0 transition-all duration-300 origin-right">
                                <div className="aspect-square overflow-hidden bg-faded-paper flex items-center justify-center">
                                    <img
                                        src={profile1}
                                        className="w-full h-full object-cover block"
                                        alt="Example 1"
                                    />
                                </div>
                            </div>

                            {/* The actual upload component */}
                            <div className="relative z-10 mx-2 md:mx-4">
                                <PhotoUpload
                                    label="Your Photo"
                                    prompt="Tap to upload"
                                    required
                                    value={selfie}
                                    onPhotoSelect={setSelfie}
                                    onPhotoRemove={() => setSelfie(null)}
                                    rotation={0}
                                    size="large"
                                />
                                <p className="text-[12px] text-retro-red italic mt-2 w-full max-w-[200px] leading-tight mx-auto">
                                    Literal bonus points if you're wearing a Santa hat! 🎅
                                </p>
                            </div>

                            {/* Right Profile Example */}
                            <div className="absolute right-[-8rem] polaroid-frame-lg bg-white opacity-60 grayscale hover:grayscale-0 transition-all duration-300 origin-left">
                                <div className="aspect-square overflow-hidden bg-faded-paper flex items-center justify-center">
                                    <img
                                        src={profile2}
                                        className="w-full h-full object-cover block"
                                        alt="Example 2"
                                    />
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* Attribution */}
                <div className="absolute bottom-2 right-2 text-[10px] md:text-xs text-dark/40 font-handwriting">
                    art by @annalaura_art
                </div>
            </section>

            {/* Section: How to pick photos - Harvest Gold */}
            <section
                ref={sectionHowToRef}
                className="snap-section bg-harvest-gold flex flex-col items-center justify-center relative overflow-hidden"
            >
                <div className="w-full h-full flex flex-col items-center justify-center px-6 pb-32 md:pb-0">
                    {" "}
                    {/* Padding bottom for carousel on mobile? */}
                    <div className="text-center w-full max-w-2xl z-10">
                        <Reveal>
                            <h2 className="text-display text-3xl md:text-6xl text-retro-red mb-4">
                                Rules for the photos
                            </h2>
                        </Reveal>

                        <Reveal delay={0.1}>
                            <p className="text-dark/80 text-md md:text-xl mb-4 font-medium">
                                Next, you're going to choose up to 4 *mystery* photos for the game.
                            </p>
                        </Reveal>

                        <div className="text-left max-w-lg mx-auto space-y-4 text-dark font-medium md:text-lg bg-white/30 p-6 rounded-xl shadow-sm">
                            <Reveal delay={0.3}>
                                <div className="flex items-start">
                                    <span className="text-retro-red mr-3 text-2xl">•</span>
                                    <div>
                                        <span className="font-bold text-retro-red uppercase">
                                            No familiar faces (including you).
                                        </span>
                                        <p className="text-sm md:text-base leading-snug">
                                            No photos of you or anyone people here might recognize.
                                        </p>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={0.4}>
                                <div className="flex items-start">
                                    <span className="text-retro-red mr-3 text-2xl">•</span>
                                    <div>
                                        <span className="font-bold text-retro-red uppercase">
                                            Taken or Saved this year
                                        </span>
                                        <p className="text-sm md:text-base leading-snug">
                                            Must have landed in your camera roll in 2025.
                                            Screenshots and memes are welcome!
                                        </p>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={0.5}>
                                <div className="flex items-start">
                                    <span className="text-retro-red mr-3 text-2xl">•</span>
                                    <div>
                                        <span className="font-bold text-retro-red uppercase">
                                            Keep it mysterious.
                                        </span>
                                        <p className="text-sm md:text-base leading-snug">
                                            Avoid obvious context clues that gives away that you
                                            took the photo!
                                        </p>
                                    </div>
                                </div>
                            </Reveal>

                            <Reveal delay={0.5}>
                                <div className="flex items-start">
                                    <span className="text-retro-red mr-3 text-2xl">•</span>
                                    <div>
                                        <span className="font-bold text-retro-red uppercase">
                                            The more the better
                                        </span>
                                        <p className="text-sm md:text-base leading-snug">
                                            No really, more photos gives you an edge in the game
                                        </p>
                                    </div>
                                </div>
                            </Reveal>
                        </div>
                    </div>
                </div>

                {/* Auto Scrolling Carousel */}
                <div className="absolute bottom-0 left-0 w-full bg-black/10 py-4 pt-8 overflow-hidden whitespace-nowrap z-0">
                    <div className="absolute top-2 left-4 text-xs font-bold text-dark/40 uppercase tracking-widest z-10 w-full text-left">
                        Examples
                    </div>
                    <div className="inline-block animate-scroll-left">
                        {[
                            ...exampleImages,
                            ...exampleImages,
                            ...exampleImages,
                            ...exampleImages,
                            ...exampleImages,
                            ...exampleImages,
                        ].map((src, i) => (
                            <div
                                key={i}
                                className="inline-block w-24 h-24 md:w-32 md:h-32 mx-2 rounded-md overflow-hidden bg-white shadow-md border-2 border-white transform rotate-1 even:-rotate-1"
                            >
                                <img
                                    src={src as string}
                                    className="w-full h-full object-cover"
                                    alt="Example"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Mystery Photos - Green */}
            <section
                ref={section3Ref}
                className="snap-section bg-retro-green flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
            >
                <div className="absolute top-[5%] left-1/2 -translate-x-1/2 opacity-30 w-64 rotate-[-12deg] pointer-events-none z-0">
                    <img src={babyMystery} alt="Baby Mystery" className="w-full h-auto" />
                </div>
                <div className="text-center w-full max-w-2xl relative z-10">
                    <Reveal>
                        <h2 className="text-display text-3xl md:text-5xl text-cream mb-1">
                            Your Mystery Photos
                        </h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <div className="h-16 flex items-center justify-center">
                            <PromptCarousel />
                        </div>
                    </Reveal>
                    <Reveal delay={0.2}>
                        <p className="text-white opacity-60 text-xs md:text-sm mb-4 md:mb-8">
                            Upload 1-4 photos
                        </p>
                    </Reveal>

                    <Reveal delay={0.3}>
                        <div className="grid grid-cols-2 gap-2 md:gap-6 justify-items-center">
                            {requiredPhotos.map((photo, index) => (
                                <PhotoUpload
                                    key={index}
                                    label={index === 0 ? "Required" : `#${index + 1}`}
                                    prompt="Tap to add"
                                    required={index === 0}
                                    value={photo}
                                    onPhotoSelect={(file) => handleRequiredPhotoSelect(index, file)}
                                    onPhotoRemove={() => handleRequiredPhotoRemove(index)}
                                    rotation={[1, -1, -1, 1][index]}
                                />
                            ))}
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* Section 4: Bonus + Submit - Harvest Gold */}
            <section
                ref={section4Ref}
                className="snap-section bg-harvest-gold flex flex-col items-center justify-center px-6 relative overflow-hidden"
            >
                <div className="text-center w-full max-w-2xl">
                    <Reveal>
                        <h2 className="text-display text-4xl text-retro-red mb-2">Bonus Round</h2>
                    </Reveal>
                    <Reveal delay={0.1}>
                        <p className="text-cream text-typewriter mb-2 text-xl">
                            Got photos WITH you in them you? (Optional)
                        </p>
                        <p className="text-white text-md mb-6">
                            These will be displayed in on the TV slideshow!
                        </p>
                    </Reveal>

                    <Reveal delay={0.2}>
                        {/* Horizontal Scroll for Bonus Photos */}
                        <div className="w-[calc(100%+3rem)] -ml-6 bg-black/10 py-6 mb-8">
                            <div className="flex overflow-x-auto pb-4 gap-6 px-6 snap-x w-full items-center justify-start scrollbar-hide">
                                {/* Uploaded Photos */}
                                {bonusPhotos.map((photo, index) => (
                                    <div
                                        key={index}
                                        className="flex-shrink-0 snap-center relative w-32 md:w-40 bg-white p-2 pb-8 shadow-md transform rotate-1 even:-rotate-1 transition-transform hover:scale-105"
                                    >
                                        <div className="aspect-square overflow-hidden bg-faded-paper">
                                            <img
                                                src={URL.createObjectURL(photo)}
                                                alt={`Bonus ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            onClick={() =>
                                                setBonusPhotos((prev) =>
                                                    prev.filter((_, i) => i !== index)
                                                )
                                            }
                                            className="absolute -top-2 -right-2 w-7 h-7 bg-retro-red text-white rounded-full flex items-center justify-center text-lg font-bold shadow-md hover:bg-deep-red transition-colors z-10"
                                            aria-label="Remove photo"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}

                                {/* Add Button */}
                                <div className="flex-shrink-0 snap-center">
                                    <PhotoUpload
                                        key={bonusPhotos.length} // Force reset on new add
                                        label="Add Photo"
                                        prompt="+"
                                        value={null}
                                        onPhotoSelect={(file) =>
                                            setBonusPhotos([...bonusPhotos, file])
                                        }
                                        onPhotoRemove={() => {}}
                                        rotation={0}
                                        size="default"
                                    />
                                </div>
                            </div>
                        </div>
                    </Reveal>

                    <Reveal delay={0.3}>
                        {error && (
                            <div className="mb-6 p-4 bg-retro-red bg-opacity-10 rounded-lg">
                                <p className="text-deep-red">{error}</p>
                            </div>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`
                                btn btn-primary text-2xl px-16 py-5 border-4 border-white
                                ${
                                    canSubmit
                                        ? "animate-warm-pulse"
                                        : "opacity-50 cursor-not-allowed"
                                }
                            `}
                        >
                            {isSubmitting ? "Uploading..." : "I'm Ready!"}
                        </button>
                    </Reveal>

                    <Reveal delay={0.4}>
                        {!canSubmit && !isSubmitting && (
                            <p className="text-retro-red mt-4 text-sm font-bold">
                                {!playerName.trim() && "↑ Enter your name"}
                                {playerName.trim() && !selfie && " • Add a selfie"}
                                {playerName.trim() &&
                                    selfie &&
                                    requiredPhotoCount < 1 &&
                                    " • Add at least 1 mystery photo"}
                            </p>
                        )}
                    </Reveal>
                </div>
            </section>
        </div>
    );
}
