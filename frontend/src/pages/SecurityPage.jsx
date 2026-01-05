import React, { useState, useEffect, useCallback } from 'react';

const API_URL = '/api/v1';

// Attack configurations
const ATTACK_TYPES = [
  {
    id: 'sybil',
    name: 'Sybil Attack',
    icon: '👥',
    severity: 'high',
    description: 'Multiple fake identities from single source',
    color: 'yellow',
  },
  {
    id: '51_percent',
    name: '51% Attack',
    icon: '⚡',
    severity: 'critical',
    description: 'Majority hashrate control attempt',
    color: 'red',
  },
  {
    id: 'double_spending',
    name: 'Double Spending',
    icon: '💰',
    severity: 'critical',
    description: 'Spend same tokens multiple times',
    color: 'red',
  },
  {
    id: 'ddos',
    name: 'DDoS Attack',
    icon: '🌊',
    severity: 'high',
    description: 'Network flooding and resource exhaustion',
    color: 'orange',
  },
  {
    id: 'replay',
    name: 'Replay Attack',
    icon: '🔄',
    severity: 'medium',
    description: 'Resubmit old valid transactions',
    color: 'yellow',
  },
  {
    id: 'eclipse',
    name: 'Eclipse Attack',
    icon: '🌑',
    severity: 'high',
    description: 'Isolate node from honest peers',
    color: 'orange',
  },
];

// Agent Card Component
const AgentCard = ({ agent, name, onToggle }) => {
  const isActive = agent?.status === 'active';
  const icons = {
    defender: '🛡️',
    sensor: '📡',
    analyzer: '🔍',
    controller: '🎮',
  };
  
  const descriptions = {
    defender: 'Firewall, IP blocking, rate limiting',
    sensor: 'Network monitoring, metrics collection',
    analyzer: 'Threat analysis, pattern recognition',
    controller: 'Policy enforcement, incident response',
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      isActive 
        ? 'bg-gradient-to-br from-green-900/30 to-green-800/20 border-green-500' 
        : 'bg-gray-800/50 border-gray-600'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icons[name]}</span>
          <h3 className="text-lg font-bold text-white capitalize">{name}</h3>
        </div>
        <button
          onClick={() => onToggle(name)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition ${
            isActive
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </button>
      </div>
      <p className="text-gray-400 text-sm">{descriptions[name]}</p>
      
      {agent?.stats && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {Object.entries(agent.stats).slice(0, 4).map(([key, value]) => (
            <div key={key} className="bg-black/30 rounded p-1 px-2">
              <span className="text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="text-white ml-1 font-mono">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Alert Item Component
const AlertItem = ({ alert, onAcknowledge }) => {
  const levelColors = {
    alert: 'text-red-400 bg-red-900/30 border-red-500',
    warn: 'text-yellow-400 bg-yellow-900/30 border-yellow-500',
    error: 'text-red-400 bg-red-900/30 border-red-500',
    info: 'text-blue-400 bg-blue-900/30 border-blue-500',
  };

  return (
    <div className={`p-3 rounded-lg border ${levelColors[alert.level] || levelColors.info} ${
      alert.acknowledged ? 'opacity-50' : ''
    }`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">
              {new Date(alert.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-black/30">
              {alert.agent}
            </span>
          </div>
          <p className="text-sm mt-1">{alert.message}</p>
        </div>
        {!alert.acknowledged && (
          <button
            onClick={() => onAcknowledge(alert.id)}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
          >
            ACK
          </button>
        )}
      </div>
    </div>
  );
};

// Attack Simulation Card
const AttackCard = ({ attack, onSimulate, isSimulating }) => {
  const severityColors = {
    critical: 'border-red-500 hover:bg-red-900/20',
    high: 'border-orange-500 hover:bg-orange-900/20',
    medium: 'border-yellow-500 hover:bg-yellow-900/20',
    low: 'border-green-500 hover:bg-green-900/20',
  };

  return (
    <button
      onClick={() => onSimulate(attack.id)}
      disabled={isSimulating}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        severityColors[attack.severity]
      } bg-gray-800/50 ${isSimulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{attack.icon}</span>
        <h3 className="text-white font-bold">{attack.name}</h3>
      </div>
      <p className="text-gray-400 text-xs">{attack.description}</p>
      <div className="mt-2">
        <span className={`text-xs px-2 py-0.5 rounded ${
          attack.severity === 'critical' ? 'bg-red-500/30 text-red-400' :
          attack.severity === 'high' ? 'bg-orange-500/30 text-orange-400' :
          'bg-yellow-500/30 text-yellow-400'
        }`}>
          {attack.severity.toUpperCase()}
        </span>
      </div>
    </button>
  );
};

// Simulation Result Component
const SimulationResult = ({ result }) => {
  if (!result) return null;

  const simulation = result.simulation;
  
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-cyan-600">
      <h3 className="text-cyan-400 font-bold mb-3">
        🎯 Simulation Result: {simulation.type.toUpperCase()}
      </h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Status:</span>
          <span className={`ml-2 font-bold ${
            simulation.results?.detected ? 'text-green-400' : 'text-red-400'
          }`}>
            {simulation.results?.detected ? '✅ DETECTED' : '❌ MISSED'}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Duration:</span>
          <span className="ml-2 text-white font-mono">{simulation.duration}ms</span>
        </div>
      </div>
      
      {simulation.results?.threatAnalysis && (
        <div className="mt-3 p-3 bg-black/30 rounded-lg">
          <h4 className="text-yellow-400 text-sm font-bold mb-2">Threat Analysis</h4>
          <div className="text-xs space-y-1">
            <p className="text-gray-400">
              Risk Score: <span className="text-white font-bold">{simulation.results.threatAnalysis.riskScore?.toFixed(0)}%</span>
            </p>
            <p className="text-gray-400">
              Threats Found: <span className="text-white">{simulation.results.threatAnalysis.threats?.length || 0}</span>
            </p>
            {simulation.results.threatAnalysis.recommendations?.length > 0 && (
              <div className="mt-2">
                <p className="text-orange-400 font-bold">Recommendations:</p>
                {simulation.results.threatAnalysis.recommendations.slice(0, 2).map((rec, i) => (
                  <p key={i} className="text-gray-300 ml-2">• {rec.action}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Metrics Panel
const MetricsPanel = ({ metrics }) => {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-gray-800 rounded-xl p-4 border border-blue-600">
        <h4 className="text-blue-400 text-sm font-bold mb-2">📊 Transactions</h4>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Total:</span> <span className="text-white font-mono">{metrics.transactions?.total || 0}</span></p>
          <p><span className="text-gray-400">TPS:</span> <span className="text-white font-mono">{metrics.transactions?.perSecond || 0}</span></p>
          <p><span className="text-gray-400">Failed:</span> <span className="text-red-400 font-mono">{metrics.transactions?.failed || 0}</span></p>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-4 border border-green-600">
        <h4 className="text-green-400 text-sm font-bold mb-2">🌐 Network</h4>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Nodes:</span> <span className="text-white font-mono">{metrics.network?.activeNodes || 0}</span></p>
          <p><span className="text-gray-400">Latency:</span> <span className="text-white font-mono">{metrics.network?.latency?.toFixed(0) || 0}ms</span></p>
          <p><span className="text-gray-400">Connections:</span> <span className="text-white font-mono">{metrics.network?.connections || 0}</span></p>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-4 border border-purple-600">
        <h4 className="text-purple-400 text-sm font-bold mb-2">⛓️ Blocks</h4>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Height:</span> <span className="text-white font-mono">{metrics.blocks?.height || 0}</span></p>
          <p><span className="text-gray-400">Avg Time:</span> <span className="text-white font-mono">{(metrics.blocks?.avgBlockTime / 1000)?.toFixed(1) || 0}s</span></p>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-xl p-4 border border-red-600">
        <h4 className="text-red-400 text-sm font-bold mb-2">🔒 Security</h4>
        <div className="space-y-1 text-sm">
          <p><span className="text-gray-400">Suspicious:</span> <span className="text-yellow-400 font-mono">{metrics.security?.suspiciousActivities || 0}</span></p>
          <p><span className="text-gray-400">Auth Fails:</span> <span className="text-red-400 font-mono">{metrics.security?.failedAuthentications || 0}</span></p>
          <p><span className="text-gray-400">Invalid TX:</span> <span className="text-red-400 font-mono">{metrics.security?.invalidTransactions || 0}</span></p>
        </div>
      </div>
    </div>
  );
};

// Main SOC Page
const SecurityPage = () => {
  const [socStatus, setSocStatus] = useState('inactive');
  const [agents, setAgents] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [logFilter, setLogFilter] = useState('all'); // all, blockchain, alerts, agents
  const [autoRefreshLogs, setAutoRefreshLogs] = useState(true);
  const [blockchainStats, setBlockchainStats] = useState(null);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/soc/dashboard`);
      const data = await response.json();
      
      if (data.success) {
        setSocStatus(data.data.status);
        setAgents(data.data.agents || {});
        setAlerts(data.data.alerts || []);
        setMetrics(data.data.metrics);
        setBlockchainStats(data.data.blockchain);
      }
    } catch (error) {
      console.error('Failed to fetch SOC dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/soc/logs?limit=100`);
      const data = await response.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
      // Auto-refresh logs every 2 seconds when on logs tab
      if (autoRefreshLogs) {
        const logsInterval = setInterval(fetchLogs, 2000);
        return () => clearInterval(logsInterval);
      }
    }
  }, [activeTab, fetchLogs, autoRefreshLogs]);

  // Filter logs based on selected filter
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    if (logFilter === 'blockchain') return log.blockchain || log.agent === 'Blockchain' || log.message?.includes('BLOCKCHAIN');
    if (logFilter === 'alerts') return log.level === 'alert' || log.level === 'error' || log.level === 'warn';
    if (logFilter === 'agents') return ['Defender', 'Sensor', 'Analyzer', 'Controller'].includes(log.agent);
    return true;
  });

  // Start/Stop SOC
  const toggleSOC = async () => {
    try {
      const endpoint = socStatus === 'active' ? 'stop' : 'start';
      const response = await fetch(`${API_URL}/soc/${endpoint}`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSocStatus(endpoint === 'start' ? 'active' : 'inactive');
        fetchDashboard();
      }
    } catch (error) {
      console.error('Failed to toggle SOC:', error);
    }
  };

  // Toggle agent
  const toggleAgent = async (agentName) => {
    try {
      const isActive = agents[agentName]?.status === 'active';
      const endpoint = isActive ? 'stop' : 'start';
      await fetch(`${API_URL}/soc/agents/${agentName}/${endpoint}`, { method: 'POST' });
      fetchDashboard();
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  // Simulate attack
  const simulateAttack = async (attackType) => {
    setIsSimulating(true);
    setSimulationResult(null);
    
    try {
      const response = await fetch(`${API_URL}/soc/simulate/${attackType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      
      if (data.success) {
        setSimulationResult(data);
        fetchDashboard(); // Refresh to get new alerts
      }
    } catch (error) {
      console.error('Failed to simulate attack:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  // Acknowledge alert
  const acknowledgeAlert = async (alertId) => {
    try {
      await fetch(`${API_URL}/soc/alerts/${alertId}/acknowledge`, { method: 'POST' });
      fetchDashboard();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading SOC...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">🛡️ Security Operations Center</h1>
          <p className="text-gray-400 mt-1">Blockchain Security Monitoring & Defense</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            socStatus === 'active' ? 'bg-green-900/30 border border-green-500' : 'bg-gray-800 border border-gray-600'
          }`}>
            <span className={`w-3 h-3 rounded-full ${
              socStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}></span>
            <span className="font-bold">{socStatus === 'active' ? 'SOC ACTIVE' : 'SOC INACTIVE'}</span>
          </div>
          
          <button
            onClick={toggleSOC}
            className={`px-6 py-2 rounded-lg font-bold transition ${
              socStatus === 'active'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {socStatus === 'active' ? '⏹️ Stop SOC' : '▶️ Start SOC'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {['dashboard', 'attacks', 'alerts', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              activeTab === tab
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Metrics */}
          <MetricsPanel metrics={metrics} />
          
          {/* Agents */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">🤖 Security Agents</h2>
            <div className="grid grid-cols-4 gap-4">
              {['defender', 'sensor', 'analyzer', 'controller'].map(name => (
                <AgentCard
                  key={name}
                  name={name}
                  agent={agents[name]}
                  onToggle={toggleAgent}
                />
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">🚨 Recent Alerts</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No alerts</p>
              ) : (
                alerts.slice(-10).reverse().map((alert, i) => (
                  <AlertItem key={alert.id || i} alert={alert} onAcknowledge={acknowledgeAlert} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attacks Tab */}
      {activeTab === 'attacks' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-4">⚔️ Attack Simulation</h2>
            <p className="text-gray-400 mb-4">
              Simulate blockchain attacks to test SOC detection and response capabilities.
              {socStatus !== 'active' && (
                <span className="text-yellow-400 ml-2">⚠️ Start SOC first for full detection</span>
              )}
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              {ATTACK_TYPES.map(attack => (
                <AttackCard
                  key={attack.id}
                  attack={attack}
                  onSimulate={simulateAttack}
                  isSimulating={isSimulating}
                />
              ))}
            </div>
          </div>

          {/* Simulation Result */}
          {simulationResult && (
            <SimulationResult result={simulationResult} />
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4">🚨 All Alerts</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No alerts recorded</p>
            ) : (
              alerts.slice().reverse().map((alert, i) => (
                <AlertItem key={alert.id || i} alert={alert} onAcknowledge={acknowledgeAlert} />
              ))
            )}
          </div>
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">📋 Real-Time Security Logs</h2>
            <div className="flex items-center gap-4">
              {/* Blockchain Stats */}
              {blockchainStats && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg border border-cyan-600">
                  <span className={`w-2 h-2 rounded-full ${blockchainStats.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className="text-cyan-400 text-sm font-mono">
                    ⛓️ {blockchainStats.recordedIncidents || 0} incidents | {blockchainStats.recordedActions || 0} actions
                    {blockchainStats.pendingRecords > 0 && (
                      <span className="text-yellow-400 ml-2">({blockchainStats.pendingRecords} pending)</span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Auto-refresh toggle */}
              <button
                onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                className={`px-3 py-1 rounded text-sm ${
                  autoRefreshLogs ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {autoRefreshLogs ? '🔄 Auto' : '⏸️ Paused'}
              </button>
              
              {/* Manual refresh */}
              <button
                onClick={fetchLogs}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 rounded text-sm"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
          
          {/* Log Filters */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'all', label: 'All Logs', icon: '📋' },
              { id: 'blockchain', label: 'Blockchain', icon: '⛓️' },
              { id: 'alerts', label: 'Alerts', icon: '🚨' },
              { id: 'agents', label: 'Agents', icon: '🤖' },
            ].map(filter => (
              <button
                key={filter.id}
                onClick={() => setLogFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  logFilter === filter.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {filter.icon} {filter.label}
              </button>
            ))}
            <span className="ml-auto text-gray-500 text-sm self-center">
              {filteredLogs.length} logs
            </span>
          </div>
          
          {/* Log Entries */}
          <div className="bg-black rounded-xl p-4 font-mono text-xs max-h-[600px] overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No logs matching filter "{logFilter}"</p>
            ) : (
              filteredLogs.slice().reverse().map((log, i) => (
                <div key={i} className={`py-2 border-b border-gray-800 ${
                  log.blockchain || log.agent === 'Blockchain' ? 'bg-cyan-900/20 border-l-4 border-l-cyan-500 pl-2' :
                  log.level === 'alert' ? 'text-red-400 bg-red-900/10' :
                  log.level === 'warn' ? 'text-yellow-400 bg-yellow-900/10' :
                  log.level === 'error' ? 'text-red-400 bg-red-900/10' :
                  'text-gray-400'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-600 whitespace-nowrap">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      log.agent === 'Blockchain' ? 'bg-cyan-700 text-cyan-100' :
                      log.agent === 'Defender' ? 'bg-red-800 text-red-200' :
                      log.agent === 'Sensor' ? 'bg-blue-800 text-blue-200' :
                      log.agent === 'Analyzer' ? 'bg-purple-800 text-purple-200' :
                      log.agent === 'Controller' ? 'bg-green-800 text-green-200' :
                      'bg-gray-700 text-gray-300'
                    }`}>
                      {log.agent}
                    </span>
                    <span className={`px-1 text-xs rounded ${
                      log.level === 'alert' ? 'text-red-400' :
                      log.level === 'warn' ? 'text-yellow-400' :
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'info' ? 'text-green-400' :
                      'text-gray-500'
                    }`}>
                      [{log.level?.toUpperCase() || 'INFO'}]
                    </span>
                  </div>
                  <div className="ml-0 mt-1 text-sm">
                    {log.message}
                  </div>
                  {log.data && (
                    <div className="ml-4 mt-1 text-xs text-gray-500">
                      {JSON.stringify(log.data)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityPage;
