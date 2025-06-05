import React, { useState, useEffect } from 'react';

const TokenUsageStats = ({ sessionId, backendUrl }) => {
  const [sessionUsage, setSessionUsage] = useState(null);
  const [overallStats, setOverallStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsageData = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch session usage
      const sessionResponse = await fetch(`${backendUrl}/api/usage/session/${sessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSessionUsage(sessionData.usage);
      }

      // Fetch overall statistics
      const statsResponse = await fetch(`${backendUrl}/api/usage/statistics`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setOverallStats(statsData.statistics);
      }
    } catch (err) {
      setError('Failed to fetch usage data');
      console.error('Usage data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();

    // Listen for refresh events
    const handleRefresh = () => fetchUsageData();
    window.addEventListener('refreshMonitoringData', handleRefresh);
    
    return () => window.removeEventListener('refreshMonitoringData', handleRefresh);
  }, [sessionId, backendUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-300">Loading usage statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-400 rounded-lg p-6 text-center">
        <p className="text-red-300 mb-4">⚠️ {error}</p>
        <button
          onClick={fetchUsageData}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Usage Card */}
      <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-blue-300 mb-4 flex items-center">
          🎯 Current Session Usage
        </h3>
        
        {sessionUsage ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Cost Overview */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-200 mb-3">💰 Cost Breakdown</h4>
              <div className="space-y-2 text-white">
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-bold text-green-300">${sessionUsage.total_cost?.toFixed(4) || '0.0000'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tokens:</span>
                  <span className="font-mono">{sessionUsage.total_tokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Operations:</span>
                  <span className="font-mono">{sessionUsage.operation_count || 0}</span>
                </div>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-blue-200 mb-3">🤖 Service Usage</h4>
              <div className="space-y-3">
                {sessionUsage.service_breakdown && Object.keys(sessionUsage.service_breakdown).length > 0 ? (
                  Object.entries(sessionUsage.service_breakdown).map(([service, details]) => (
                    <div key={service} className="bg-gray-700/50 rounded p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-white capitalize">
                          {service === 'openai' ? '🧠 OpenAI' : 
                           service === 'anthropic' ? '🎭 Claude' : 
                           service === 'fal_ai' ? '🎨 FAL.AI' : service}
                        </span>
                        <span className="text-green-300 font-bold">${details.cost?.toFixed(4) || '0.0000'}</span>
                      </div>
                      <div className="text-sm text-gray-300 flex justify-between">
                        <span>{details.tokens?.toLocaleString() || 0} tokens</span>
                        <span>{details.count || 0} operations</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 italic">No usage data for this session yet</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No session usage data available</p>
        )}
      </div>

      {/* Overall Statistics Card */}
      <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
          📊 Platform Statistics (Last 30 Days)
        </h3>
        
        {overallStats ? (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Platform Overview */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-purple-200 mb-3">🏢 Platform Overview</h4>
              <div className="space-y-2 text-white">
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-bold text-green-300">${overallStats.total_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tokens:</span>
                  <span className="font-mono">{overallStats.total_tokens?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Active Sessions:</span>
                  <span className="font-mono">{overallStats.session_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cases Generated:</span>
                  <span className="font-mono">{overallStats.case_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Cost/Case:</span>
                  <span className="font-bold text-yellow-300">${overallStats.average_cost_per_case?.toFixed(3) || '0.000'}</span>
                </div>
              </div>
            </div>

            {/* Service Performance */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-purple-200 mb-3">🎯 Service Performance</h4>
              <div className="space-y-3">
                {overallStats.service_breakdown && Object.entries(overallStats.service_breakdown).map(([service, details]) => (
                  <div key={service} className="border-l-4 border-purple-400 pl-3">
                    <div className="font-medium text-white capitalize">
                      {service === 'openai' ? '🧠 OpenAI' : 
                       service === 'anthropic' ? '🎭 Claude' : 
                       service === 'fal_ai' ? '🎨 FAL.AI' : service}
                    </div>
                    <div className="text-sm text-gray-300">
                      ${details.cost?.toFixed(2)} • {details.tokens?.toLocaleString()} tokens • {details.operations} ops
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Operations Breakdown */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-purple-200 mb-3">⚙️ Operations</h4>
              <div className="space-y-3">
                {overallStats.operation_breakdown && Object.entries(overallStats.operation_breakdown).map(([operation, details]) => (
                  <div key={operation} className="bg-gray-700/50 rounded p-2">
                    <div className="font-medium text-white text-sm capitalize">
                      {operation.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-gray-300 flex justify-between">
                      <span>${details.cost?.toFixed(3)}</span>
                      <span>{details.count} times</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No platform statistics available</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-700/50 rounded-xl p-4">
        <h4 className="text-lg font-semibold text-white mb-3">⚡ Quick Actions</h4>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={fetchUsageData}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            🔄 Refresh Data
          </button>
          <button
            onClick={() => window.open(`${backendUrl}/api/usage/records?session_id=${sessionId}`, '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            📋 View Raw Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenUsageStats;