'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  quality?: number;
}

/**
 * Optimized Lazy Loading Image Component
 * Uses Intersection Observer for efficient lazy loading
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fill = false,
  sizes,
  quality = 75,
}: LazyImageProps) {
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          sizes={sizes}
          quality={quality}
          loading={priority ? 'eager' : 'lazy'}
          className="object-cover"
        />
      ) : (
        <div
          className="bg-gray-200 animate-pulse"
          style={{ width, height: fill ? '100%' : height }}
          role="img"
          aria-label={`Loading ${alt}`}
        />
      )}
    </div>
  );
}
