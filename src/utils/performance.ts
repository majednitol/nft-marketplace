// Performance monitoring and metrics utilities

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceObserver {
  observe: (options: any) => void;
  disconnect: () => void;
}

declare global {
  interface Window {
    PerformanceObserver?: any;
  }
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    // Enable in development or when explicitly requested
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('enable-performance-monitoring') === 'true';
    
    if (this.isEnabled && typeof window !== 'undefined') {
      this.setupObservers();
    }
  }

  private setupObservers() {
    // Observe Core Web Vitals
    this.observeWebVitals();
    
    // Observe resource loading
    this.observeResourceTiming();
    
    // Observe navigation timing
    this.observeNavigationTiming();
    
    // Custom React performance
    this.observeReactPerformance();
  }

  private observeWebVitals() {
    if (!window.PerformanceObserver) return;

    // Largest Contentful Paint (LCP)
    const lcpObserver = new window.PerformanceObserver((list: any) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url,
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    this.observers.push(lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new window.PerformanceObserver((list: any) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new window.PerformanceObserver((list: any) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric('CLS', clsValue);
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    this.observers.push(clsObserver);
  }

  private observeResourceTiming() {
    if (!window.PerformanceObserver) return;

    const resourceObserver = new window.PerformanceObserver((list: any) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (entry.initiatorType === 'img' || entry.initiatorType === 'fetch') {
          this.recordMetric(`${entry.initiatorType}_load_time`, entry.duration, {
            url: entry.name,
            size: entry.transferSize,
            cached: entry.transferSize === 0,
          });
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private observeNavigationTiming() {
    if (typeof window !== 'undefined' && window.performance.navigation) {
      const navigation = window.performance.timing;
      const loadTime = navigation.loadEventEnd - navigation.navigationStart;
      const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart;
      const firstPaint = navigation.responseStart - navigation.navigationStart;

      this.recordMetric('page_load_time', loadTime);
      this.recordMetric('dom_content_loaded', domContentLoaded);
      this.recordMetric('first_paint', firstPaint);
    }
  }

  private observeReactPerformance() {
    // Custom React component render timing
    if (typeof window !== 'undefined') {
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('Warning: Each child in a list should have a unique "key"')) {
          this.recordMetric('react_key_warning', 1);
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value.toFixed(2)}ms`, metadata);
    }

    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Time a function execution
  async time<T>(name: string, fn: () => Promise<T> | T, metadata?: Record<string, any>): Promise<T> {
    const startTime = performance.now();
    try {
      const result = await fn();
      const endTime = performance.now();
      this.recordMetric(name, endTime - startTime, metadata);
      return result;
    } catch (error) {
      const endTime = performance.now();
      this.recordMetric(`${name}_error`, endTime - startTime, { ...metadata, error: error.message });
      throw error;
    }
  }

  // Mark the start of a measurement
  mark(name: string) {
    if (typeof window !== 'undefined' && window.performance.mark) {
      window.performance.mark(name);
    }
  }

  // Measure between two marks
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window !== 'undefined' && window.performance.measure) {
      try {
        if (endMark) {
          window.performance.measure(name, startMark, endMark);
        } else {
          window.performance.measure(name, startMark);
        }
        
        const measurements = window.performance.getEntriesByType('measure');
        const measurement = measurements.find((m: any) => m.name === name);
        if (measurement) {
          this.recordMetric(name, measurement.duration);
        }
      } catch (error) {
        console.warn('Performance measurement failed:', error);
      }
    }
  }

  // Get all recorded metrics
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  // Get metrics by name
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  // Get performance summary
  getSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    const metricsByName = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    for (const [name, values] of Object.entries(metricsByName)) {
      summary[name] = {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      };
    }

    return summary;
  }

  // Clear all metrics
  clear() {
    this.metrics = [];
  }

  // Disconnect all observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.setupObservers();
    } else {
      this.disconnect();
    }
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = () => {
  return {
    recordMetric: (name: string, value: number, metadata?: Record<string, any>) => 
      performanceMonitor.recordMetric(name, value, metadata),
    time: <T>(name: string, fn: () => Promise<T> | T, metadata?: Record<string, any>) => 
      performanceMonitor.time(name, fn, metadata),
    mark: (name: string) => performanceMonitor.mark(name),
    measure: (name: string, startMark: string, endMark?: string) => 
      performanceMonitor.measure(name, startMark, endMark),
    getMetrics: () => performanceMonitor.getMetrics(),
    getSummary: () => performanceMonitor.getSummary(),
  };
};

// HOC for measuring component render time
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';
  
  const MemoizedComponent = React.memo((props: P) => {
    React.useEffect(() => {
      performanceMonitor.mark(`${displayName}_render_start`);
      
      return () => {
        performanceMonitor.mark(`${displayName}_render_end`);
        performanceMonitor.measure(`${displayName}_render_time`, `${displayName}_render_start`, `${displayName}_render_end`);
      };
    });
    
    return React.createElement(WrappedComponent, props);
  });
  
  MemoizedComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  return MemoizedComponent;
}

// Utility to detect slow renders
export const detectSlowRenders = (threshold = 16): void => {
  if (typeof window === 'undefined') return;
  
  let isRendering = false;
  let renderStart = 0;
  
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  window.requestAnimationFrame = (callback) => {
    return originalRequestAnimationFrame((timestamp) => {
      if (isRendering) {
        const renderTime = timestamp - renderStart;
        if (renderTime > threshold) {
          performanceMonitor.recordMetric('slow_render', renderTime, {
            threshold,
            timestamp,
          });
        }
        isRendering = false;
      }
      
      renderStart = timestamp;
      isRendering = true;
      return callback(timestamp);
    });
  };
};