import React, { useState, useEffect } from 'react';
import { Activity, BarChart3, Clock, Zap, X } from 'lucide-react';
import { performanceMonitor } from '../../utils/performance';

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'metrics' | 'summary' | 'vitals'>('summary');

  useEffect(() => {
    if (isOpen) {
      const interval = setInterval(() => {
        setMetrics(performanceMonitor.getMetrics());
        setSummary(performanceMonitor.getSummary());
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const webVitals = {
    LCP: summary.LCP?.avg || 0,
    FID: summary.FID?.avg || 0,
    CLS: summary.CLS?.avg || 0,
  };

  const renderMetricsTab = () => (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {metrics.slice(-20).reverse().map((metric, index) => (
        <div key={index} className="flex justify-between items-center p-2 bg-dark-700 rounded">
          <div>
            <span className="text-white text-sm font-medium">{metric.name}</span>
            {metric.metadata && (
              <div className="text-xs text-gray-400">
                {Object.entries(metric.metadata).map(([key, value]) => (
                  <span key={key} className="mr-2">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-primary-400 font-mono text-sm">
              {metric.value.toFixed(2)}ms
            </div>
            <div className="text-xs text-gray-500">
              {new Date(metric.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSummaryTab = () => (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(summary).map(([name, stats]) => (
        <div key={name} className="p-3 bg-dark-700 rounded-lg">
          <h4 className="text-white text-sm font-medium mb-2">{name}</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Avg:</span>
              <span className="text-primary-400 font-mono">{stats.avg.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Min:</span>
              <span className="text-green-400 font-mono">{stats.min.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Max:</span>
              <span className="text-red-400 font-mono">{stats.max.toFixed(2)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Count:</span>
              <span className="text-white font-mono">{stats.count}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderVitalsTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-dark-700 rounded-lg text-center">
          <Clock className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{webVitals.LCP.toFixed(0)}ms</div>
          <div className="text-sm text-gray-400">LCP</div>
          <div className={`text-xs mt-1 ${webVitals.LCP < 2500 ? 'text-green-400' : webVitals.LCP < 4000 ? 'text-yellow-400' : 'text-red-400'}`}>
            {webVitals.LCP < 2500 ? 'Good' : webVitals.LCP < 4000 ? 'Needs Improvement' : 'Poor'}
          </div>
        </div>
        
        <div className="p-4 bg-dark-700 rounded-lg text-center">
          <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{webVitals.FID.toFixed(0)}ms</div>
          <div className="text-sm text-gray-400">FID</div>
          <div className={`text-xs mt-1 ${webVitals.FID < 100 ? 'text-green-400' : webVitals.FID < 300 ? 'text-yellow-400' : 'text-red-400'}`}>
            {webVitals.FID < 100 ? 'Good' : webVitals.FID < 300 ? 'Needs Improvement' : 'Poor'}
          </div>
        </div>
        
        <div className="p-4 bg-dark-700 rounded-lg text-center">
          <Activity className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{webVitals.CLS.toFixed(3)}</div>
          <div className="text-sm text-gray-400">CLS</div>
          <div className={`text-xs mt-1 ${webVitals.CLS < 0.1 ? 'text-green-400' : webVitals.CLS < 0.25 ? 'text-yellow-400' : 'text-red-400'}`}>
            {webVitals.CLS < 0.1 ? 'Good' : webVitals.CLS < 0.25 ? 'Needs Improvement' : 'Poor'}
          </div>
        </div>
      </div>
      
      <div className="text-xs text-gray-400 space-y-1">
        <p><strong>LCP (Largest Contentful Paint):</strong> Time to render largest content element</p>
        <p><strong>FID (First Input Delay):</strong> Time from first user interaction to browser response</p>
        <p><strong>CLS (Cumulative Layout Shift):</strong> Visual stability metric</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg border border-dark-600 w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Performance Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-600 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-600">
          {[
            { id: 'summary', label: 'Summary', icon: BarChart3 },
            { id: 'vitals', label: 'Web Vitals', icon: Activity },
            { id: 'metrics', label: 'Live Metrics', icon: Clock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-primary-400 border-b-2 border-primary-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {activeTab === 'metrics' && renderMetricsTab()}
          {activeTab === 'summary' && renderSummaryTab()}
          {activeTab === 'vitals' && renderVitalsTab()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-dark-600 bg-dark-700">
          <div className="flex justify-between items-center text-sm">
            <div className="text-gray-400">
              Total Metrics: {metrics.length}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => performanceMonitor.clear()}
                className="px-3 py-1 bg-dark-600 text-white rounded hover:bg-dark-500 transition-colors"
              >
                Clear Metrics
              </button>
              <button
                onClick={() => {
                  const data = JSON.stringify({ metrics, summary }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-500 transition-colors"
              >
                Export Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};