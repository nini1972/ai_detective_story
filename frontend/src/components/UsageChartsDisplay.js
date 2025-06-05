import React, { useState, useEffect } from 'react';

const UsageChartsDisplay = ({ sessionId, backendUrl }) => {
  const [usageRecords, setUsageRecords] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch usage records
      const recordsResponse = await fetch(`${backendUrl}/api/usage/records?limit=50`);
      if (recordsResponse.ok) {
        const recordsData = await recordsResponse.json();
        setUsageRecords(recordsData.records || []);
      }

      // Fetch overall statistics
      const statsResponse = await fetch(`${backendUrl}/api/usage/statistics`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setOverallStats(statsData.statistics);
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Analytics data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();

    // Listen for refresh events
    const handleRefresh = () => fetchAnalyticsData();
    window.addEventListener('refreshMonitoringData', handleRefresh);
    
    return () => window.removeEventListener('refreshMonitoringData', handleRefresh);
  }, [backendUrl]);

  // Process data for charts
  const processServiceData = () => {
    if (!overallStats?.service_breakdown) return [];
    
    return Object.entries(overallStats.service_breakdown).map(([service, data]) => ({
      name: service === 'openai' ? '🧠 OpenAI' : 
            service === 'anthropic' ? '🎭 Claude' : 
            service === 'fal_ai' ? '🎨 FAL.AI' : service,
      cost: data.cost || 0,
      tokens: data.tokens || 0,
      operations: data.operations || 0,
      color: service === 'openai' ? '#3B82F6' : 
             service === 'anthropic' ? '#8B5CF6' : 
             service === 'fal_ai' ? '#F59E0B' : '#6B7280'
    }));
  };

  const processOperationData = () => {
    if (!overallStats?.operation_breakdown) return [];
    
    return Object.entries(overallStats.operation_breakdown).map(([operation, data]) => ({
      name: operation.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cost: data.cost || 0,
      count: data.count || 0,
      tokens: data.tokens || 0
    }));
  };

  const processTimelineData = () => {
    if (!usageRecords.length) return [];
    
    // Group by hour for the last 24 hours
    const hourlyData = {};
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const key = hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      hourlyData[key] = { hour: hour.getHours(), cost: 0, operations: 0 };
    }
    
    // Aggregate actual data
    usageRecords.forEach(record => {
      const timestamp = new Date(record.timestamp);
      const key = timestamp.toISOString().slice(0, 13);
      if (hourlyData[key]) {
        hourlyData[key].cost += record.estimated_cost || 0;
        hourlyData[key].operations += 1;
      }
    });
    
    return Object.values(hourlyData);
  };

  const renderSimpleChart = (data, type = 'cost') => {
    if (!data.length) return null;
    
    const maxValue = Math.max(...data.map(item => item[type]));
    if (maxValue === 0) return <p className="text-gray-400 text-sm">No data available</p>;
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center">
            <div className="w-24 text-sm text-gray-300 truncate">
              {item.name}
            </div>
            <div className="flex-1 mx-3 bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${(item[type] / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-20 text-sm text-right text-white">
              {type === 'cost' ? `$${item[type].toFixed(4)}` : 
               type === 'tokens' ? item[type].toLocaleString() :
               item[type]}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-300">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-400 rounded-lg p-6 text-center">
        <p className="text-red-300 mb-4">⚠️ {error}</p>
        <button
          onClick={fetchAnalyticsData}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  const serviceData = processServiceData();
  const operationData = processOperationData();
  const timelineData = processTimelineData();

  return (
    <div className="space-y-6">
      {/* Service Cost Breakdown */}
      <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-blue-300 mb-4 flex items-center">
          🎯 Service Cost Breakdown
        </h3>
        
        {serviceData.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-blue-200 mb-3">💰 Cost Distribution</h4>
              {renderSimpleChart(serviceData, 'cost')}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-blue-200 mb-3">🔢 Token Usage</h4>
              {renderSimpleChart(serviceData, 'tokens')}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No service data available</p>
        )}
      </div>

      {/* Operation Analysis */}
      <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
          ⚙️ Operation Analysis
        </h3>
        
        {operationData.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-lg font-semibold text-purple-200 mb-3">💰 Cost by Operation</h4>
              {renderSimpleChart(operationData, 'cost')}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-purple-200 mb-3">📊 Operation Count</h4>
              {renderSimpleChart(operationData, 'count')}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No operation data available</p>
        )}
      </div>

      {/* Usage Timeline */}
      <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-green-300 mb-4 flex items-center">
          📈 Usage Timeline (Last 24 Hours)
        </h3>
        
        {timelineData.length > 0 ? (
          <div>
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-green-200 mb-3">💰 Hourly Cost Trend</h4>
              <div className="h-20 flex items-end justify-between bg-gray-800/50 rounded-lg p-2">
                {timelineData.slice(-12).map((item, index) => {
                  const maxCost = Math.max(...timelineData.map(d => d.cost));
                  const height = maxCost > 0 ? (item.cost / maxCost) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center group relative"
                      style={{ width: '6%' }}
                    >
                      <div
                        className="bg-gradient-to-t from-green-500 to-green-300 rounded-t transition-all duration-300 group-hover:from-green-400 group-hover:to-green-200"
                        style={{ 
                          height: `${height}%`,
                          minHeight: item.cost > 0 ? '2px' : '0px',
                          width: '100%'
                        }}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {item.hour}h
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        ${item.cost.toFixed(4)}<br/>
                        {item.operations} ops
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-green-200 mb-3">📊 Hourly Operations</h4>
              <div className="h-20 flex items-end justify-between bg-gray-800/50 rounded-lg p-2">
                {timelineData.slice(-12).map((item, index) => {
                  const maxOps = Math.max(...timelineData.map(d => d.operations));
                  const height = maxOps > 0 ? (item.operations / maxOps) * 100 : 0;
                  
                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center group relative"
                      style={{ width: '6%' }}
                    >
                      <div
                        className="bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all duration-300 group-hover:from-blue-400 group-hover:to-blue-200"
                        style={{ 
                          height: `${height}%`,
                          minHeight: item.operations > 0 ? '2px' : '0px',
                          width: '100%'
                        }}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {item.hour}h
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-700 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                        {item.operations} operations<br/>
                        ${item.cost.toFixed(4)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No timeline data available</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          🔄 Recent Activity
        </h3>
        
        {usageRecords.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {usageRecords.slice(0, 10).map((record, index) => (
              <div key={record.id} className="bg-gray-800/50 rounded-lg p-3 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${
                    record.success ? 'bg-green-500' : 'bg-red-500'
                  }`}></span>
                  <div>
                    <span className="text-white font-medium capitalize">
                      {record.operation?.replace('_', ' ') || 'Unknown'}
                    </span>
                    <span className="text-gray-400 text-sm ml-2">
                      ({record.service === 'openai' ? '🧠 OpenAI' : 
                        record.service === 'anthropic' ? '🎭 Claude' : 
                        record.service === 'fal_ai' ? '🎨 FAL.AI' : record.service})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-300 font-medium">${record.estimated_cost?.toFixed(4) || '0.0000'}</div>
                  <div className="text-gray-400 text-sm">{record.total_tokens || 0} tokens</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">No recent activity</p>
        )}
      </div>

      {/* Summary Stats */}
      {overallStats && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            📊 Platform Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-300">${overallStats.total_cost?.toFixed(2) || '0.00'}</div>
              <div className="text-sm text-gray-400">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-300">{overallStats.total_tokens?.toLocaleString() || 0}</div>
              <div className="text-sm text-gray-400">Total Tokens</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-300">{overallStats.session_count || 0}</div>
              <div className="text-sm text-gray-400">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-300">{overallStats.case_count || 0}</div>
              <div className="text-sm text-gray-400">Cases Generated</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageChartsDisplay;