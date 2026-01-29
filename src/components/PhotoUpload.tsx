import { useRef, useState } from 'react';
import CropModal from './CropModal';

interface PhotoUploadProps {
    label: string;
    prompt?: string;
    required?: boolean;
    value: File | null;
    onPhotoSelect: (file: File) => void;
    onPhotoRemove: () => void;
    rotation?: number;
    size?: 'default' | 'large';
}

export default function PhotoUpload({
    label,
    prompt,
    required = false,
    value: _value, // Kept for controlled component interface
    onPhotoSelect,
    onPhotoRemove,
    rotation = 0,
    size = 'default',
}: PhotoUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileSelect = (file: File | null) => {
        if (file && file.type.startsWith('image/')) {
            setIsLoading(true);
            // Read file and open crop modal
            const reader = new FileReader();
            reader.onload = (e) => {
                setImageToCrop(e.target?.result as string);
                setIsLoading(false);
            };
            reader.onerror = () => {
                setIsLoading(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCropComplete = (croppedFile: File) => {
        // Set preview from cropped file
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(croppedFile);

        // Pass cropped file to parent
        onPhotoSelect(croppedFile);

        // Close crop modal
        setImageToCrop(null);

        // Reset input so same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleCropCancel = () => {
        setImageToCrop(null);
        // Reset input so same file can be selected again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0] || null;
        handleFileSelect(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPhotoRemove();
        setPreview(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    return (
        <>
            <div className="flex flex-col items-center gap-1 md:gap-3">
                <p className="text-typewriter text-dark text-center text-xs md:text-base">
                    {label}
                    {required && <span className="text-retro-red ml-1">*</span>}
                </p>

                <div
                    onClick={handleClick}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`polaroid-frame cursor-pointer transition-all duration-300 ${size === 'large' ? 'polaroid-frame-lg' : 'polaroid-frame-responsive'}`}
                    style={{
                        '--rotation': `${rotation}deg`,
                    } as React.CSSProperties}
                >
                    <div
                        className={`
                            aspect-square bg-faded-paper flex items-center justify-center
                            transition-all duration-200 overflow-hidden
                            ${isDragging ? 'ring-4 ring-retro-green ring-opacity-50' : ''}
                        `}
                    >
                        {preview ? (
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="text-center p-2 md:p-4">
                                <div className="text-3xl md:text-5xl mb-1 md:mb-2 opacity-40">📷</div>
                                <p className="text-dark text-xs md:text-sm opacity-50">
                                    {prompt || 'Tap to upload'}
                                </p>
                            </div>
                        )}
                    </div>

                    {preview && (
                        <button
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-retro-red text-white rounded-full
                                       flex items-center justify-center text-lg font-bold
                                       hover:bg-deep-red transition-colors shadow-md"
                            aria-label="Remove photo"
                        >
                            ×
                        </button>
                    )}
                </div>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="hidden"
                />
            </div>

            {/* Crop Modal */}
            {imageToCrop && (
                <CropModal
                    imageSrc={imageToCrop}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-white text-lg">Loading photo...</p>
                    </div>
                </div>
            )}
        </>
    );
}
