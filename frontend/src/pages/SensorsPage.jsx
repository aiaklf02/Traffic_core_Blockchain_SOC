import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function SensorsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sensors'],
    queryFn: async () => (await axios.get('/api/v1/sensors')).data,
  });

  const sensors = data?.data || [];

  const typeColors = {
    traffic: '#8B5CF6',
    speed: '#EC4899',
    air_quality: '#06B6D4',
    weather: '#84CC16',
    parking: '#F97316',
    noise: '#EF4444',
  };

  const typeIcons = {
    traffic: '🚦',
    speed: '⚡',
    air_quality: '💨',
    weather: '🌡️',
    parking: '🅿️',
    noise: '🔊',
  };

  const statusColors = {
    active: 'bg-green-900 text-green-300',
    maintenance: 'bg-yellow-900 text-yellow-300',
    inactive: 'bg-red-900 text-red-300',
  };

  // Center on Casablanca
  const casablancaCenter = [33.5731, -7.6100];

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="text-4xl">📡</span>
          IoT Sensors Network
        </h2>
        
        {isLoading && <div className="text-gray-400">Loading sensors...</div>}
        {error && <div className="text-red-400">Error loading sensors</div>}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>🗺️</span> Sensor Map - Casablanca
            </h3>
            <MapContainer 
              center={casablancaCenter} 
              zoom={13} 
              style={{ height: '400px', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {sensors.map((sensor) => (
                <CircleMarker
                  key={sensor.id}
                  center={[sensor.location.latitude, sensor.location.longitude]}
                  radius={12}
                  fillColor={typeColors[sensor.type] || '#6B7280'}
                  color="#1F2937"
                  weight={2}
                  opacity={1}
                  fillOpacity={0.8}
                >
                  <Popup>
                    <div className="text-center">
                      <div className="text-2xl mb-1">{typeIcons[sensor.type] || '📡'}</div>
                      <div className="font-bold text-gray-800">{sensor.name}</div>
                      <div className="text-sm text-gray-600">Type: {sensor.type}</div>
                      <div className="text-sm text-gray-600">Status: {sensor.status}</div>
                      <div className="text-xs text-gray-400 mt-1">{sensor.manufacturer} {sensor.model}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Sensors List */}
          <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Sensors List
              <span className="ml-auto text-sm bg-purple-600 px-2 py-1 rounded">
                {sensors.length}
              </span>
            </h3>
            <ul className="space-y-3 max-h-96 overflow-y-auto">
              {sensors.map((sensor) => (
                <li key={sensor.id} className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
                        style={{ backgroundColor: typeColors[sensor.type] || '#6B7280' }}
                      >
                        {typeIcons[sensor.type] || '📡'}
                      </span>
                      <div className="font-semibold text-white">{sensor.name}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[sensor.status] || 'bg-gray-600 text-gray-300'}`}>
                      {sensor.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-2 ml-10">
                    <span className="capitalize">{sensor.type.replace('_', ' ')}</span>
                    <span className="mx-2">•</span>
                    <span className="text-gray-400">{sensor.manufacturer} {sensor.model}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 ml-10">
                    📍 {sensor.location.latitude.toFixed(4)}, {sensor.location.longitude.toFixed(4)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sensor Type Legend */}
        <div className="mt-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Sensor Types</h3>
          <div className="flex flex-wrap gap-4">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <span 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                  style={{ backgroundColor: color }}
                >
                  {typeIcons[type]}
                </span>
                <span className="text-gray-300 capitalize">{type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensorsPage;
