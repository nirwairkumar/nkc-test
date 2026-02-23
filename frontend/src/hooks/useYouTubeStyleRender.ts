import { useState, useEffect, useRef, useCallback } from 'react';

interface UseYouTubeStyleRenderOptions {
  rootMargin?: string;
  threshold?: number;
}

export function useYouTubeStyleRender<T>(
  items: T[],
  isLoading: boolean,
  options: UseYouTubeStyleRenderOptions = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1
  } = options;

  const [visibleItemIds, setVisibleItemIds] = useState<Set<string>>(new Set());
  const [renderedItems, setRenderedItems] = useState<Map<string, T>>(new Map());
  const observersRef = useRef<Map<string, IntersectionObserver>>(new Map());

  // Clear all observers on unmount
  useEffect(() => {
    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current.clear();
    };
  }, []);

  // Reset when items change
  useEffect(() => {
    observersRef.current.forEach(observer => observer.disconnect());
    observersRef.current.clear();
    setVisibleItemIds(new Set());
    setRenderedItems(new Map());
  }, [items]);

  // Create observer for a specific item
  const createObserver = useCallback((itemId: string, element: HTMLElement) => {
    if (observersRef.current.has(itemId)) {
      observersRef.current.get(itemId)?.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Item is visible, mark it
            setVisibleItemIds(prev => {
              const newSet = new Set(prev);
              newSet.add(itemId);
              return newSet;
            });

            // Add to rendered items with a small delay for animation
            const item = items.find((i: any) => (i.id || i) === itemId);
            if (item) {
              setTimeout(() => {
                setRenderedItems(prev => {
                  const newMap = new Map(prev);
                  newMap.set(itemId, item);
                  return newMap;
                });
              }, 50);
            }

            // Stop observing once visible
            observer.disconnect();
            observersRef.current.delete(itemId);
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);
    observersRef.current.set(itemId, observer);
  }, [items, rootMargin, threshold]);

  // Register a skeleton element to be observed
  const registerSkeleton = useCallback((itemId: string, element: HTMLElement | null) => {
    if (!element || isLoading) return;

    // If already rendered, don't observe
    if (renderedItems.has(itemId)) return;

    createObserver(itemId, element);
  }, [createObserver, isLoading, renderedItems]);

  const isItemVisible = useCallback((itemId: string) => {
    return visibleItemIds.has(itemId);
  }, [visibleItemIds]);

  const isItemRendered = useCallback((itemId: string) => {
    return renderedItems.has(itemId);
  }, [renderedItems]);

  const getRenderedItem = useCallback((itemId: string) => {
    return renderedItems.get(itemId);
  }, [renderedItems]);

  const renderedCount = renderedItems.size;
  const totalCount = items.length;
  const isComplete = renderedCount >= totalCount;

  return {
    registerSkeleton,
    isItemVisible,
    isItemRendered,
    getRenderedItem,
    renderedCount,
    totalCount,
    isComplete
  };
}
