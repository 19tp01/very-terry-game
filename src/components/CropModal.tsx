import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';

interface CropModalProps {
    imageSrc: string;
    onCropComplete: (croppedFile: File) => void;
    onCancel: () => void;
}

// Helper to create cropped image from canvas
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
    const image = new Image();
    image.src = imageSrc;

    await new Promise((resolve) => {
        image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    // Set canvas size to the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Convert canvas to blob
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                // Create a File from the blob
                const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
                resolve(file);
            },
            'image/jpeg',
            0.9 // Quality
        );
    });
}

export default function CropModal({ imageSrc, onCropComplete, onCancel }: CropModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((location: { x: number; y: number }) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((newZoom: number) => {
        setZoom(newZoom);
    }, []);

    const onCropAreaComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedFile);
        } catch (error) {
            console.error('Error cropping image:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50">
                <button
                    onClick={onCancel}
                    className="text-white text-lg px-4 py-2"
                >
                    Cancel
                </button>
                <h3 className="text-white font-semibold">Crop Photo</h3>
                <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="text-retro-green font-semibold text-lg px-4 py-2 disabled:opacity-50"
                >
                    {isProcessing ? 'Saving...' : 'Done'}
                </button>
            </div>

            {/* Cropper Area */}
            <div className="flex-1 relative">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={onCropChange}
                    onZoomChange={onZoomChange}
                    onCropComplete={onCropAreaComplete}
                    cropShape="rect"
                    showGrid={true}
                    style={{
                        containerStyle: {
                            background: '#000',
                        },
                        cropAreaStyle: {
                            border: '3px solid #6A8E4E',
                        },
                    }}
                />
            </div>

            {/* Zoom Slider */}
            <div className="p-4 bg-black/50">
                <div className="flex items-center gap-4 max-w-md mx-auto">
                    <span className="text-white text-sm">-</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-retro-green"
                    />
                    <span className="text-white text-sm">+</span>
                </div>
                <p className="text-center text-white/60 text-sm mt-2">
                    Pinch or use slider to zoom
                </p>
            </div>
        </div>,
        document.body
    );
}
