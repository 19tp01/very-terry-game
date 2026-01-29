interface ResetModalProps {
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ResetModal({ onConfirm, onCancel }: ResetModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-sm w-full p-6">
                <h3 className="text-display text-2xl text-retro-red mb-4">Reset Game?</h3>
                <p className="text-dark mb-6">
                    This will reset all scores, mark all photos as unplayed, and return to the lobby. This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </div>
        </div>
    );
}
