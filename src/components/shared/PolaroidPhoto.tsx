import type { Submission } from '../../types/game';

type PolaroidSize = 'responsive' | 'lg' | 'tv' | 'custom';

interface PolaroidPhotoProps {
    photo: Submission | null;
    size?: PolaroidSize;
    rotation?: number;
    className?: string;
    customWidth?: string;
    customPadding?: string;
    showCaption?: boolean;
}

const sizeClasses: Record<Exclude<PolaroidSize, 'custom'>, string> = {
    responsive: 'polaroid-frame-responsive',
    lg: 'polaroid-frame-lg',
    tv: 'polaroid-frame-tv',
};

export default function PolaroidPhoto({
    photo,
    size = 'responsive',
    rotation = -2,
    className = '',
    customWidth,
    customPadding,
    showCaption = false,
}: PolaroidPhotoProps) {
    const sizeClass = size === 'custom' ? '' : sizeClasses[size];
    const customStyle = size === 'custom'
        ? { '--rotation': `${rotation}deg`, width: customWidth, padding: customPadding } as React.CSSProperties
        : { '--rotation': `${rotation}deg` } as React.CSSProperties;

    return (
        <div
            className={`polaroid-frame ${sizeClass} ${className}`}
            style={customStyle}
        >
            {photo ? (
                <>
                    <img
                        src={photo.photoUrl}
                        alt={photo.caption || 'Photo'}
                        className="w-full aspect-square object-cover"
                    />
                    {showCaption && photo.caption && (
                        <p className="polaroid-caption mt-2 text-sm truncate">{photo.caption}</p>
                    )}
                </>
            ) : (
                <div className="w-full aspect-square bg-faded-paper flex items-center justify-center">
                    <span className="text-6xl opacity-40">📷</span>
                </div>
            )}
        </div>
    );
}
