import { useState } from "react";
import { ref, push, set } from "firebase/database";
import { db } from "../lib/firebase";

const ROOM_CODE = "VTRY";

const PROMPTS = [
    // Pride & Gratitude
    "What are you something you're proud of this year?",
    "What are you something you're grateful for this year?",
    "What is the best thing you have discovered about yourself this year?",

    // Reflection
    "Choose a word to define your past year.",
    "What's your favorite movie from this year",
    "What moment still lives in your head from this year?",
    "Who is your crush at this party?",
    "What's your favorite meme from this year?",
    "What's a question you want to ask someone at this party?",
    "A fun moment you had this year?",

    // Accomplishments
    "What is a big thing you accomplished this year?",
    "What was a wise decision you made this year?",
    "What was a big lesson you learned this year?",
    "What was a big risk you took this year?",
    "What was a new connection you've made this year?",

    // People & Impact
    "What was the an important thing you did for others this year?",
    "Who is a person who influenced a lot this year?",

    // Challenges & Growth
    "What were you not able to accomplish?",
    "What was a big challenge you faced this year, and how did you overcome it?",
];

// Pick a random prompt
const getRandomPrompt = () => PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

export default function Prompt() {
    const [currentPrompt, setCurrentPrompt] = useState(getRandomPrompt);
    const [answer, setAnswer] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const newPrompt = () => {
        setCurrentPrompt(getRandomPrompt());
        setAnswer("");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!answer.trim() || submitting) return;

        setSubmitting(true);

        try {
            const promptsRef = ref(db, `rooms/${ROOM_CODE}/prompts`);
            const newPromptRef = push(promptsRef);
            await set(newPromptRef, {
                prompt: currentPrompt,
                answer: answer.trim(),
                createdAt: Date.now(),
            });

            setCurrentPrompt(getRandomPrompt());
            setAnswer("");
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error("Error submitting prompt:", error);
            alert("Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                {showSuccess && (
                    <div className="mb-4 p-3 bg-retro-green/20 text-retro-green rounded-lg text-center font-medium animate-fade-in">
                        Submitted!
                    </div>
                )}

                <h1 className="text-display text-3xl text-retro-red mb-8 text-center">
                    {currentPrompt}
                </h1>

                <form onSubmit={handleSubmit}>
                    <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full p-4 rounded-lg border-2 border-sage/30 focus:border-retro-green focus:outline-none text-dark text-lg resize-none"
                        rows={4}
                        autoFocus
                    />

                    <button
                        type="submit"
                        disabled={!answer.trim() || submitting}
                        className="btn btn-primary w-full mt-4 disabled:opacity-50"
                    >
                        {submitting ? "Submitting..." : "Submit"}
                    </button>
                </form>

                <button
                    onClick={newPrompt}
                    className="w-full mt-3 text-dark/60 hover:text-dark transition-colors text-sm"
                >
                    New prompt
                </button>
            </div>
        </div>
    );
}
