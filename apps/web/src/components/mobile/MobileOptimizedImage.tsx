'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface MobileOptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '21:9' | 'auto';
  lazy?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
}

/**
 * Mobile-optimized image component with lazy loading and responsive sizing
 */
export function MobileOptimizedImage({
  src,
  alt,
  className,
  priority = false,
  quality = 75,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  aspectRatio = 'auto',
  lazy = true,
  placeholder = 'empty',
  blurDataURL,
}: MobileOptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lazy || priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, priority]);

  const aspectRatioClasses = {
    '1:1': 'aspect-square',
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    '21:9': 'aspect-[21/9]',
    auto: '',
  };

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden bg-gray-100',
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {isInView && (
        <>
          {/* Skeleton loader */}
          {!isLoaded && <div className="absolute inset-0 animate-pulse bg-gray-200" />}

          {/* Image */}
          <Image
            src={src}
            alt={alt}
            fill
            className={cn(
              'object-cover transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            priority={priority}
            quality={quality}
            sizes={sizes}
            placeholder={placeholder}
            blurDataURL={blurDataURL}
            onLoad={() => setIsLoaded(true)}
          />
        </>
      )}
    </div>
  );
}

/**
 * Picture element for art-directed responsive images
 */
interface ResponsivePictureProps {
  sources: {
    media: string;
    srcSet: string;
  }[];
  fallbackSrc: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}

export function ResponsivePicture({
  sources,
  fallbackSrc,
  alt,
  className,
  loading = 'lazy',
}: ResponsivePictureProps) {
  return (
    <picture className={className}>
      {sources.map((source, index) => (
        <source key={index} media={source.media} srcSet={source.srcSet} />
      ))}
      <img src={fallbackSrc} alt={alt} loading={loading} className="w-full h-auto" />
    </picture>
  );
}
