import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private static instance: PerformanceMonitor;

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMeasure(name: string): string {
    const markName = `${name}-start-${Date.now()}`;
    performance.mark(markName);
    return markName;
  }

  endMeasure(startMarkName: string, name: string) {
    const endMarkName = `${name}-end`;
    performance.mark(endMarkName);
    
    try {
      performance.measure(name, startMarkName, endMarkName);
      const measure = performance.getEntriesByName(name, 'measure')[0];
      
      this.metrics.push({
        name,
        duration: measure.duration,
        timestamp: Date.now()
      });

      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics = this.metrics.slice(-100);
      }

      // Log slow operations in development
      if (process.env.NODE_ENV === 'development' && measure.duration > 100) {
        console.warn(`Slow operation detected: ${name} took ${measure.duration.toFixed(2)}ms`);
      }
    } catch (error) {
      console.warn('Performance measurement failed:', error);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getSlowOperations(threshold = 100): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.duration > threshold);
  }
}

export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    
    // Log excessive re-renders
    if (renderCount.current > 10) {
      console.warn(`Component ${componentName} has rendered ${renderCount.current} times`);
    }
  });

  const measureAsync = async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    const startMark = monitor.startMeasure(`${componentName}-${name}`);
    try {
      const result = await fn();
      monitor.endMeasure(startMark, `${componentName}-${name}`);
      return result;
    } catch (error) {
      monitor.endMeasure(startMark, `${componentName}-${name}-error`);
      throw error;
    }
  };

  const measureSync = <T,>(name: string, fn: () => T): T => {
    const startMark = monitor.startMeasure(`${componentName}-${name}`);
    try {
      const result = fn();
      monitor.endMeasure(startMark, `${componentName}-${name}`);
      return result;
    } catch (error) {
      monitor.endMeasure(startMark, `${componentName}-${name}-error`);
      throw error;
    }
  };

  return {
    measureAsync,
    measureSync,
    renderCount: renderCount.current,
    mountDuration: Date.now() - mountTime.current,
    getMetrics: () => monitor.getMetrics(),
    getSlowOperations: (threshold?: number) => monitor.getSlowOperations(threshold)
  };
}
