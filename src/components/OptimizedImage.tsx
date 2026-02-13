import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  priority?: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * OptimizedImage - A performance-optimized image component with lazy loading,
 * WebP support, and blur-up loading effect
 */
export function OptimizedImage({
  src,
  alt,
  className,
  width,
  height,
  loading = 'lazy',
  priority = false,
  objectFit = 'cover',
  placeholder = 'blur',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority || loading === 'eager');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, loading]);

  // Generate WebP source
  const webpSrc = src.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const hasWebP = !src.endsWith('.svg') && !src.endsWith('.gif');

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    onError?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={{ width, height }}
    >
      {/* Placeholder/Blur effect */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ filter: 'blur(20px)' }}
        />
      )}

      {/* Actual Image */}
      {isInView && (
        <picture>
          {hasWebP && (
            <source
              srcSet={webpSrc}
              type="image/webp"
            />
          )}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={loading}
            decoding={priority ? 'sync' : 'async'}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0',
              objectFit && `object-${objectFit}`
            )}
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit 
            }}
          />
        </picture>
      )}
    </div>
  );
}