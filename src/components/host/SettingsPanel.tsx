import type { TimerSettings } from '../../types/game';

interface SettingsPanelProps {
    timerSettings: TimerSettings;
    autoAdvance: boolean;
    hideOfflinePhotos: boolean;
    orphanedCount: number;
    onToggleAutoAdvance: () => void;
    onToggleHideOfflinePhotos: () => void;
    onUpdateTimerSetting: (phase: keyof TimerSettings, value: number) => void;
    onCleanupOrphans: () => void;
    onClose: () => void;
}

export default function SettingsPanel({
    timerSettings,
    autoAdvance,
    hideOfflinePhotos,
    orphanedCount,
    onToggleAutoAdvance,
    onToggleHideOfflinePhotos,
    onUpdateTimerSetting,
    onCleanupOrphans,
    onClose,
}: SettingsPanelProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-sage/20">
                    <h3 className="font-semibold text-dark text-lg">Timer Settings</h3>
                    <button
                        onClick={onClose}
                        className="text-dark opacity-60 hover:opacity-100 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Auto-advance Toggle */}
                <div className="p-4 border-b border-sage/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-dark">Auto-advance</p>
                            <p className="text-sm text-dark opacity-60">Automatically go to next phase when timer ends</p>
                        </div>
                        <button
                            onClick={onToggleAutoAdvance}
                            className={`w-14 h-8 rounded-full transition-colors relative ${
                                autoAdvance ? 'bg-retro-green' : 'bg-sage/30'
                            }`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                                autoAdvance ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* Hide Offline Photos Toggle */}
                <div className="p-4 border-b border-sage/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-dark">Hide offline players' photos</p>
                            <p className="text-sm text-dark opacity-60">Only show photos from online players in Available</p>
                        </div>
                        <button
                            onClick={onToggleHideOfflinePhotos}
                            className={`w-14 h-8 rounded-full transition-colors relative ${
                                hideOfflinePhotos ? 'bg-retro-green' : 'bg-sage/30'
                            }`}
                        >
                            <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                                hideOfflinePhotos ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                </div>

                {/* Timer Durations */}
                <div className="p-4 space-y-4">
                    <div className="mb-2">
                        <h4 className="font-semibold text-dark">Phase Durations (seconds)</h4>
                        <p className="text-xs text-dark opacity-60">Set to 0 to disable timer (host advances manually)</p>
                    </div>

                    <TimerSettingRow
                        label="Countdown"
                        value={timerSettings?.countdown || 3}
                        onChange={(v) => onUpdateTimerSetting('countdown', v)}
                    />
                    <TimerSettingRow
                        label="Volunteering"
                        value={timerSettings?.volunteering || 30}
                        onChange={(v) => onUpdateTimerSetting('volunteering', v)}
                    />
                    <TimerSettingRow
                        label="Pitches"
                        value={timerSettings?.pitches || 60}
                        onChange={(v) => onUpdateTimerSetting('pitches', v)}
                    />
                    <TimerSettingRow
                        label="Voting"
                        value={timerSettings?.voting || 30}
                        onChange={(v) => onUpdateTimerSetting('voting', v)}
                    />
                    <TimerSettingRow
                        label="Results"
                        value={timerSettings?.results || 10}
                        onChange={(v) => onUpdateTimerSetting('results', v)}
                    />
                </div>

                {/* Maintenance */}
                <div className="p-4 border-t border-sage/20">
                    <h4 className="font-semibold text-dark mb-3">Maintenance</h4>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-dark text-sm">Orphaned submissions</p>
                            <p className="text-xs text-dark opacity-60">Photos with no matching player</p>
                        </div>
                        <button
                            onClick={onCleanupOrphans}
                            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                                orphanedCount > 0
                                    ? 'bg-retro-red text-white hover:bg-deep-red'
                                    : 'bg-faded-paper text-dark opacity-50 cursor-default'
                            }`}
                        >
                            {orphanedCount > 0 ? `Clean up (${orphanedCount})` : 'None found'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-sage/20">
                    <button
                        onClick={onClose}
                        className="w-full btn btn-primary"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// Timer setting row component
function TimerSettingRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <span className="text-dark">{label}</span>
                {value === 0 && (
                    <span className="text-xs text-retro-green ml-2">(Manual)</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onChange(Math.max(0, value - 5))}
                    className="w-8 h-8 rounded-full bg-faded-paper hover:bg-sage/30 flex items-center justify-center font-bold"
                >
                    −
                </button>
                {value === 0 ? (
                    <span className="w-16 text-center py-1 text-retro-green font-medium">Off</span>
                ) : (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 text-center py-1 rounded border border-sage/30 text-dark"
                    />
                )}
                <button
                    onClick={() => onChange(value + 5)}
                    className="w-8 h-8 rounded-full bg-faded-paper hover:bg-sage/30 flex items-center justify-center font-bold"
                >
                    +
                </button>
            </div>
        </div>
    );
}
