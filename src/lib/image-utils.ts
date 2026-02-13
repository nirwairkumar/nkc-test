/**
 * Image utility functions for performance optimization
 */

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate responsive image srcSet
 */
export function generateSrcSet(
  src: string, 
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  const ext = src.split('.').pop();
  return widths
    .map(w => `${src.replace(`.${ext}`, `-${w}.${ext}`)} ${w}w`)
    .join(', ');
}