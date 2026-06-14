import React, { useState, useCallback, useMemo } from 'react';
import { useInView } from 'react-intersection-observer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

// Generate WebP and fallback URLs
const generateImageUrls = (src: string, quality = 80): { webp: string; fallback: string } => {
  if (!src || typeof src !== 'string') {
    return { webp: '', fallback: '' };
  }
  // If it's already a WebP or external URL, return as-is
  if (src.includes('webp') || src.startsWith('http')) {
    return { webp: src, fallback: src };
  }
  
  // For local images, you would implement WebP conversion here
  // For now, return the original URL
  return { webp: src, fallback: src };
};

export const OptimizedImage = React.memo<OptimizedImageProps>(({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22400%22%20height%3D%22400%22%3E%3Crect%20width%3D%22400%22%20height%3D%22400%22%20fill%3D%22%23374151%22/%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23d1d5db%22%20font-family%3D%22sans-serif%22%20font-size%3D%2216%22%3ELoading...%3C/text%3E%3C/svg%3E',
  sizes,
  quality = 80,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Intersection observer to trigger loading when image enters viewport
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  // Generate optimized URLs
  const imageUrls = useMemo(() => generateImageUrls(src, quality), [src, quality]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error with fallback
  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      // Try fallback URL if WebP fails
      if (imageSrc === imageUrls.webp && imageUrls.fallback !== imageUrls.webp) {
        setImageSrc(imageUrls.fallback);
        return;
      }
      // Use placeholder if all fails
      setImageSrc(placeholder);
    }
    onError?.();
  }, [hasError, imageSrc, imageUrls, placeholder, onError]);

  // Start loading when in view
  React.useEffect(() => {
    if (inView && !imageSrc) {
      if (!src) {
        setHasError(true);
        setImageSrc(placeholder);
      } else {
        setImageSrc(imageUrls.webp);
      }
    }
  }, [inView, imageSrc, imageUrls.webp, src, placeholder]);

  // Create responsive sizes attribute
  const responsiveSizes = useMemo(() => {
    if (sizes) return sizes;
    return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  }, [sizes]);

  return (
    <div 
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={{ 
        aspectRatio: width && height ? `${width}/${height}` : '1',
      }}
    >
      {/* Placeholder/Loading state */}
      <div 
        className={`absolute inset-0 bg-gray-700 transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <img
          src={placeholder}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {/* Main image */}
      {imageSrc && (
        <picture>
          {/* WebP source for modern browsers */}
          {imageUrls.webp !== imageUrls.fallback && (
            <source 
              srcSet={imageUrls.webp} 
              type="image/webp"
              sizes={responsiveSizes}
            />
          )}
          
          {/* Fallback image */}
          <img
            src={imageSrc}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            width={width}
            height={height}
            sizes={responsiveSizes}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            decoding="async"
            style={{
              contentVisibility: 'auto',
            }}
          />
        </picture>
      )}

      {/* Loading indicator */}
      {inView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">Failed to load image</p>
          </div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';