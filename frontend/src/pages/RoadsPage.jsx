import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

// ============================================================================
// Road List Component (Read-Only)
// ============================================================================
function RoadList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['roads'],
    queryFn: async () => (await axios.get('/api/v1/roads')).data,
    refetchInterval: 5000,
  });

  const roads = data?.data || [];
  const source = data?.source || 'unknown';

  const filteredRoads = roads.filter(r => {
    const matchesSearch = r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchesType = filterType === 'all' || r.roadType === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: roads.length,
    open: roads.filter(r => r.status === 'open').length,
    closed: roads.filter(r => r.status === 'closed').length,
    maintenance: roads.filter(r => r.status === 'maintenance').length,
    congested: roads.filter(r => r.status === 'congested').length,
    totalLength: roads.reduce((sum, r) => sum + (r.length || 0), 0),
  };

  const statusColors = {
    open: 'bg-green-900 text-green-300 border-green-700',
    closed: 'bg-red-900 text-red-300 border-red-700',
    maintenance: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    congested: 'bg-orange-900 text-orange-300 border-orange-700',
  };

  const statusIcons = {
    open: '✅',
    closed: '🚫',
    maintenance: '🔧',
    congested: '🚗',
  };

  const typeIcons = {
    highway: '🛣️',
    primary: '🚗',
    secondary: '🚙',
    residential: '🏘️',
    commercial: '🏢',
  };

  return (
    <div className="space-y-6">
      {/* Header with Source Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🛣️ Roads Network</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          source === 'blockchain' ? 'bg-green-900 text-green-300 border border-green-600' : 'bg-yellow-900 text-yellow-300 border border-yellow-600'
        }`}>
          {source === 'blockchain' ? '⛓️ BLOCKCHAIN' : '📋 SIMULATION'}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Roads</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{stats.open}</div>
          <div className="text-sm text-gray-400">✅ Open</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-red-400">{stats.closed}</div>
          <div className="text-sm text-gray-400">🚫 Closed</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-yellow-400">{stats.maintenance}</div>
          <div className="text-sm text-gray-400">🔧 Maintenance</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-cyan-400">{stats.totalLength.toFixed(1)} km</div>
          <div className="text-sm text-gray-400">Total Length</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="🔍 Search roads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 flex-grow"
        />
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">✅ Open</option>
          <option value="closed">🚫 Closed</option>
          <option value="maintenance">🔧 Maintenance</option>
          <option value="congested">🚗 Congested</option>
        </select>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="highway">🛣️ Highway</option>
          <option value="primary">🚗 Primary</option>
          <option value="secondary">🚙 Secondary</option>
          <option value="residential">🏘️ Residential</option>
          <option value="commercial">🏢 Commercial</option>
        </select>
        
        <span className="text-gray-400 text-sm">{filteredRoads.length} roads</span>
      </div>

      {/* Roads List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Road Name</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Type</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Lanes</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Speed Limit</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Length</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">
                  <div className="animate-pulse">Loading roads from blockchain...</div>
                </td></tr>
              ) : filteredRoads.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No roads found</td></tr>
              ) : (
                filteredRoads.map((road) => (
                  <tr key={road.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{road.name}</div>
                      <div className="text-xs text-gray-500">{road.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg mr-2">{typeIcons[road.roadType] || '🛤️'}</span>
                      <span className="text-gray-300 capitalize">{road.roadType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{road.lanes} lanes</td>
                    <td className="px-4 py-3 text-cyan-400 font-mono">{road.speedLimit} km/h</td>
                    <td className="px-4 py-3 text-gray-300">{road.length?.toFixed(1)} km</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[road.status] || 'bg-gray-600 text-gray-300 border-gray-500'}`}>
                        {statusIcons[road.status] || '❓'} {road.status || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Intersections Display Component (Read-Only)
// ============================================================================
function IntersectionList() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['intersections'],
    queryFn: async () => (await axios.get('/api/v1/roads/intersections/all')).data,
    refetchInterval: 5000,
  });

  const intersections = data?.data || [];
  const source = data?.source || 'unknown';

  const filteredIntersections = intersections.filter(i => 
    i.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: intersections.length,
    signalized: intersections.filter(i => i.type === 'signalized').length,
    roundabout: intersections.filter(i => i.type === 'roundabout').length,
    uncontrolled: intersections.filter(i => i.type === 'uncontrolled').length,
  };

  const typeColors = {
    signalized: 'bg-green-900 text-green-300 border-green-700',
    roundabout: 'bg-blue-900 text-blue-300 border-blue-700',
    uncontrolled: 'bg-yellow-900 text-yellow-300 border-yellow-700',
    stop_sign: 'bg-red-900 text-red-300 border-red-700',
  };

  const typeIcons = {
    signalized: '🚦',
    roundabout: '🔄',
    uncontrolled: '⚠️',
    stop_sign: '🛑',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🚦 Intersections</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          source === 'blockchain' ? 'bg-green-900 text-green-300 border border-green-600' : 'bg-yellow-900 text-yellow-300 border border-yellow-600'
        }`}>
          {source === 'blockchain' ? '⛓️ BLOCKCHAIN' : '📋 SIMULATION'}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Intersections</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{stats.signalized}</div>
          <div className="text-sm text-gray-400">🚦 Signalized</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-cyan-400">{stats.roundabout}</div>
          <div className="text-sm text-gray-400">🔄 Roundabouts</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-yellow-400">{stats.uncontrolled}</div>
          <div className="text-sm text-gray-400">⚠️ Uncontrolled</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <input
          type="text"
          placeholder="🔍 Search intersections..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-full"
        />
      </div>

      {/* Intersections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-gray-400">
            <div className="animate-pulse">Loading intersections from blockchain...</div>
          </div>
        ) : filteredIntersections.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-400">No intersections found</div>
        ) : (
          filteredIntersections.map((intersection) => (
            <div key={intersection.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-cyan-600 transition">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-2xl mb-1">{typeIcons[intersection.type] || '🚦'}</div>
                  <h3 className="font-bold text-white">{intersection.name}</h3>
                  <div className="text-xs text-gray-500">{intersection.id}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${typeColors[intersection.type] || 'bg-gray-600 text-gray-300 border-gray-500'}`}>
                  {intersection.type}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Connected Roads:</span>
                  <span className="text-cyan-400 font-bold">{intersection.connectedRoads?.length || 0}</span>
                </div>
                {intersection.type === 'signalized' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cycle Time:</span>
                      <span className="text-white">{intersection.signalTiming?.cycleTime || 120}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Phases:</span>
                      <span className="text-white">{intersection.signalTiming?.phases || 4}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-gray-300 font-mono text-xs">
                    {intersection.location?.lat?.toFixed(4)}, {intersection.location?.lng?.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Roads Page with Navigation
// ============================================================================
function RoadsPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/roads', label: '🛣️ Roads', exact: true },
    { path: '/roads/intersections', label: '🚦 Intersections' },
  ];

  const isActive = (path, exact = false) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">🛣️ Road Network</h1>
          <p className="text-gray-400 mt-1">Roads & Intersections Infrastructure on Blockchain</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-2 border border-cyan-600">
          <span className="text-cyan-400 text-sm">🔒 Read-Only Mode</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`px-4 py-2 rounded-t-lg transition ${
              isActive(tab.path, tab.exact)
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Content */}
      <Routes>
        <Route index element={<RoadList />} />
        <Route path="intersections" element={<IntersectionList />} />
      </Routes>
    </div>
  );
}

export default RoadsPage;
