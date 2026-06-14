import { useState, useMemo, useCallback, useEffect } from 'react';
import { NFTListing } from '../types/marketplace';
import { SearchFilters } from '../components/search/AdvancedSearch';
import { performanceMonitor } from '../utils/performance';

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  priceRange: [0, 1000],
  categories: [],
  rarity: [],
  sortBy: 'newest',
  collections: [],
  attributes: {},
  dateRange: [null, null],
};

export const useAdvancedSearch = (nfts: NFTListing[]) => {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Extract available collections and attributes from NFTs
  const { availableCollections, availableAttributes } = useMemo(() => {
    const collections = new Set<string>();
    const attributes: Record<string, Set<string>> = {};

    nfts.forEach(nft => {
      // Extract collection names
      if (nft.metadata.collection?.name) {
        collections.add(nft.metadata.collection.name);
      }

      // Extract attributes
      if (nft.metadata.attributes) {
        nft.metadata.attributes.forEach(attr => {
          if (!attributes[attr.trait_type]) {
            attributes[attr.trait_type] = new Set();
          }
          attributes[attr.trait_type].add(attr.value);
        });
      }
    });

    return {
      availableCollections: Array.from(collections).sort(),
      availableAttributes: Object.fromEntries(
        Object.entries(attributes).map(([key, values]) => [
          key,
          Array.from(values).sort()
        ])
      ),
    };
  }, [nfts]);

  // Filter and sort NFTs based on current filters
  const filteredNFTs = useMemo(() => {
    const startTime = performance.now();
    
    let filtered = nfts.filter(nft => {
      // Text search
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const searchText = [
          nft.metadata.name,
          nft.metadata.description,
          nft.metadata.collection?.name,
          nft.seller,
        ].join(' ').toLowerCase();
        
        if (!searchText.includes(query)) {
          return false;
        }
      }

      // Price range
      if (nft.price < filters.priceRange[0] || nft.price > filters.priceRange[1]) {
        return false;
      }

      // Rarity filter
      if (filters.rarity.length > 0) {
        const nftRarity = nft.metadata.attributes?.find(
          attr => attr.trait_type === 'Rarity'
        )?.value;
        if (!nftRarity || !filters.rarity.includes(nftRarity)) {
          return false;
        }
      }

      // Collections filter
      if (filters.collections.length > 0) {
        if (!nft.metadata.collection?.name || 
            !filters.collections.includes(nft.metadata.collection.name)) {
          return false;
        }
      }

      // Attributes filter
      if (Object.keys(filters.attributes).length > 0) {
        for (const [traitType, requiredValues] of Object.entries(filters.attributes)) {
          if (requiredValues.length === 0) continue;
          
          const nftAttribute = nft.metadata.attributes?.find(
            attr => attr.trait_type === traitType
          );
          
          if (!nftAttribute || !requiredValues.includes(nftAttribute.value)) {
            return false;
          }
        }
      }

      // Date range filter
      if (filters.dateRange[0] || filters.dateRange[1]) {
        const nftDate = new Date(nft.createdAt);
        
        if (filters.dateRange[0] && nftDate < filters.dateRange[0]) {
          return false;
        }
        
        if (filters.dateRange[1] && nftDate > filters.dateRange[1]) {
          return false;
        }
      }

      return true;
    });

    // Sort results
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name_asc':
          return a.metadata.name.localeCompare(b.metadata.name);
        case 'name_desc':
          return b.metadata.name.localeCompare(a.metadata.name);
        default:
          return 0;
      }
    });

    const endTime = performance.now();
    performanceMonitor.recordMetric('search_filter_time', endTime - startTime, {
      resultsCount: filtered.length,
      totalNFTs: nfts.length,
      hasQuery: !!filters.query,
      activeFilters: Object.keys(filters).filter(key => {
        const value = filters[key as keyof SearchFilters];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value !== '';
        if (typeof value === 'object' && value !== null) {
          return Object.keys(value).length > 0;
        }
        return false;
      }).length,
    });

    return filtered;
  }, [nfts, filters]);

  // Search suggestions based on history and current query
  const searchSuggestions = useMemo(() => {
    if (!filters.query || filters.query.length < 2) return [];
    
    const query = filters.query.toLowerCase();
    const suggestions = new Set<string>();
    
    // Add from search history
    searchHistory
      .filter(term => term.toLowerCase().includes(query) && term !== filters.query)
      .slice(0, 3)
      .forEach(term => suggestions.add(term));
    
    // Add NFT names that match
    nfts
      .filter(nft => 
        nft.metadata.name.toLowerCase().includes(query) && 
        !suggestions.has(nft.metadata.name)
      )
      .slice(0, 5)
      .forEach(nft => suggestions.add(nft.metadata.name));
    
    // Add collection names that match
    availableCollections
      .filter(collection => 
        collection.toLowerCase().includes(query) && 
        !suggestions.has(collection)
      )
      .slice(0, 3)
      .forEach(collection => suggestions.add(collection));
    
    return Array.from(suggestions).slice(0, 8);
  }, [filters.query, searchHistory, nfts, availableCollections]);

  // Update filters with performance tracking
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    
    // Add to search history if query changed
    if (newFilters.query && newFilters.query !== filters.query && newFilters.query.length > 2) {
      setSearchHistory(prev => {
        const newHistory = [newFilters.query!, ...prev.filter(term => term !== newFilters.query)];
        return newHistory.slice(0, 10); // Keep only last 10 searches
      });
    }
  }, [filters.query]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Save search to history
  const saveSearchToHistory = useCallback((query: string) => {
    if (query.length > 2) {
      setSearchHistory(prev => {
        const newHistory = [query, ...prev.filter(term => term !== query)];
        return newHistory.slice(0, 10);
      });
    }
  }, []);

  // Quick filter presets
  const applyQuickFilter = useCallback((preset: string) => {
    switch (preset) {
      case 'low_price':
        updateFilters({ priceRange: [0, 1], sortBy: 'price_asc' });
        break;
      case 'high_price':
        updateFilters({ priceRange: [10, 1000], sortBy: 'price_desc' });
        break;
      case 'rare':
        updateFilters({ rarity: ['Rare', 'Epic', 'Legendary'] });
        break;
      case 'recent':
        updateFilters({ sortBy: 'newest' });
        break;
      default:
        break;
    }
  }, [updateFilters]);

  // Search statistics
  const searchStats = useMemo(() => ({
    totalResults: filteredNFTs.length,
    totalNFTs: nfts.length,
    filteredPercentage: nfts.length > 0 ? (filteredNFTs.length / nfts.length) * 100 : 0,
    averagePrice: filteredNFTs.length > 0 
      ? filteredNFTs.reduce((sum, nft) => sum + nft.price, 0) / filteredNFTs.length 
      : 0,
    priceRange: filteredNFTs.length > 0 
      ? {
          min: Math.min(...filteredNFTs.map(nft => nft.price)),
          max: Math.max(...filteredNFTs.map(nft => nft.price)),
        }
      : { min: 0, max: 0 },
  }), [filteredNFTs, nfts]);

  // Auto-save search state to localStorage
  useEffect(() => {
    const searchState = {
      filters,
      searchHistory,
    };
    localStorage.setItem('nft_search_state', JSON.stringify(searchState));
  }, [filters, searchHistory]);

  // Load search state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('nft_search_state');
      if (savedState) {
        const { filters: savedFilters, searchHistory: savedHistory } = JSON.parse(savedState);
        if (savedFilters) {
          setFilters(prev => ({ ...prev, ...savedFilters, query: '' })); // Don't restore query
        }
        if (savedHistory) {
          setSearchHistory(savedHistory);
        }
      }
    } catch (error) {
      console.error('Failed to load search state:', error);
    }
  }, []);

  return {
    filters,
    filteredNFTs,
    searchSuggestions,
    searchStats,
    availableCollections,
    availableAttributes,
    updateFilters,
    clearFilters,
    saveSearchToHistory,
    applyQuickFilter,
    searchHistory,
  };
};