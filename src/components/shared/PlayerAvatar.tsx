import type { Player } from '../../types/game';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface PlayerAvatarProps {
    player: Player | undefined;
    size?: AvatarSize;
    borderColor?: 'default' | 'green' | 'white' | 'none';
    className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
    '2xl': 'w-32 h-32',
    '3xl': 'w-48 h-48',
};

const borderClasses: Record<string, string> = {
    default: 'border-3 border-white',
    green: 'border-4 border-retro-green',
    white: 'border-3 border-white',
    none: '',
};

const iconSizes: Record<AvatarSize, string> = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
    '2xl': 'text-4xl',
    '3xl': 'text-5xl',
};


export default function PlayerAvatar({
    player,
    size = 'md',
    borderColor = 'default',
    className = '',
}: PlayerAvatarProps) {
    const sizeClass = sizeClasses[size];
    const borderClass = borderClasses[borderColor];
    const iconSize = iconSizes[size];

    return (
        <div
            className={`${sizeClass} rounded-full overflow-hidden bg-faded-paper ${borderClass} flex-shrink-0 ${className}`}
        >
            {player?.selfieUrl ? (
                <img
                    src={player.selfieUrl}
                    alt={player.name}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className={`w-full h-full flex items-center justify-center ${iconSize}`}>
                    👤
                </div>
            )}
        </div>
    );
}
