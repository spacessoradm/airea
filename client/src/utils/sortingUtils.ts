import type { Property, Agent } from "@shared/schema";

export interface SortOption {
  value: string;
  label: string;
  clientSide: boolean; // Can this be sorted client-side efficiently?
  requiresData: string[]; // What property fields are required for this sort
}

export interface SortPerformanceMetrics {
  sortType: string;
  method: 'client' | 'server';
  itemCount: number;
  duration: number;
  timestamp: number;
}

export interface SortResult<T> {
  sortedData: T[];
  method: 'client' | 'server';
  duration: number;
  cached?: boolean;
}

// Available sorting options with their characteristics
export const SORT_OPTIONS: SortOption[] = [
  {
    value: 'newest',
    label: 'Newest First',
    clientSide: true,
    requiresData: ['createdAt']
  },
  {
    value: 'oldest', 
    label: 'Oldest First',
    clientSide: true,
    requiresData: ['createdAt']
  },
  {
    value: 'price_asc',
    label: 'Price: Low to High',
    clientSide: true,
    requiresData: ['price']
  },
  {
    value: 'price_desc',
    label: 'Price: High to Low', 
    clientSide: true,
    requiresData: ['price']
  },
  {
    value: 'size_asc',
    label: 'Size: Small to Large',
    clientSide: true,
    requiresData: ['squareFeet']
  },
  {
    value: 'size_desc',
    label: 'Size: Large to Small',
    clientSide: true,
    requiresData: ['squareFeet']
  },
  {
    value: 'bedrooms_asc',
    label: 'Bedrooms: Low to High',
    clientSide: true,
    requiresData: ['bedrooms']
  },
  {
    value: 'bedrooms_desc',
    label: 'Bedrooms: High to Low',
    clientSide: true,
    requiresData: ['bedrooms']
  },
  {
    value: 'price_per_sqft_asc',
    label: 'Price per sq ft: Low to High',
    clientSide: true,
    requiresData: ['price', 'squareFeet']
  },
  {
    value: 'price_per_sqft_desc',
    label: 'Price per sq ft: High to Low',
    clientSide: true,
    requiresData: ['price', 'squareFeet']
  },
  {
    value: 'relevance',
    label: 'Most Relevant',
    clientSide: false, // Requires AI/search scoring from server
    requiresData: []
  },
  {
    value: 'distance',
    label: 'Distance (Nearest)',
    clientSide: false, // Requires complex geospatial calculations
    requiresData: []
  }
];

// Cache for sorted results to avoid recomputation
const sortCache = new Map<string, { data: any[], timestamp: number, method: 'client' | 'server' }>();
const CACHE_DURATION = 60 * 1000; // 1 minute cache

// Performance metrics storage
const performanceMetrics: SortPerformanceMetrics[] = [];
const MAX_METRICS = 100; // Keep last 100 sort operations for analysis

export class IntelligentSorter<T extends Property & { agent: Agent }> {
  private data: T[] = [];
  private isDataComplete: boolean = false;
  private progressiveLoadingActive: boolean = false;

  constructor(initialData: T[] = [], isComplete: boolean = false) {
    this.data = [...initialData];
    this.isDataComplete = isComplete;
  }

  // Update data (for progressive loading scenarios)
  updateData(newData: T[], isComplete: boolean = false) {
    this.data = [...newData];
    this.isDataComplete = isComplete;
    this.progressiveLoadingActive = !isComplete;
  }

  // Append data (for progressive loading)
  appendData(additionalData: T[]) {
    this.data = [...this.data, ...additionalData];
  }

  markComplete() {
    this.isDataComplete = true;
    this.progressiveLoadingActive = false;
  }

  // Intelligent sorting decision logic
  shouldUseClientSideSort(sortType: string, dataSize: number): boolean {
    const sortOption = SORT_OPTIONS.find(opt => opt.value === sortType);
    
    if (!sortOption) return false;
    
    // Can't do client-side if sort type doesn't support it
    if (!sortOption.clientSide) return false;
    
    // For progressive loading, use client-side only if data is complete
    if (this.progressiveLoadingActive && !this.isDataComplete) return false;
    
    // Check if we have all required data fields
    const hasRequiredData = sortOption.requiresData.every(field => 
      this.data.length === 0 || this.data[0].hasOwnProperty(field)
    );
    
    if (!hasRequiredData) return false;
    
    // Performance thresholds based on data size
    if (dataSize <= 50) return true; // Always use client-side for small datasets
    if (dataSize <= 200) return true; // Usually faster for medium datasets
    if (dataSize <= 500) {
      // For larger datasets, check historical performance
      const recentMetrics = this.getRecentPerformanceMetrics(sortType);
      if (recentMetrics.length > 0) {
        const avgClientTime = recentMetrics
          .filter(m => m.method === 'client')
          .reduce((sum, m) => sum + m.duration, 0) / recentMetrics.filter(m => m.method === 'client').length;
        
        const avgServerTime = recentMetrics
          .filter(m => m.method === 'server')
          .reduce((sum, m) => sum + m.duration, 0) / recentMetrics.filter(m => m.method === 'server').length;
          
        // Use client-side if it's historically faster
        return avgClientTime < avgServerTime;
      }
      return true; // Default to client-side for medium-large datasets
    }
    
    // For very large datasets (>500), prefer server-side unless we know client is faster
    return false;
  }

  // Client-side sorting implementation
  sortClientSide(sortType: string): SortResult<T> {
    const startTime = performance.now();
    const cacheKey = `${sortType}_${this.data.length}_${this.data.length > 0 ? this.data[0].id : 'empty'}`;
    
    // Check cache first
    const cached = sortCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const duration = performance.now() - startTime;
      this.recordMetrics(sortType, 'client', this.data.length, duration);
      return {
        sortedData: cached.data as T[],
        method: 'client',
        duration,
        cached: true
      };
    }

    let sortedData = [...this.data];

    switch (sortType) {
      case 'newest':
        sortedData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'oldest':
        sortedData.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        break;
      case 'price_asc':
        sortedData.sort((a, b) => parseFloat(a.price || '0') - parseFloat(b.price || '0'));
        break;
      case 'price_desc':
        sortedData.sort((a, b) => parseFloat(b.price || '0') - parseFloat(a.price || '0'));
        break;
      case 'size_asc':
        sortedData.sort((a, b) => (a.squareFeet || 0) - (b.squareFeet || 0));
        break;
      case 'size_desc':
        sortedData.sort((a, b) => (b.squareFeet || 0) - (a.squareFeet || 0));
        break;
      case 'bedrooms_asc':
        sortedData.sort((a, b) => (a.bedrooms || 0) - (b.bedrooms || 0));
        break;
      case 'bedrooms_desc':
        sortedData.sort((a, b) => (b.bedrooms || 0) - (a.bedrooms || 0));
        break;
      case 'price_per_sqft_asc':
        sortedData.sort((a, b) => {
          const pricePerSqftA = (a.squareFeet && a.squareFeet > 0) ? parseFloat(a.price || '0') / a.squareFeet : 0;
          const pricePerSqftB = (b.squareFeet && b.squareFeet > 0) ? parseFloat(b.price || '0') / b.squareFeet : 0;
          return pricePerSqftA - pricePerSqftB;
        });
        break;
      case 'price_per_sqft_desc':
        sortedData.sort((a, b) => {
          const pricePerSqftA = (a.squareFeet && a.squareFeet > 0) ? parseFloat(a.price || '0') / a.squareFeet : 0;
          const pricePerSqftB = (b.squareFeet && b.squareFeet > 0) ? parseFloat(b.price || '0') / b.squareFeet : 0;
          return pricePerSqftB - pricePerSqftA;
        });
        break;
      default:
        // Default to newest
        sortedData.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    const duration = performance.now() - startTime;
    
    // Cache the result
    sortCache.set(cacheKey, {
      data: sortedData,
      timestamp: Date.now(),
      method: 'client'
    });

    // Record performance metrics
    this.recordMetrics(sortType, 'client', this.data.length, duration);

    return {
      sortedData,
      method: 'client',
      duration,
      cached: false
    };
  }

  // Server-side sorting implementation (triggers API call)
  async sortServerSide(
    sortType: string, 
    apiCall: (sortBy: string) => Promise<T[]>
  ): Promise<SortResult<T>> {
    const startTime = performance.now();
    
    try {
      const sortedData = await apiCall(sortType);
      const duration = performance.now() - startTime;
      
      // Update our data with server-sorted results
      this.data = sortedData;
      
      // Record performance metrics
      this.recordMetrics(sortType, 'server', sortedData.length, duration);
      
      return {
        sortedData,
        method: 'server',
        duration,
        cached: false
      };
    } catch (error) {
      console.error('Server-side sorting failed:', error);
      // Fallback to client-side sorting
      const duration = performance.now() - startTime;
      this.recordMetrics(sortType, 'server', this.data.length, duration);
      
      return this.sortClientSide(sortType);
    }
  }

  // Main sort method that intelligently chooses approach
  async sort(
    sortType: string,
    apiCall?: (sortBy: string) => Promise<T[]>
  ): Promise<SortResult<T>> {
    const useClientSide = this.shouldUseClientSideSort(sortType, this.data.length);
    
    console.log(`🔧 SORT DECISION: ${sortType} with ${this.data.length} items → ${useClientSide ? 'CLIENT' : 'SERVER'} side`);
    
    if (useClientSide) {
      return this.sortClientSide(sortType);
    } else if (apiCall) {
      return await this.sortServerSide(sortType, apiCall);
    } else {
      // Fallback to client-side if no API call provided
      console.warn('No API call provided for server-side sort, falling back to client-side');
      return this.sortClientSide(sortType);
    }
  }

  // Performance tracking
  private recordMetrics(sortType: string, method: 'client' | 'server', itemCount: number, duration: number) {
    performanceMetrics.push({
      sortType,
      method,
      itemCount,
      duration,
      timestamp: Date.now()
    });

    // Keep only the most recent metrics
    if (performanceMetrics.length > MAX_METRICS) {
      performanceMetrics.splice(0, performanceMetrics.length - MAX_METRICS);
    }

    console.log(`📊 SORT PERFORMANCE: ${method} ${sortType} - ${itemCount} items in ${duration.toFixed(2)}ms`);
  }

  private getRecentPerformanceMetrics(sortType: string, timeWindow: number = 5 * 60 * 1000): SortPerformanceMetrics[] {
    const cutoff = Date.now() - timeWindow;
    return performanceMetrics.filter(m => m.sortType === sortType && m.timestamp > cutoff);
  }

  // Get performance analytics
  getPerformanceAnalytics(): {
    averageClientSideTime: number;
    averageServerSideTime: number;
    totalSorts: number;
    recentSorts: SortPerformanceMetrics[];
  } {
    const recentMetrics = performanceMetrics.filter(m => Date.now() - m.timestamp < 5 * 60 * 1000);
    
    const clientMetrics = recentMetrics.filter(m => m.method === 'client');
    const serverMetrics = recentMetrics.filter(m => m.method === 'server');
    
    return {
      averageClientSideTime: clientMetrics.length > 0 
        ? clientMetrics.reduce((sum, m) => sum + m.duration, 0) / clientMetrics.length 
        : 0,
      averageServerSideTime: serverMetrics.length > 0 
        ? serverMetrics.reduce((sum, m) => sum + m.duration, 0) / serverMetrics.length 
        : 0,
      totalSorts: performanceMetrics.length,
      recentSorts: recentMetrics
    };
  }
}

// Utility function to clear sort cache
export function clearSortCache() {
  sortCache.clear();
}

// Export performance metrics for debugging
export function getPerformanceMetrics(): SortPerformanceMetrics[] {
  return [...performanceMetrics];
}