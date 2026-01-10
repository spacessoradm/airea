import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertyGallery() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Get images from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const imagesParam = urlParams.get('images');
  const propertyTitle = urlParams.get('title') || 'Property Photos';
  const images = imagesParam ? JSON.parse(decodeURIComponent(imagesParam)) : [];
  const startIndex = parseInt(urlParams.get('start') || '0');
  
  // Set initial index from URL
  useState(() => {
    setCurrentIndex(startIndex);
  });

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleClose = () => {
    setLocation(`/property/${id}`);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') handleClose();
  };

  useState(() => {
    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  });

  if (!images || images.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl">No images available</p>
          <Button onClick={handleClose} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
        <div className="text-white">
          <h1 className="text-xl font-semibold">{propertyTitle}</h1>
          <p className="text-sm text-gray-300">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
          data-testid="button-close-gallery"
        >
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Image */}
      <div className="flex-1 flex items-center justify-center p-4 pt-20">
        <img
          src={images[currentIndex]}
          alt={`${propertyTitle} - Photo ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
          data-testid={`img-gallery-${currentIndex}`}
        />
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
        data-testid="button-previous-image"
      >
        <ChevronLeft className="h-8 w-8" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
        data-testid="button-next-image"
      >
        <ChevronRight className="h-8 w-8" />
      </Button>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 justify-center">
          {images.map((image: string, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? 'border-white scale-110'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              data-testid={`thumbnail-${index}`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
