import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

// ============================================================================
// Vehicle Display Component (Read-Only)
// ============================================================================
function VehicleManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => (await axios.get('/api/v1/registry/vehicles')).data,
    refetchInterval: 5000,
  });

  const vehicles = vehiclesData?.data || [];
  const source = vehiclesData?.source || 'unknown';
  
  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = v.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         v.make?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || v.status === filterStatus;
    const matchesType = filterType === 'all' || v.vehicleType === filterType || v.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    suspended: vehicles.filter(v => v.status === 'suspended').length,
    byType: {
      car: vehicles.filter(v => v.vehicleType === 'car' || v.type === 'car').length,
      truck: vehicles.filter(v => v.vehicleType === 'truck' || v.type === 'truck').length,
      bus: vehicles.filter(v => v.vehicleType === 'bus' || v.type === 'bus').length,
      motorcycle: vehicles.filter(v => v.vehicleType === 'motorcycle' || v.type === 'motorcycle').length,
    }
  };

  const statusColors = {
    active: 'bg-green-900 text-green-300 border-green-700',
    suspended: 'bg-red-900 text-red-300 border-red-700',
    expired: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  };

  const typeIcons = {
    car: '🚗',
    truck: '🚚',
    bus: '🚌',
    motorcycle: '🏍️',
    van: '🚐',
  };

  return (
    <div className="space-y-6">
      {/* Header with Source Indicator */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🚗 Vehicles Registry</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          source === 'blockchain' ? 'bg-green-900 text-green-300 border border-green-600' : 'bg-yellow-900 text-yellow-300 border border-yellow-600'
        }`}>
          {source === 'blockchain' ? '⛓️ BLOCKCHAIN' : '📋 SIMULATION'}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-sm text-gray-400">Total Vehicles</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-400">Active</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-red-400">{stats.suspended}</div>
          <div className="text-sm text-gray-400">Suspended</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="flex gap-3 text-lg">
            <span title="Cars">🚗 {stats.byType.car}</span>
            <span title="Trucks">🚚 {stats.byType.truck}</span>
            <span title="Buses">🚌 {stats.byType.bus}</span>
            <span title="Motorcycles">🏍️ {stats.byType.motorcycle}</span>
          </div>
          <div className="text-sm text-gray-400">By Type</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="🔍 Search vehicles..."
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
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="car">🚗 Car</option>
          <option value="truck">🚚 Truck</option>
          <option value="bus">🚌 Bus</option>
          <option value="motorcycle">🏍️ Motorcycle</option>
        </select>
        
        <span className="text-gray-400 text-sm">{filteredVehicles.length} vehicles</span>
      </div>

      {/* Vehicle List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">License Plate</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Vehicle</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Type</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Fuel</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Owner</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">
                  <div className="animate-pulse">Loading vehicles from blockchain...</div>
                </td></tr>
              ) : filteredVehicles.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No vehicles found</td></tr>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-white">{vehicle.licensePlate}</div>
                      <div className="text-xs text-gray-500">{vehicle.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white">{vehicle.brand || vehicle.make} {vehicle.model}</div>
                      <div className="text-xs text-gray-400">{vehicle.year} • {vehicle.color}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xl" title={vehicle.vehicleType || vehicle.type}>
                        {typeIcons[vehicle.vehicleType || vehicle.type] || '🚗'}
                      </span>
                      <span className="ml-2 text-gray-300 capitalize">{vehicle.vehicleType || vehicle.type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{vehicle.fuelType}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-sm">{vehicle.ownerId}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[vehicle.status] || 'bg-gray-600 text-gray-300 border-gray-500'}`}>
                        {vehicle.status || 'active'}
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
// Driver Display Component (Read-Only)
// ============================================================================
function DriverManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: driversData, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => (await axios.get('/api/v1/registry/drivers')).data,
    refetchInterval: 5000,
  });

  const drivers = driversData?.data || [];
  const source = driversData?.source || 'unknown';
  
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = d.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         d.licenseNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || d.licenseStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.licenseStatus === 'active' || d.licenseStatus === 'valid').length,
    suspended: drivers.filter(d => d.licenseStatus === 'suspended').length,
    expired: drivers.filter(d => d.licenseStatus === 'expired').length,
  };

  const statusColors = {
    active: 'bg-green-900 text-green-300 border-green-700',
    valid: 'bg-green-900 text-green-300 border-green-700',
    suspended: 'bg-red-900 text-red-300 border-red-700',
    expired: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">👤 Drivers Registry</h2>
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
          <div className="text-sm text-gray-400">Total Drivers</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-green-400">{stats.active}</div>
          <div className="text-sm text-gray-400">Active License</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-red-400">{stats.suspended}</div>
          <div className="text-sm text-gray-400">Suspended</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-yellow-400">{stats.expired}</div>
          <div className="text-sm text-gray-400">Expired</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="🔍 Search drivers..."
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
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="expired">Expired</option>
        </select>
        
        <span className="text-gray-400 text-sm">{filteredDrivers.length} drivers</span>
      </div>

      {/* Drivers List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Driver</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">License Number</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Categories</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Expiry</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Points</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">
                  <div className="animate-pulse">Loading drivers from blockchain...</div>
                </td></tr>
              ) : filteredDrivers.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-400">No drivers found</td></tr>
              ) : (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-bold text-white">{driver.firstName} {driver.lastName}</div>
                      <div className="text-xs text-gray-500">{driver.id}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{driver.licenseNumber}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {(driver.licenseCategories || []).map((cat, i) => (
                          <span key={i} className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded text-xs font-bold">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{driver.licenseExpiryDate}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-bold ${(driver.points || 12) < 6 ? 'text-red-400' : 'text-green-400'}`}>
                        {driver.points || 12}/12
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[driver.licenseStatus] || statusColors.active}`}>
                        {driver.licenseStatus || 'active'}
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
// Violations Display Component (Read-Only)
// ============================================================================
function ViolationManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: violationsData, isLoading } = useQuery({
    queryKey: ['violations'],
    queryFn: async () => (await axios.get('/api/v1/registry/violations')).data,
    refetchInterval: 5000,
  });

  const violations = violationsData?.data || [];
  const source = violationsData?.source || 'unknown';
  
  const filteredViolations = violations.filter(v => 
    v.vehicleId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeIcons = {
    speeding: '🚀',
    red_light: '🚦',
    parking: '🅿️',
    dangerous_driving: '⚠️',
    no_seatbelt: '🪢',
    phone_use: '📱',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🚨 Violations</h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          source === 'blockchain' ? 'bg-green-900 text-green-300 border border-green-600' : 'bg-yellow-900 text-yellow-300 border border-yellow-600'
        }`}>
          {source === 'blockchain' ? '⛓️ BLOCKCHAIN' : '📋 SIMULATION'}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-red-400">{violations.length}</div>
          <div className="text-sm text-gray-400">Total Violations</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-yellow-400">
            {violations.reduce((sum, v) => sum + (v.fineAmount || 0), 0)} MAD
          </div>
          <div className="text-sm text-gray-400">Total Fines</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-orange-400">
            {violations.reduce((sum, v) => sum + (v.pointsDeducted || 0), 0)}
          </div>
          <div className="text-sm text-gray-400">Points Deducted</div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
          <div className="text-3xl font-bold text-blue-400">
            {violations.filter(v => v.status === 'paid').length}
          </div>
          <div className="text-sm text-gray-400">Paid</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <input
          type="text"
          placeholder="🔍 Search violations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 w-full"
        />
      </div>

      {/* Violations List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">ID</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Type</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Vehicle</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Driver</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Fine</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Points</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {isLoading ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-400">
                  <div className="animate-pulse">Loading violations...</div>
                </td></tr>
              ) : filteredViolations.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-gray-400">No violations recorded</td></tr>
              ) : (
                filteredViolations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 font-mono text-sm text-gray-300">{violation.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-lg mr-2">{typeIcons[violation.type] || '⚠️'}</span>
                      <span className="text-white capitalize">{violation.type?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-300">{violation.vehicleId}</td>
                    <td className="px-4 py-3 font-mono text-gray-300">{violation.driverId}</td>
                    <td className="px-4 py-3 text-yellow-400 font-bold">{violation.fineAmount} MAD</td>
                    <td className="px-4 py-3 text-red-400 font-bold">-{violation.pointsDeducted}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        violation.status === 'paid' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {violation.status || 'pending'}
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
// Main Registry Page with Navigation
// ============================================================================
function RegistryPage() {
  const location = useLocation();
  const currentPath = location.pathname;

  const tabs = [
    { path: '/registry', label: '🚗 Vehicles', exact: true },
    { path: '/registry/drivers', label: '👤 Drivers' },
    { path: '/registry/violations', label: '🚨 Violations' },
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
          <h1 className="text-3xl font-bold text-white">📋 Traffic Registry</h1>
          <p className="text-gray-400 mt-1">Vehicle, Driver & Violation Records on Blockchain</p>
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
        <Route index element={<VehicleManagement />} />
        <Route path="drivers" element={<DriverManagement />} />
        <Route path="violations" element={<ViolationManagement />} />
      </Routes>
    </div>
  );
}

export default RegistryPage;
