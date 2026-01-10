import { useState, useEffect, useCallback, useMemo } from 'react';

export interface VirtualScrollOptions {
  itemHeight: number; // Fixed height for each item
  containerHeight: number; // Height of the scrollable container
  overscan?: number; // Number of items to render outside the visible area (default: 5)
  threshold?: number; // Threshold for loading more items (default: 3)
}

export interface VirtualScrollState<T> {
  items: T[];
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  offsetY: number;
  totalHeight: number;
  shouldLoadMore: boolean;
}

export interface UseVirtualScrollResult<T> {
  virtualState: VirtualScrollState<T>;
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  containerProps: {
    style: React.CSSProperties;
  };
  itemProps: (index: number) => {
    style: React.CSSProperties;
    'data-index': number;
  };
  loadMore: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions,
  onLoadMore?: () => void
): UseVirtualScrollResult<T> {
  const { itemHeight, containerHeight, overscan = 5, threshold = 3 } = options;
  
  const [scrollTop, setScrollTop] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate visible range
  const { startIndex, endIndex, offsetY, visibleItems, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    
    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;

    return {
      startIndex,
      endIndex,
      offsetY,
      visibleItems,
      totalHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  // Check if we should load more items
  const shouldLoadMore = useMemo(() => {
    if (!onLoadMore || isLoading) return false;
    
    const remainingItems = items.length - endIndex;
    return remainingItems <= threshold;
  }, [items.length, endIndex, threshold, onLoadMore, isLoading]);

  // Trigger load more when threshold is reached
  useEffect(() => {
    if (shouldLoadMore && onLoadMore) {
      console.log(`📥 VIRTUAL SCROLL: Loading more items (${items.length} current, endIndex: ${endIndex})`);
      onLoadMore();
    }
  }, [shouldLoadMore, onLoadMore, items.length, endIndex]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  const loadMore = useCallback(() => {
    if (onLoadMore && !isLoading) {
      onLoadMore();
    }
  }, [onLoadMore, isLoading]);

  const virtualState: VirtualScrollState<T> = {
    items,
    visibleItems,
    startIndex,
    endIndex,
    offsetY,
    totalHeight,
    shouldLoadMore
  };

  const scrollElementProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflowY: 'auto' as const,
      position: 'relative' as const,
    }
  };

  const containerProps = {
    style: {
      height: totalHeight,
      position: 'relative' as const,
    }
  };

  const itemProps = useCallback((index: number) => ({
    style: {
      position: 'absolute' as const,
      top: (startIndex + index) * itemHeight,
      left: 0,
      right: 0,
      height: itemHeight,
    },
    'data-index': startIndex + index
  }), [startIndex, itemHeight]);

  return {
    virtualState,
    scrollElementProps,
    containerProps,
    itemProps,
    loadMore,
    isLoading,
    setIsLoading
  };
}

// Enhanced pagination hook for non-virtual scrolling scenarios
export interface UsePaginationOptions {
  itemsPerPage: number;
  totalItems: number;
  onPageChange?: (page: number) => void;
  preloadPages?: number; // Number of pages to preload (default: 1)
}

export interface UsePaginationResult {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
  pageItems: number[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export function usePagination(options: UsePaginationOptions): UsePaginationResult {
  const { itemsPerPage, totalItems, onPageChange, preloadPages = 1 } = options;
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  // Calculate visible page items for current page
  const pageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    return Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
  }, [currentPage, itemsPerPage, totalItems]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
      if (onPageChange) {
        onPageChange(page);
      }

      // Preload adjacent pages for better UX
      const pagesToPreload = [];
      for (let i = 1; i <= preloadPages; i++) {
        if (page + i <= totalPages) pagesToPreload.push(page + i);
        if (page - i >= 1) pagesToPreload.push(page - i);
      }

      // Trigger preloading for adjacent pages (implementation depends on your API)
      pagesToPreload.forEach(preloadPage => {
        console.log(`🔄 PAGINATION: Preloading page ${preloadPage}`);
        // You can implement preloading logic here if needed
      });
    }
  }, [currentPage, totalPages, onPageChange, preloadPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, hasNextPage, goToPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, hasPreviousPage, goToPage]);

  return {
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    pageItems,
    isLoading,
    setIsLoading
  };
}

// Intersection Observer hook for infinite scrolling
export function useInfiniteScroll(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  const [isFetching, setIsFetching] = useState(false);
  const [targetRef, setTargetRef] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!targetRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetching) {
          console.log('📥 INFINITE SCROLL: Loading more items');
          setIsFetching(true);
          callback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options
      }
    );

    observer.observe(targetRef);

    return () => {
      observer.disconnect();
    };
  }, [targetRef, callback, isFetching, options]);

  // Helper to set fetching state back to false after loading
  const setFetchingComplete = useCallback(() => {
    setIsFetching(false);
  }, []);

  return { setTargetRef, isFetching, setFetchingComplete };
}

// Performance-optimized list component data
export interface OptimizedListOptions<T> {
  items: T[];
  itemHeight?: number; // If provided, enables virtual scrolling
  containerHeight?: number; // Required for virtual scrolling
  pageSize?: number; // If virtual scrolling is disabled, use pagination
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore?: () => void;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

// Factory function to determine the best rendering strategy
export function getOptimalRenderingStrategy<T>(
  itemCount: number,
  containerHeight?: number,
  itemHeight?: number
): 'virtual' | 'pagination' | 'simple' {
  // Use virtual scrolling for large datasets with known item heights
  if (itemCount > 100 && containerHeight && itemHeight) {
    return 'virtual';
  }
  
  // Use pagination for medium datasets
  if (itemCount > 50) {
    return 'pagination';
  }
  
  // Simple rendering for small datasets
  return 'simple';
}