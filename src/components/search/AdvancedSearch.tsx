import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, X, ChevronDown, Tag, DollarSign, Calendar, TrendingUp, User } from 'lucide-react';
import { Button } from '../common/Button';
import { useKeyboardNavigation, useAriaExpanded } from '../../hooks/useAccessibility';
import { NFTListing } from '../../types/marketplace';

export interface SearchFilters {
  query: string;
  priceRange: [number, number];
  categories: string[];
  rarity: string[];
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'name_asc' | 'name_desc';
  collections: string[];
  attributes: Record<string, string[]>;
  dateRange: [Date | null, Date | null];
}

interface AdvancedSearchProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onClearFilters: () => void;
  availableCollections: string[];
  availableAttributes: Record<string, string[]>;
  isLoading?: boolean;
}

const RARITY_OPTIONS = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First', icon: Calendar },
  { value: 'oldest', label: 'Oldest First', icon: Calendar },
  { value: 'price_asc', label: 'Price: Low to High', icon: DollarSign },
  { value: 'price_desc', label: 'Price: High to Low', icon: DollarSign },
  { value: 'name_asc', label: 'Name: A to Z', icon: Tag },
  { value: 'name_desc', label: 'Name: Z to A', icon: Tag },
];

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  availableCollections,
  availableAttributes,
  isLoading = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { isExpanded, toggle, ariaExpanded } = useAriaExpanded(showAdvanced);
  
  const advancedRef = useKeyboardNavigation({
    onEscape: () => setShowAdvanced(false),
    trapFocus: showAdvanced,
  });

  // Update filters helper
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // Search input handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ query: e.target.value });
  }, [updateFilters]);

  // Price range handler
  const handlePriceRangeChange = useCallback((index: 0 | 1, value: number) => {
    const newRange: [number, number] = [...filters.priceRange];
    newRange[index] = value;
    updateFilters({ priceRange: newRange });
  }, [filters.priceRange, updateFilters]);

  // Multi-select handler
  const handleMultiSelectChange = useCallback((
    key: keyof Pick<SearchFilters, 'categories' | 'rarity' | 'collections'>,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[key] || [];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value);
    updateFilters({ [key]: newValues });
  }, [filters, updateFilters]);

  // Attribute filter handler
  const handleAttributeChange = useCallback((traitType: string, value: string, checked: boolean) => {
    const currentAttributes = { ...filters.attributes };
    const currentValues = currentAttributes[traitType] || [];
    
    if (checked) {
      currentAttributes[traitType] = [...currentValues, value];
    } else {
      currentAttributes[traitType] = currentValues.filter(v => v !== value);
      if (currentAttributes[traitType].length === 0) {
        delete currentAttributes[traitType];
      }
    }
    
    updateFilters({ attributes: currentAttributes });
  }, [filters.attributes, updateFilters]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 1000) count++;
    if (filters.categories.length > 0) count++;
    if (filters.rarity.length > 0) count++;
    if (filters.collections.length > 0) count++;
    if (Object.keys(filters.attributes).length > 0) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search NFTs by name, collection, or creator..."
            value={filters.query}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-12 py-3 bg-dark-400/50 border border-primary-800/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-200"
            aria-label="Search NFTs"
            disabled={isLoading}
          />
          {filters.query && (
            <button
              onClick={() => updateFilters({ query: '' })}
              className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 hover:bg-dark-300 rounded-full transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        
        {/* Quick Sort */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilters({ sortBy: e.target.value as SearchFilters['sortBy'] })}
            className="bg-transparent text-gray-300 text-sm focus:outline-none cursor-pointer"
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value} className="bg-dark-600">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Toggle & Active Count */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowAdvanced(!showAdvanced);
            toggle();
          }}
          aria-expanded={ariaExpanded}
          aria-controls="advanced-filters"
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Advanced Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </Button>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-400 hover:text-white"
          >
            Clear All Filters
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div
          id="advanced-filters"
          ref={advancedRef}
          className="bg-dark-300/50 border border-primary-800/30 rounded-xl p-6 space-y-6 animate-fade-in"
          role="region"
          aria-label="Advanced search filters"
        >
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              <DollarSign className="inline h-4 w-4 mr-2" />
              Price Range (SOL)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="min-price" className="block text-xs text-gray-400 mb-1">
                  Minimum
                </label>
                <input
                  id="min-price"
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.priceRange[0]}
                  onChange={(e) => handlePriceRangeChange(0, parseFloat(e.target.value) || 0)}
                  className="input-primary w-full"
                  placeholder="0.0"
                />
              </div>
              <div>
                <label htmlFor="max-price" className="block text-xs text-gray-400 mb-1">
                  Maximum
                </label>
                <input
                  id="max-price"
                  type="number"
                  min="0"
                  step="0.1"
                  value={filters.priceRange[1]}
                  onChange={(e) => handlePriceRangeChange(1, parseFloat(e.target.value) || 1000)}
                  className="input-primary w-full"
                  placeholder="1000.0"
                />
              </div>
            </div>
          </div>

          {/* Rarity Filter */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">
              <TrendingUp className="inline h-4 w-4 mr-2" />
              Rarity
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {RARITY_OPTIONS.map(rarity => (
                <label key={rarity} className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.rarity.includes(rarity)}
                    onChange={(e) => handleMultiSelectChange('rarity', rarity, e.target.checked)}
                    className="rounded border-gray-600 bg-dark-400 text-primary-600 focus:ring-primary-500 focus:ring-offset-dark-600"
                  />
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                    {rarity}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Collections Filter */}
          {availableCollections.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                <Tag className="inline h-4 w-4 mr-2" />
                Collections
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {availableCollections.map(collection => (
                  <label key={collection} className="flex items-center space-x-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.collections.includes(collection)}
                      onChange={(e) => handleMultiSelectChange('collections', collection, e.target.checked)}
                      className="rounded border-gray-600 bg-dark-400 text-primary-600 focus:ring-primary-500 focus:ring-offset-dark-600"
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors truncate">
                      {collection}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Attribute Filters */}
          {Object.keys(availableAttributes).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                <User className="inline h-4 w-4 mr-2" />
                Attributes
              </label>
              <div className="space-y-4 max-h-48 overflow-y-auto">
                {Object.entries(availableAttributes).map(([traitType, values]) => (
                  <div key={traitType}>
                    <h4 className="text-sm font-medium text-gray-300 mb-2 capitalize">
                      {traitType.replace('_', ' ')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {values.map(value => (
                        <label key={`${traitType}-${value}`} className="flex items-center space-x-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={filters.attributes[traitType]?.includes(value) || false}
                            onChange={(e) => handleAttributeChange(traitType, value, e.target.checked)}
                            className="rounded border-gray-600 bg-dark-400 text-primary-600 focus:ring-primary-500 focus:ring-offset-dark-600"
                          />
                          <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors truncate">
                            {value}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};