import { useState, useEffect, useCallback } from 'react';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
  searchType?: 'rent' | 'buy';
}

const STORAGE_KEY = 'airea_search_history';
const MAX_HISTORY_ITEMS = 10;

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      } catch (e) {
        console.error('Failed to parse search history', e);
        setHistory([]);
      }
    }
  }, []);

  const addSearch = useCallback((query: string, searchType?: 'rent' | 'buy', resultCount?: number) => {
    if (!query.trim()) return;
    
    const normalizedQuery = query.trim().toLowerCase();
    
    setHistory(prev => {
      const filtered = prev.filter(item => item.query.toLowerCase() !== normalizedQuery);
      
      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        searchType,
        resultCount,
      };
      
      const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      return updated;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.query !== query);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  }, []);

  const getRelativeTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  }, []);

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory,
    getRelativeTime,
  };
}
