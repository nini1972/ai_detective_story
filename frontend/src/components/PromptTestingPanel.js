import React, { useState, useEffect } from 'react';

const PromptTestingPanel = ({ sessionId, backendUrl }) => {
  const [testCases, setTestCases] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [healthReport, setHealthReport] = useState(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [lastTestResults, setLastTestResults] = useState(null);
  const [selectedTestTypes, setSelectedTestTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch test cases
      const testCasesResponse = await fetch(`${backendUrl}/api/testing/test-cases`);
      if (testCasesResponse.ok) {
        const testCasesData = await testCasesResponse.json();
        setTestCases(testCasesData.test_cases || []);
      }

      // Fetch test history
      const historyResponse = await fetch(`${backendUrl}/api/testing/test-history`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setTestHistory(historyData.test_suites || []);
      }

      // Fetch health report
      const healthResponse = await fetch(`${backendUrl}/api/testing/health-report`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthReport(healthData.report);
      }
    } catch (err) {
      setError('Failed to fetch testing data');
      console.error('Testing data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for refresh events
    const handleRefresh = () => fetchData();
    window.addEventListener('refreshMonitoringData', handleRefresh);
    
    return () => window.removeEventListener('refreshMonitoringData', handleRefresh);
  }, [backendUrl]);

  const runTests = async () => {
    setIsRunningTests(true);
    setError(null);

    try {
      const url = selectedTestTypes.length > 0 
        ? `${backendUrl}/api/testing/run-tests?test_types=${selectedTestTypes.join(',')}`
        : `${backendUrl}/api/testing/run-tests`;
      
      const response = await fetch(url, { method: 'POST' });
      
      if (response.ok) {
        const data = await response.json();
        setLastTestResults(data);
        // Refresh data to get updated history
        await fetchData();
      } else {
        throw new Error('Failed to run tests');
      }
    } catch (err) {
      setError('Failed to run prompt tests');
      console.error('Test execution error:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const toggleTestType = (testType) => {
    setSelectedTestTypes(prev => 
      prev.includes(testType)
        ? prev.filter(t => t !== testType)
        : [...prev, testType]
    );
  };

  const getHealthStatusColor = (health) => {
    switch (health) {
      case 'Excellent': return 'text-green-400 bg-green-500/20';
      case 'Good': return 'text-blue-400 bg-blue-500/20';
      case 'Fair': return 'text-yellow-400 bg-yellow-500/20';
      case 'Poor': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getHealthIcon = (health) => {
    switch (health) {
      case 'Excellent': return '🟢';
      case 'Good': return '🔵';
      case 'Fair': return '🟡';
      case 'Poor': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-gray-300">Loading prompt testing data...</p>
        </div>
      </div>
    );
  }

  if (error && !testCases.length) {
    return (
      <div className="bg-red-500/20 border border-red-400 rounded-lg p-6 text-center">
        <p className="text-red-300 mb-4">⚠️ {error}</p>
        <button
          onClick={fetchData}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  const uniqueTestTypes = [...new Set(testCases.map(tc => tc.prompt_type))];

  return (
    <div className="space-y-6">
      {/* Health Overview */}
      {healthReport && (
        <div className={`border rounded-xl p-6 ${getHealthStatusColor(healthReport.overall_health)}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xl font-bold text-white flex items-center">
              🧪 Prompt Health Status
            </h3>
            <div className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2`}>
              {getHealthIcon(healthReport.overall_health)}
              {healthReport.overall_health}
            </div>
          </div>
          
          {healthReport.overall_success_rate && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-white">
                  <strong>Success Rate:</strong> {healthReport.overall_success_rate}
                </p>
                <p className="text-white">
                  <strong>Recent Tests:</strong> {healthReport.recent_test_count}
                </p>
              </div>
              <div>
                <p className="text-white">
                  <strong>Recommendation:</strong> {healthReport.recommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Execution Panel */}
      <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-blue-300 mb-4 flex items-center">
          🚀 Run Prompt Tests
        </h3>
        
        {/* Test Type Selection */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-white mb-3">Select Test Types:</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTestTypes([])}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTestTypes.length === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              🎯 All Tests
            </button>
            {uniqueTestTypes.map(testType => (
              <button
                key={testType}
                onClick={() => toggleTestType(testType)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedTestTypes.includes(testType)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                {testType === 'case_generation' ? '📝 Case Generation' :
                 testType === 'character_question' ? '🎭 Character Questions' :
                 testType === 'character_detection' ? '🔍 Character Detection' :
                 testType === 'evidence_analysis' ? '🧠 Evidence Analysis' :
                 testType}
              </button>
            ))}
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runTests}
          disabled={isRunningTests}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
        >
          {isRunningTests ? (
            <>
              <div className="loading-spinner"></div>
              🔄 Running Tests...
            </>
          ) : (
            <>🧪 Run Tests</>
          )}
        </button>

        {isRunningTests && (
          <div className="mt-4 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-yellow-200">
              ⏳ <strong>Testing in progress...</strong> This may take 30-60 seconds as we test all AI prompts for reliability.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-400 rounded-lg p-4">
            <p className="text-red-300">⚠️ {error}</p>
          </div>
        )}
      </div>

      {/* Latest Test Results */}
      {lastTestResults && (
        <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-6">
          <h3 className="text-2xl font-bold text-green-300 mb-4 flex items-center">
            📊 Latest Test Results
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Summary */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-200 mb-3">📈 Summary</h4>
              <div className="space-y-2 text-white">
                <div className="flex justify-between">
                  <span>Tests Run:</span>
                  <span className="font-bold">{lastTestResults.summary.tests_run}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tests Passed:</span>
                  <span className="font-bold text-green-300">{lastTestResults.summary.tests_passed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tests Failed:</span>
                  <span className="font-bold text-red-300">{lastTestResults.summary.tests_failed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate:</span>
                  <span className="font-bold text-yellow-300">{lastTestResults.summary.success_rate}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Cost:</span>
                  <span className="font-bold text-blue-300">{lastTestResults.summary.total_cost}</span>
                </div>
                <div className="flex justify-between">
                  <span>Execution Time:</span>
                  <span className="font-bold">{lastTestResults.summary.execution_time}</span>
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <div className="bg-black/20 rounded-lg p-4">
              <h4 className="text-lg font-semibold text-green-200 mb-3">🔍 Test Details</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lastTestResults.test_suite.results.map((result, index) => (
                  <div key={index} className={`p-2 rounded text-sm ${
                    result.success ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">
                        {result.success ? '✅' : '❌'} {result.test_case_name}
                      </span>
                      <span className="text-xs text-gray-300">
                        ${result.estimated_cost.toFixed(4)}
                      </span>
                    </div>
                    {!result.success && result.error_message && (
                      <p className="text-xs text-red-300 mt-1">{result.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test History */}
      <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-6">
        <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center">
          📈 Test History
        </h3>
        
        {testHistory.length > 0 ? (
          <div className="space-y-3">
            {testHistory.slice(0, 5).map((suite, index) => (
              <div key={suite.id} className="bg-black/20 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-white">{suite.name}</span>
                  <span className="text-sm text-gray-300">{new Date(suite.timestamp).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Tests:</span>
                    <span className="text-white ml-2">{suite.tests_run}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Passed:</span>
                    <span className="text-green-300 ml-2">{suite.tests_passed}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Success Rate:</span>
                    <span className="text-yellow-300 ml-2">{suite.success_rate.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Cost:</span>
                    <span className="text-blue-300 ml-2">${suite.total_cost.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 italic">No test history available. Run some tests to see history here.</p>
        )}
      </div>

      {/* Available Test Cases */}
      <div className="bg-gray-700/50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          📋 Available Test Cases ({testCases.length})
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          {testCases.map((testCase) => (
            <div key={testCase.id} className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-white">{testCase.name}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  testCase.service === 'openai' ? 'bg-blue-500/20 text-blue-300' :
                  testCase.service === 'anthropic' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {testCase.service === 'openai' ? '🧠 OpenAI' :
                   testCase.service === 'anthropic' ? '🎭 Claude' : testCase.service}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-2">{testCase.description}</p>
              <div className="text-xs text-gray-400">
                <span className="capitalize">{testCase.prompt_type.replace('_', ' ')}</span> • 
                <span className="ml-1">{testCase.validation_rules.length} validation rules</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PromptTestingPanel;