import React, { useState, useEffect } from 'react';

const RateLimitIndicator = ({ sessionId, backendUrl }) => {
  const [rateLimits, setRateLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRateLimits = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/usage/rate-limits/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setRateLimits(data.rate_limits);
      } else {
        throw new Error('Failed to fetch rate limits');
      }
    } catch (err) {
      setError('Failed to fetch rate limit data');
      console.error('Rate limit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimits();

    // Listen for refresh events
    const handleRefresh = () => fetchRateLimits();
    window.addEventListener('refreshMonitoringData', handleRefresh);
    
    return () => window.removeEventListener('refreshMonitoringData', handleRefresh);
  }, [sessionId, backendUrl]);

  const getStatusColor = (exceeded) => {
    return exceeded ? 'text-red-400 bg-red-500/20' : 'text-green-400 bg-green-500/20';
  };

  const getStatusIcon = (exceeded) => {
    return exceeded ? '⛔' : '✅';
  };

  const getProgressBarColor = (percentage, exceeded) => {
    if (exceeded) return 'bg-red-500';
    if (percentage > 80) return 'bg-yellow-500';
    if (percentage > 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-300">Loading rate limit status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-400 rounded-lg p-6 text-center">
        <p className="text-red-300 mb-4">⚠️ {error}</p>
        <button
          onClick={fetchRateLimits}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!rateLimits) {
    return (
      <div className="text-center text-gray-400 py-8">
        <p>No rate limit data available</p>
      </div>
    );
  }

  const costPercentage = (rateLimits.current_cost / rateLimits.max_cost) * 100;
  const operationsPercentage = (rateLimits.recent_operations / rateLimits.max_operations) * 100;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className={`border rounded-xl p-6 ${
        rateLimits.within_limits 
          ? 'bg-green-500/20 border-green-400/30' 
          : 'bg-red-500/20 border-red-400/30'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white flex items-center">
            🛡️ Rate Limit Status
          </h3>
          <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${
            rateLimits.within_limits 
              ? 'bg-green-500/30 text-green-300' 
              : 'bg-red-500/30 text-red-300'
          }`}>
            {getStatusIcon(!rateLimits.within_limits)}
            {rateLimits.within_limits ? 'WITHIN LIMITS' : 'LIMITS EXCEEDED'}
          </div>
        </div>
        
        {!rateLimits.within_limits && (
          <div className="bg-red-500/20 rounded-lg p-4 mb-4">
            <h4 className="text-red-300 font-semibold mb-2">⚠️ Rate Limit Warning</h4>
            <div className="text-red-200 text-sm space-y-1">
              {rateLimits.cost_limit_exceeded && (
                <p>• Cost limit exceeded: ${rateLimits.current_cost.toFixed(4)} / ${rateLimits.max_cost}</p>
              )}
              {rateLimits.operations_limit_exceeded && (
                <p>• Operations limit exceeded: {rateLimits.recent_operations} / {rateLimits.max_operations} per hour</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cost Limit Details */}
      <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-6">
        <h4 className="text-xl font-bold text-blue-300 mb-4 flex items-center">
          💰 Cost Limit Monitor
        </h4>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white">Current Session Cost:</span>
            <span className={`font-bold ${rateLimits.cost_limit_exceeded ? 'text-red-400' : 'text-green-400'}`}>
              ${rateLimits.current_cost.toFixed(4)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-white">Maximum Allowed:</span>
            <span className="font-bold text-gray-300">${rateLimits.max_cost.toFixed(2)}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressBarColor(costPercentage, rateLimits.cost_limit_exceeded)}`}
              style={{ width: `${Math.min(costPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">0%</span>
            <span className={`font-medium ${rateLimits.cost_limit_exceeded ? 'text-red-400' : 'text-white'}`}>
              {costPercentage.toFixed(1)}% used
            </span>
            <span className="text-gray-400">100%</span>
          </div>
        </div>
      </div>

      {/* Operations Limit Details */}
      <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-6">
        <h4 className="text-xl font-bold text-purple-300 mb-4 flex items-center">
          ⚡ Operations Limit Monitor
        </h4>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-white">Recent Operations (1 hour):</span>
            <span className={`font-bold ${rateLimits.operations_limit_exceeded ? 'text-red-400' : 'text-green-400'}`}>
              {rateLimits.recent_operations}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-white">Maximum Allowed:</span>
            <span className="font-bold text-gray-300">{rateLimits.max_operations} per hour</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${getProgressBarColor(operationsPercentage, rateLimits.operations_limit_exceeded)}`}
              style={{ width: `${Math.min(operationsPercentage, 100)}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">0%</span>
            <span className={`font-medium ${rateLimits.operations_limit_exceeded ? 'text-red-400' : 'text-white'}`}>
              {operationsPercentage.toFixed(1)}% used
            </span>
            <span className="text-gray-400">100%</span>
          </div>
        </div>
      </div>

      {/* Rate Limit Guidelines */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">📋 Rate Limit Guidelines</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h5 className="font-semibold text-blue-300 mb-2">💰 Cost Limits</h5>
            <ul className="text-gray-300 space-y-1">
              <li>• Maximum $5.00 per session</li>
              <li>• Protects against unexpected usage</li>
              <li>• Tracks all AI services (OpenAI, Claude, FAL.AI)</li>
              <li>• Reset when starting new session</li>
            </ul>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h5 className="font-semibold text-purple-300 mb-2">⚡ Operation Limits</h5>
            <ul className="text-gray-300 space-y-1">
              <li>• Maximum 100 operations per hour</li>
              <li>• Prevents API abuse</li>
              <li>• Includes all AI interactions</li>
              <li>• Rolling 1-hour window</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
          <p className="text-yellow-200 text-sm">
            💡 <strong>Tip:</strong> If you hit rate limits, wait a few minutes for operations to reset, 
            or start a new session to reset cost limits.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RateLimitIndicator;