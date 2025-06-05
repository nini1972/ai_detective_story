import React, { useState, useEffect } from 'react';
import TokenUsageStats from './TokenUsageStats';
import RateLimitIndicator from './RateLimitIndicator';
import PromptTestingPanel from './PromptTestingPanel';
import UsageChartsDisplay from './UsageChartsDisplay';

const UsageMonitoringDashboard = ({ sessionId, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('usage');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds default
  const [autoRefresh, setAutoRefresh] = useState(true);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh || !isOpen) return;

    const interval = setInterval(() => {
      // Trigger refresh in child components
      window.dispatchEvent(new CustomEvent('refreshMonitoringData'));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isOpen]);

  const handleRefreshNow = () => {
    window.dispatchEvent(new CustomEvent('refreshMonitoringData'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold flex items-center">
                📊 AI Usage Monitoring Dashboard
              </h2>
              <p className="text-blue-100 mt-2">
                Real-time monitoring of AI costs, usage patterns, and prompt health
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Auto-refresh controls */}
              <div className="flex items-center gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />
                  Auto-refresh
                </label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-blue-700 text-white rounded px-2 py-1 text-sm"
                  disabled={!autoRefresh}
                >
                  <option value={10000}>10s</option>
                  <option value={30000}>30s</option>
                  <option value={60000}>1m</option>
                  <option value={300000}>5m</option>
                </select>
              </div>
              <button
                onClick={handleRefreshNow}
                className="bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                🔄 Refresh Now
              </button>
              <button
                onClick={onClose}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                ❌ Close
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-700 px-6 py-3">
          <div className="flex space-x-1">
            {[
              { id: 'usage', label: '💰 Usage & Costs', icon: '📊' },
              { id: 'limits', label: '🛡️ Rate Limits', icon: '⚡' },
              { id: 'testing', label: '🧪 Prompt Testing', icon: '🔍' },
              { id: 'analytics', label: '📈 Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'usage' && (
            <TokenUsageStats sessionId={sessionId} backendUrl={BACKEND_URL} />
          )}
          
          {activeTab === 'limits' && (
            <RateLimitIndicator sessionId={sessionId} backendUrl={BACKEND_URL} />
          )}
          
          {activeTab === 'testing' && (
            <PromptTestingPanel sessionId={sessionId} backendUrl={BACKEND_URL} />
          )}
          
          {activeTab === 'analytics' && (
            <UsageChartsDisplay sessionId={sessionId} backendUrl={BACKEND_URL} />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-700 px-6 py-3 text-center text-gray-300 text-sm">
          <p>
            🤖 Powered by Dual-AI Detective Engine | 
            Session: <span className="font-mono text-blue-300">{sessionId?.slice(-8) || 'N/A'}</span> |
            Last updated: {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsageMonitoringDashboard;