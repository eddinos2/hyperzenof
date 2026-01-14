import { useMemo, useState } from 'react';

interface SearchOptions<T> {
  data: T[];
  searchFields: (keyof T | ((item: T) => string))[];
  filters?: Record<string, (item: T, value: any) => boolean>;
}

export function useAdvancedSearch<T>({ data, searchFields, filters = {} }: SearchOptions<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  const filteredData = useMemo(() => {
    let result = data;

    // Apply search term
    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      result = result.filter(item => 
        searchFields.some(field => {
          let value = '';
          if (typeof field === 'function') {
            value = field(item);
          } else {
            value = String(item[field] || '');
          }
          return value.toLowerCase().includes(normalizedSearch);
        })
      );
    }

    // Apply filters
    Object.entries(activeFilters).forEach(([filterKey, filterValue]) => {
      if (filterValue !== undefined && filterValue !== null && filterValue !== 'all') {
        const filterFn = filters[filterKey];
        if (filterFn) {
          result = result.filter(item => filterFn(item, filterValue));
        }
      }
    });

    return result;
  }, [data, searchTerm, activeFilters, searchFields, filters]);

  const setFilter = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
    setSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    activeFilters,
    setFilter,
    clearFilters,
    filteredData,
    totalCount: data.length,
    filteredCount: filteredData.length
  };
}