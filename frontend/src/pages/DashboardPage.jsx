import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from 'recharts';
import { Link } from 'react-router-dom';

function DashboardPage() {
  // Fetch all data from blockchain
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await axios.get('/api/v1/health')).data,
  });

  const { data: roadsData, isLoading: loadingRoads } = useQuery({
    queryKey: ['roads'],
    queryFn: async () => (await axios.get('/api/v1/roads')).data,
  });

  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => (await axios.get('/api/v1/registry/vehicles')).data,
  });

  const { data: driversData, isLoading: loadingDrivers } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => (await axios.get('/api/v1/registry/drivers')).data,
  });

  const { data: sensorsData, isLoading: loadingSensors } = useQuery({
    queryKey: ['sensors'],
    queryFn: async () => (await axios.get('/api/v1/sensors')).data,
  });

  const { data: violationsData } = useQuery({
    queryKey: ['violations'],
    queryFn: async () => (await axios.get('/api/v1/registry/violations')).data,
    refetchInterval: 3000, // Real-time refresh every 3 seconds
  });

  const { data: socStatus } = useQuery({
    queryKey: ['soc-status'],
    queryFn: async () => (await axios.get('/api/v1/soc/status')).data,
    refetchInterval: 10000,
  });

  // Extract data
  const roads = roadsData?.data || [];
  const vehicles = vehiclesData?.data || [];
  const drivers = driversData?.data || [];
  const sensors = sensorsData?.data || [];
  const violations = violationsData?.data || [];

  // Calculate statistics
  const roadStats = {
    total: roads.length,
    open: roads.filter(r => r.status === 'open').length,
    closed: roads.filter(r => r.status === 'closed').length,
    maintenance: roads.filter(r => r.status === 'maintenance').length,
    congested: roads.filter(r => r.status === 'congested').length,
  };

  const vehicleStats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    suspended: vehicles.filter(v => v.status === 'suspended').length,
    byType: {
      car: vehicles.filter(v => v.type === 'car').length,
      truck: vehicles.filter(v => v.type === 'truck').length,
      bus: vehicles.filter(v => v.type === 'bus').length,
      motorcycle: vehicles.filter(v => v.type === 'motorcycle').length,
    },
    byFuel: {
      gasoline: vehicles.filter(v => v.fuelType === 'gasoline').length,
      diesel: vehicles.filter(v => v.fuelType === 'diesel').length,
      electric: vehicles.filter(v => v.fuelType === 'electric').length,
      hybrid: vehicles.filter(v => v.fuelType === 'hybrid').length,
    }
  };

  const driverStats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
    expired: drivers.filter(d => d.status === 'expired').length,
  };

  const sensorStats = {
    total: sensors.length,
    active: sensors.filter(s => s.status === 'active').length,
    inactive: sensors.filter(s => s.status === 'inactive').length,
  };

  const violationStats = {
    total: violations.length,
    pending: violations.filter(v => v.status === 'pending').length,
    paid: violations.filter(v => v.status === 'paid').length,
    totalFines: violations.reduce((sum, v) => sum + (v.fineAmount || 0), 0),
  };

  // Chart data
  const roadStatusChart = [
    { name: 'Open', value: roadStats.open, color: '#22c55e' },
    { name: 'Closed', value: roadStats.closed, color: '#ef4444' },
    { name: 'Maintenance', value: roadStats.maintenance, color: '#f59e0b' },
    { name: 'Congested', value: roadStats.congested, color: '#f97316' },
  ];

  const vehicleTypeChart = [
    { name: '🚗 Cars', value: vehicleStats.byType.car, color: '#3b82f6' },
    { name: '🚚 Trucks', value: vehicleStats.byType.truck, color: '#f97316' },
    { name: '🚌 Buses', value: vehicleStats.byType.bus, color: '#8b5cf6' },
    { name: '🏍️ Motorcycles', value: vehicleStats.byType.motorcycle, color: '#06b6d4' },
  ];

  const fuelTypeChart = [
    { name: 'Gasoline', value: vehicleStats.byFuel.gasoline, color: '#ef4444' },
    { name: 'Diesel', value: vehicleStats.byFuel.diesel, color: '#6b7280' },
    { name: 'Electric', value: vehicleStats.byFuel.electric, color: '#22c55e' },
    { name: 'Hybrid', value: vehicleStats.byFuel.hybrid, color: '#3b82f6' },
  ];

  const isLoading = loadingRoads || loadingVehicles || loadingDrivers || loadingSensors;

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Dashboard
          </h2>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${health?.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
              <span className={`w-2 h-2 rounded-full ${health?.success ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></span>
              API {health?.success ? 'Online' : 'Offline'}
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${socStatus?.data?.status === 'active' ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-400'}`}>
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              SOC {socStatus?.data?.status === 'active' ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            Loading blockchain data...
          </div>
        )}

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Link to="/roads" className="bg-gradient-to-br from-green-900 to-green-800 rounded-xl p-4 border border-green-700 hover:border-green-500 transition">
            <div className="text-3xl mb-1">🛣️</div>
            <div className="text-3xl font-bold text-white">{roadStats.total}</div>
            <div className="text-sm text-green-300">Roads</div>
          </Link>

          <Link to="/registry/vehicles" className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-4 border border-blue-700 hover:border-blue-500 transition">
            <div className="text-3xl mb-1">🚗</div>
            <div className="text-3xl font-bold text-white">{vehicleStats.total}</div>
            <div className="text-sm text-blue-300">Vehicles</div>
          </Link>

          <Link to="/registry/drivers" className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-4 border border-purple-700 hover:border-purple-500 transition">
            <div className="text-3xl mb-1">👤</div>
            <div className="text-3xl font-bold text-white">{driverStats.total}</div>
            <div className="text-sm text-purple-300">Drivers</div>
          </Link>

          <Link to="/sensors" className="bg-gradient-to-br from-cyan-900 to-cyan-800 rounded-xl p-4 border border-cyan-700 hover:border-cyan-500 transition">
            <div className="text-3xl mb-1">📡</div>
            <div className="text-3xl font-bold text-white">{sensorStats.total}</div>
            <div className="text-sm text-cyan-300">Sensors</div>
          </Link>

          <Link to="/registry/events" className="bg-gradient-to-br from-red-900 to-red-800 rounded-xl p-4 border border-red-700 hover:border-red-500 transition">
            <div className="text-3xl mb-1">🚔</div>
            <div className="text-3xl font-bold text-white">{violationStats.total}</div>
            <div className="text-sm text-red-300">Violations</div>
          </Link>

          <Link to="/security" className="bg-gradient-to-br from-orange-900 to-orange-800 rounded-xl p-4 border border-orange-700 hover:border-orange-500 transition">
            <div className="text-3xl mb-1">🛡️</div>
            <div className="text-3xl font-bold text-white">{socStatus?.data?.stats?.totalEvents || 0}</div>
            <div className="text-sm text-orange-300">SOC Alerts</div>
          </Link>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Road Status Chart */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🛣️</span> Road Status
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={roadStatusChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {roadStatusChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              {roadStatusChart.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-300">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Types Chart */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🚗</span> Vehicle Types
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vehicleTypeChart} layout="vertical">
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="name" stroke="#9ca3af" width={100} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {vehicleTypeChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Fuel Types Chart */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>⛽</span> Fuel Types
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={fuelTypeChart}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? name : ''}
                >
                  {fuelTypeChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2 text-sm flex-wrap">
              {fuelTypeChart.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Detail Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vehicle Status */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Vehicles & Drivers Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Vehicles</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">✅ Active</span>
                    <span className="font-bold text-white">{vehicleStats.active}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(vehicleStats.active / vehicleStats.total) * 100 || 0}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-400">⛔ Suspended</span>
                    <span className="font-bold text-white">{vehicleStats.suspended}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${(vehicleStats.suspended / vehicleStats.total) * 100 || 0}%` }}></div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-2">Drivers</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">✅ Active</span>
                    <span className="font-bold text-white">{driverStats.active}</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(driverStats.active / driverStats.total) * 100 || 0}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-red-400">⛔ Suspended</span>
                    <span className="font-bold text-white">{driverStats.suspended}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400">⚠️ Expired</span>
                    <span className="font-bold text-white">{driverStats.expired}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Violations Summary */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🚔</span> Violations Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-red-900/30 rounded-lg p-4 text-center border border-red-800">
                <div className="text-3xl font-bold text-red-400">{violationStats.total}</div>
                <div className="text-sm text-red-300">Total</div>
              </div>
              <div className="bg-yellow-900/30 rounded-lg p-4 text-center border border-yellow-800">
                <div className="text-3xl font-bold text-yellow-400">{violationStats.pending}</div>
                <div className="text-sm text-yellow-300">Pending</div>
              </div>
              <div className="bg-green-900/30 rounded-lg p-4 text-center border border-green-800">
                <div className="text-3xl font-bold text-green-400">{violationStats.paid}</div>
                <div className="text-sm text-green-300">Paid</div>
              </div>
            </div>
            <div className="mt-4 bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">Total Fines</div>
              <div className="text-3xl font-bold text-blue-400">{violationStats.totalFines.toLocaleString()} MAD</div>
            </div>
          </div>

          {/* Live Violations Feed */}
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 col-span-2">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="animate-pulse">🚨</span> Live Violations Feed
              <span className="ml-auto text-xs text-gray-400">Auto-refreshes every 3s</span>
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {violations.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No violations recorded yet</p>
                  <p className="text-sm">Run simulation to detect violations</p>
                </div>
              ) : (
                violations.slice(-10).reverse().map((v, idx) => (
                  <div 
                    key={v.id || idx} 
                    className={`bg-gray-700/50 rounded-lg p-3 border-l-4 ${
                      v.status === 'pending' ? 'border-yellow-500' : 
                      v.status === 'paid' ? 'border-green-500' : 'border-red-500'
                    } flex items-center justify-between hover:bg-gray-700 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {v.violationType === 'speeding' ? '🚗💨' : 
                         v.violationType === 'red_light' ? '🚦' : 
                         v.violationType === 'parking' ? '🅿️' : '⚠️'}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {v.violationType?.replace('_', ' ').toUpperCase() || 'VIOLATION'}
                        </div>
                        <div className="text-sm text-gray-400">
                          Vehicle: {v.vehicleId?.slice(0, 12) || 'Unknown'}...
                          {v.description && <span className="ml-2">• {v.description.slice(0, 30)}</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {v.timestamp ? new Date(v.timestamp).toLocaleString() : 'Recent'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${
                        v.status === 'pending' ? 'text-yellow-400' : 
                        v.status === 'paid' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {v.fineAmount?.toLocaleString() || 0} MAD
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                        v.status === 'pending' ? 'bg-yellow-900/50 text-yellow-300' : 
                        v.status === 'paid' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                      }`}>
                        {v.status?.toUpperCase() || 'PENDING'}
                      </div>
                      {v.penaltyPoints > 0 && (
                        <div className="text-xs text-orange-400 mt-1">
                          -{v.penaltyPoints} points
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            {violations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-700 flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Showing latest {Math.min(violations.length, 10)} of {violations.length} violations
                </span>
                <Link 
                  to="/registry/events" 
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                >
                  View All →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
