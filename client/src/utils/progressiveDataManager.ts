import type { Property, Agent } from "@shared/schema";

export interface ProgressiveDataState<T> {
  items: T[];
  totalCount?: number;
  currentBatch: number;
  isComplete: boolean;
  isLoading: boolean;
  lastUpdateTime: number;
  metadata: {
    searchQuery?: string;
    filters?: any;
    sortBy?: string;
  };
}

export interface DataManagerOptions {
  maxCacheSize?: number; // Maximum number of cached data states
  batchSize?: number; // Expected batch size for progressive loading
  deduplicate?: boolean; // Whether to deduplicate items based on ID
  sortingStrategy?: 'immediate' | 'batch-complete' | 'final'; // When to apply sorting
}

export class ProgressiveDataManager<T extends { id: string }> {
  private dataStates = new Map<string, ProgressiveDataState<T>>();
  private options: Required<DataManagerOptions>;
  private cache = new Map<string, T[]>();
  
  constructor(options: DataManagerOptions = {}) {
    this.options = {
      maxCacheSize: 50,
      batchSize: 20,
      deduplicate: true,
      sortingStrategy: 'immediate',
      ...options
    };
  }

  // Generate a unique key for the data state
  private generateKey(searchQuery: string, filters: any, sortBy?: string): string {
    return `${searchQuery}_${JSON.stringify(filters)}_${sortBy || 'default'}`;
  }

  // Create or get existing data state
  getDataState(searchQuery: string, filters: any, sortBy?: string): ProgressiveDataState<T> {
    const key = this.generateKey(searchQuery, filters, sortBy);
    
    if (!this.dataStates.has(key)) {
      this.dataStates.set(key, {
        items: [],
        currentBatch: 0,
        isComplete: false,
        isLoading: false,
        lastUpdateTime: Date.now(),
        metadata: {
          searchQuery,
          filters,
          sortBy
        }
      });
    }

    return this.dataStates.get(key)!;
  }

  // Add a batch of items to the data state
  addBatch(
    searchQuery: string, 
    filters: any, 
    newItems: T[], 
    isComplete: boolean = false,
    totalCount?: number,
    sortBy?: string
  ): ProgressiveDataState<T> {
    const key = this.generateKey(searchQuery, filters, sortBy);
    const currentState = this.getDataState(searchQuery, filters, sortBy);
    
    let updatedItems = [...currentState.items];
    
    // Deduplicate if enabled
    if (this.options.deduplicate) {
      const existingIds = new Set(currentState.items.map(item => item.id));
      const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
      updatedItems = [...currentState.items, ...uniqueNewItems];
      
      console.log(`📦 DATA MANAGER: Added ${uniqueNewItems.length} unique items (${newItems.length - uniqueNewItems.length} duplicates filtered)`);
    } else {
      updatedItems = [...currentState.items, ...newItems];
      console.log(`📦 DATA MANAGER: Added ${newItems.length} items`);
    }

    const updatedState: ProgressiveDataState<T> = {
      ...currentState,
      items: updatedItems,
      totalCount: totalCount !== undefined ? totalCount : currentState.totalCount,
      currentBatch: currentState.currentBatch + 1,
      isComplete,
      isLoading: !isComplete,
      lastUpdateTime: Date.now()
    };

    this.dataStates.set(key, updatedState);
    
    // Cache the current items for quick access
    this.cache.set(key, updatedItems);
    
    // Clean up old cache entries
    this.cleanupCache();
    
    console.log(`📊 DATA MANAGER: State updated - ${updatedState.items.length} total items, batch ${updatedState.currentBatch}, complete: ${isComplete}`);
    
    return updatedState;
  }

  // Replace entire data state (useful for server-side sorting)
  replaceData(
    searchQuery: string, 
    filters: any, 
    newItems: T[], 
    isComplete: boolean = true,
    totalCount?: number,
    sortBy?: string
  ): ProgressiveDataState<T> {
    const key = this.generateKey(searchQuery, filters, sortBy);
    
    const newState: ProgressiveDataState<T> = {
      items: newItems,
      totalCount: totalCount !== undefined ? totalCount : newItems.length,
      currentBatch: 1,
      isComplete,
      isLoading: !isComplete,
      lastUpdateTime: Date.now(),
      metadata: {
        searchQuery,
        filters,
        sortBy
      }
    };

    this.dataStates.set(key, newState);
    this.cache.set(key, newItems);
    
    console.log(`🔄 DATA MANAGER: Data replaced - ${newItems.length} items, complete: ${isComplete}`);
    
    return newState;
  }

  // Set loading state
  setLoading(searchQuery: string, filters: any, isLoading: boolean, sortBy?: string) {
    const key = this.generateKey(searchQuery, filters, sortBy);
    const currentState = this.getDataState(searchQuery, filters, sortBy);
    
    this.dataStates.set(key, {
      ...currentState,
      isLoading,
      lastUpdateTime: Date.now()
    });
  }

  // Get cached items quickly
  getCachedItems(searchQuery: string, filters: any, sortBy?: string): T[] | null {
    const key = this.generateKey(searchQuery, filters, sortBy);
    return this.cache.get(key) || null;
  }

  // Clear specific data state
  clearDataState(searchQuery: string, filters: any, sortBy?: string) {
    const key = this.generateKey(searchQuery, filters, sortBy);
    this.dataStates.delete(key);
    this.cache.delete(key);
    console.log(`🗑️ DATA MANAGER: Cleared data state for "${key}"`);
  }

  // Clear all data states
  clearAll() {
    this.dataStates.clear();
    this.cache.clear();
    console.log('🗑️ DATA MANAGER: Cleared all data states');
  }

  // Get data efficiency metrics
  getEfficiencyMetrics(): {
    totalDataStates: number;
    cacheHitRate: number;
    averageItemsPerState: number;
    oldestStateAge: number;
    memoryUsageEstimate: number;
  } {
    const states = Array.from(this.dataStates.values());
    const now = Date.now();
    
    let totalItems = 0;
    let oldestAge = 0;
    
    states.forEach(state => {
      totalItems += state.items.length;
      const age = now - state.lastUpdateTime;
      oldestAge = Math.max(oldestAge, age);
    });

    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = totalItems * 1000; // ~1KB per item estimate

    return {
      totalDataStates: this.dataStates.size,
      cacheHitRate: this.cache.size / Math.max(this.dataStates.size, 1),
      averageItemsPerState: totalItems / Math.max(states.length, 1),
      oldestStateAge: oldestAge,
      memoryUsageEstimate: estimatedMemoryUsage
    };
  }

  // Clean up old cache entries to prevent memory bloat
  private cleanupCache() {
    if (this.dataStates.size <= this.options.maxCacheSize) return;

    // Remove oldest data states
    const states = Array.from(this.dataStates.entries());
    states.sort(([, a], [, b]) => a.lastUpdateTime - b.lastUpdateTime);
    
    const toRemove = states.slice(0, states.length - this.options.maxCacheSize);
    toRemove.forEach(([key]) => {
      this.dataStates.delete(key);
      this.cache.delete(key);
    });

    console.log(`🧹 DATA MANAGER: Cleaned up ${toRemove.length} old cache entries`);
  }

  // Merge data from multiple states (useful for combining searches)
  mergeDataStates(
    targetQuery: string,
    targetFilters: any,
    sourceQueries: Array<{ query: string; filters: any; sortBy?: string }>,
    targetSortBy?: string
  ): ProgressiveDataState<T> {
    const targetKey = this.generateKey(targetQuery, targetFilters, targetSortBy);
    let mergedItems: T[] = [];
    let isComplete = true;
    let totalCount = 0;
    let maxBatch = 0;

    sourceQueries.forEach(({ query, filters, sortBy }) => {
      const sourceKey = this.generateKey(query, filters, sortBy);
      const sourceState = this.dataStates.get(sourceKey);
      
      if (sourceState) {
        mergedItems = [...mergedItems, ...sourceState.items];
        isComplete = isComplete && sourceState.isComplete;
        totalCount += sourceState.totalCount || sourceState.items.length;
        maxBatch = Math.max(maxBatch, sourceState.currentBatch);
      }
    });

    // Deduplicate merged items
    if (this.options.deduplicate) {
      const uniqueItems = new Map<string, T>();
      mergedItems.forEach(item => uniqueItems.set(item.id, item));
      mergedItems = Array.from(uniqueItems.values());
    }

    const mergedState: ProgressiveDataState<T> = {
      items: mergedItems,
      totalCount,
      currentBatch: maxBatch,
      isComplete,
      isLoading: !isComplete,
      lastUpdateTime: Date.now(),
      metadata: {
        searchQuery: targetQuery,
        filters: targetFilters,
        sortBy: targetSortBy
      }
    };

    this.dataStates.set(targetKey, mergedState);
    this.cache.set(targetKey, mergedItems);

    console.log(`🔗 DATA MANAGER: Merged ${sourceQueries.length} states into ${mergedItems.length} unique items`);

    return mergedState;
  }

  // Export data state for persistence
  exportDataState(searchQuery: string, filters: any, sortBy?: string): string {
    const key = this.generateKey(searchQuery, filters, sortBy);
    const state = this.dataStates.get(key);
    return JSON.stringify(state);
  }

  // Import data state from persistence
  importDataState(serializedState: string, searchQuery: string, filters: any, sortBy?: string) {
    const key = this.generateKey(searchQuery, filters, sortBy);
    const state = JSON.parse(serializedState) as ProgressiveDataState<T>;
    this.dataStates.set(key, state);
    this.cache.set(key, state.items);
    console.log(`📥 DATA MANAGER: Imported data state with ${state.items.length} items`);
  }
}

// Global instance for property data
export const propertyDataManager = new ProgressiveDataManager<Property & { agent: Agent }>({
  maxCacheSize: 20,
  batchSize: 20,
  deduplicate: true,
  sortingStrategy: 'immediate'
});

// Helper functions for common operations
export function getPropertyDataState(searchQuery: string, filters: any, sortBy?: string) {
  return propertyDataManager.getDataState(searchQuery, filters, sortBy);
}

export function addPropertyBatch(
  searchQuery: string,
  filters: any,
  newProperties: (Property & { agent: Agent })[],
  isComplete: boolean = false,
  totalCount?: number,
  sortBy?: string
) {
  return propertyDataManager.addBatch(searchQuery, filters, newProperties, isComplete, totalCount, sortBy);
}

export function replacePropertyData(
  searchQuery: string,
  filters: any,
  newProperties: (Property & { agent: Agent })[],
  isComplete: boolean = true,
  totalCount?: number,
  sortBy?: string
) {
  return propertyDataManager.replaceData(searchQuery, filters, newProperties, isComplete, totalCount, sortBy);
}

export function clearPropertyData(searchQuery: string, filters: any, sortBy?: string) {
  propertyDataManager.clearDataState(searchQuery, filters, sortBy);
}

export function getPropertyEfficiencyMetrics() {
  return propertyDataManager.getEfficiencyMetrics();
}