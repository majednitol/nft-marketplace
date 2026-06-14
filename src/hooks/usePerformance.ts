import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor, usePerformanceMonitor } from '../utils/performance';

// Hook to measure component mount/unmount times
export const useComponentPerformance = (componentName: string) => {
  const mountTime = useRef<number>(0);
  
  useEffect(() => {
    mountTime.current = performance.now();
    performanceMonitor.recordMetric(`${componentName}_mount`, 0);
    
    return () => {
      const unmountTime = performance.now();
      const totalTime = unmountTime - mountTime.current;
      performanceMonitor.recordMetric(`${componentName}_unmount`, totalTime);
    };
  }, [componentName]);
};

// Hook to measure render performance
export const useRenderPerformance = (componentName: string) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>(0);
  
  useEffect(() => {
    renderCount.current += 1;
    const currentTime = performance.now();
    
    if (lastRenderTime.current > 0) {
      const timeSinceLastRender = currentTime - lastRenderTime.current;
      performanceMonitor.recordMetric(`${componentName}_render_interval`, timeSinceLastRender, {
        renderCount: renderCount.current,
      });
    }
    
    lastRenderTime.current = currentTime;
    performanceMonitor.recordMetric(`${componentName}_render`, renderCount.current);
  });
};

// Hook to measure async operations
export const useAsyncPerformance = () => {
  const monitor = usePerformanceMonitor();
  
  const measureAsync = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    return monitor.time(operationName, operation, metadata);
  }, [monitor]);
  
  return { measureAsync };
};

// Hook to measure user interactions
export const useInteractionPerformance = () => {
  const measureClick = useCallback((elementName: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(`click_${elementName}`, performance.now(), {
      ...metadata,
      interactionType: 'click',
    });
  }, []);
  
  const measureHover = useCallback((elementName: string, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(`hover_${elementName}`, performance.now(), {
      ...metadata,
      interactionType: 'hover',
    });
  }, []);
  
  const measureScroll = useCallback((elementName: string, scrollPosition: number, metadata?: Record<string, any>) => {
    performanceMonitor.recordMetric(`scroll_${elementName}`, scrollPosition, {
      ...metadata,
      interactionType: 'scroll',
    });
  }, []);
  
  return { measureClick, measureHover, measureScroll };
};

// Hook to measure data fetching performance
export const useDataFetchPerformance = () => {
  const measureFetch = useCallback(async <T>(
    endpoint: string,
    fetchFn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await fetchFn();
      const endTime = performance.now();
      
      performanceMonitor.recordMetric(`fetch_${endpoint}`, endTime - startTime, {
        ...metadata,
        success: true,
        endpoint,
      });
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      
      performanceMonitor.recordMetric(`fetch_${endpoint}_error`, endTime - startTime, {
        ...metadata,
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw error;
    }
  }, []);
  
  return { measureFetch };
};

// Hook to measure memory usage
export const useMemoryPerformance = (intervalMs: number = 5000) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) return;
    
    const measureMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        performanceMonitor.recordMetric('memory_used', memory.usedJSHeapSize, {
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });
      }
    };
    
    measureMemory(); // Initial measurement
    const interval = setInterval(measureMemory, intervalMs);
    
    return () => {
      clearInterval(interval);
    };
  }, [intervalMs]);
};

// Hook to measure bundle size impact
export const useBundlePerformance = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Measure when resources finish loading
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let imgSize = 0;
      
      resources.forEach((resource: any) => {
        if (resource.transferSize) {
          totalSize += resource.transferSize;
          
          if (resource.name.endsWith('.js')) {
            jsSize += resource.transferSize;
          } else if (resource.name.endsWith('.css')) {
            cssSize += resource.transferSize;
          } else if (resource.initiatorType === 'img') {
            imgSize += resource.transferSize;
          }
        }
      });
      
      performanceMonitor.recordMetric('bundle_total_size', totalSize);
      performanceMonitor.recordMetric('bundle_js_size', jsSize);
      performanceMonitor.recordMetric('bundle_css_size', cssSize);
      performanceMonitor.recordMetric('bundle_img_size', imgSize);
    });
  }, []);
};

// Hook to measure React Query performance
export const useQueryPerformance = () => {
  const measureQuery = useCallback(<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    metadata?: Record<string, any>
  ) => {
    return performanceMonitor.time(`query_${queryKey}`, queryFn, metadata);
  }, []);
  
  const measureMutation = useCallback(<T>(
    mutationName: string,
    mutationFn: () => Promise<T>,
    metadata?: Record<string, any>
  ) => {
    return performanceMonitor.time(`mutation_${mutationName}`, mutationFn, metadata);
  }, []);
  
  return { measureQuery, measureMutation };
};