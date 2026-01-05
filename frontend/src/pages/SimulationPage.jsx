import React, { useState, useEffect, useRef, useCallback } from 'react';

// Blockchain Transaction Component
const BlockchainTransaction = ({ tx }) => {
  const typeColors = {
    vehicle_move: 'text-blue-400',
    sensor_reading: 'text-green-400',
    traffic_event: 'text-red-400',
    signal_change: 'text-yellow-400',
    road_update: 'text-purple-400',
    manual_tx: 'text-cyan-400'
  };

  const typeIcons = {
    vehicle_move: '🚗',
    sensor_reading: '📡',
    traffic_event: '⚠️',
    signal_change: '🚦',
    road_update: '🛣️',
    manual_tx: '✍️'
  };

  return (
    <div className="flex items-center gap-2 text-xs py-1 border-b border-gray-700/50">
      <span className="text-gray-600 font-mono w-8">#{tx.blockNum}</span>
      <span>{typeIcons[tx.type] || '📦'}</span>
      <span className={`font-semibold ${typeColors[tx.type] || 'text-gray-400'}`}>
        {tx.type.replace('_', ' ').toUpperCase()}
      </span>
      <span className="text-gray-500 truncate flex-1 font-mono text-[10px]">{tx.hash}</span>
      <span className="text-gray-600 text-[10px]">{tx.timestamp}</span>
    </div>
  );
};

// Configuration Slider Component
const ConfigSlider = ({ label, value, onChange, min, max, icon }) => (
  <div className="flex items-center gap-3 bg-gray-700/50 rounded-lg p-2">
    <span className="text-xl">{icon}</span>
    <div className="flex-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-300">{label}</span>
        <span className="text-blue-400 font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  </div>
);

// Composant pour un véhicule animé
const Vehicle = ({ x, y, type, speed, direction }) => {
  const colors = {
    car: '#3B82F6',      // blue
    truck: '#EF4444',    // red
    bus: '#F59E0B',      // yellow
    motorcycle: '#10B981' // green
  };

  const sizes = {
    car: { w: 30, h: 16 },
    truck: { w: 45, h: 20 },
    bus: { w: 50, h: 18 },
    motorcycle: { w: 20, h: 10 }
  };

  const size = sizes[type] || sizes.car;
  const rotation = direction === 'left' ? 180 : direction === 'up' ? -90 : direction === 'down' ? 90 : 0;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotation})`}>
      <rect
        x={-size.w / 2}
        y={-size.h / 2}
        width={size.w}
        height={size.h}
        rx={4}
        fill={colors[type] || colors.car}
        opacity={0.9}
      />
      {/* Phares */}
      <circle cx={size.w / 2 - 3} cy={-size.h / 4} r={2} fill="#FEF3C7" />
      <circle cx={size.w / 2 - 3} cy={size.h / 4} r={2} fill="#FEF3C7" />
      {/* Vitesse indicator */}
      <text x={0} y={size.h + 12} textAnchor="middle" fontSize="8" fill="#9CA3AF">
        {speed} km/h
      </text>
    </g>
  );
};

// Composant pour un capteur
const Sensor = ({ x, y, type, reading, status }) => {
  const colors = {
    traffic: '#8B5CF6',
    speed: '#EC4899',
    air_quality: '#06B6D4',
    weather: '#84CC16',
    parking: '#F97316'
  };

  const icons = {
    traffic: '🚦',
    speed: '⚡',
    air_quality: '💨',
    weather: '🌡️',
    parking: '🅿️'
  };

  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r={18} fill={colors[type] || '#6B7280'} opacity={0.8} />
      <circle r={22} fill="none" stroke={colors[type] || '#6B7280'} strokeWidth={2} opacity={0.4}>
        <animate attributeName="r" values="18;30;18" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <text textAnchor="middle" dominantBaseline="middle" fontSize="14">
        {icons[type] || '📡'}
      </text>
      <text y={32} textAnchor="middle" fontSize="9" fill="#D1D5DB" fontWeight="bold">
        {reading}
      </text>
    </g>
  );
};

// Composant pour un événement de trafic
const TrafficEvent = ({ x, y, type, severity }) => {
  const colors = {
    low: '#22C55E',
    medium: '#F59E0B',
    high: '#EF4444',
    critical: '#DC2626'
  };

  const icons = {
    accident: '💥',
    congestion: '🚗',
    roadwork: '🚧',
    closure: '⛔'
  };

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-25} y={-15} width={50} height={30} rx={6} fill={colors[severity]} opacity={0.9}>
        <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1s" repeatCount="indefinite" />
      </rect>
      <text textAnchor="middle" dominantBaseline="middle" fontSize="18">
        {icons[type] || '⚠️'}
      </text>
    </g>
  );
};

// Route avec animation de trafic
const Road = ({ x1, y1, x2, y2, name, status, lanes }) => {
  const statusColors = {
    open: '#22C55E',
    closed: '#EF4444',
    maintenance: '#F59E0B',
    congested: '#F97316'
  };

  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g>
      {/* Route principale */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#374151"
        strokeWidth={lanes * 12}
        strokeLinecap="round"
      />
      {/* Marquage central */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#FCD34D"
        strokeWidth={2}
        strokeDasharray="15,10"
      />
      {/* Indicateur de statut */}
      <circle cx={midX} cy={midY - 25} r={6} fill={statusColors[status] || '#6B7280'} />
      {/* Nom de la route */}
      <text
        x={midX}
        y={midY - 35}
        textAnchor="middle"
        fontSize="10"
        fill="#9CA3AF"
        fontWeight="500"
      >
        {name}
      </text>
    </g>
  );
};

// Intersection
const Intersection = ({ x, y, name }) => (
  <g transform={`translate(${x}, ${y})`}>
    <rect x={-30} y={-30} width={60} height={60} rx={8} fill="#1F2937" stroke="#374151" strokeWidth={2} />
    <text textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#9CA3AF">
      {name}
    </text>
  </g>
);

const SimulationPage = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [scenario, setScenario] = useState('normal');
  const [vehicles, setVehicles] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [events, setEvents] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [showTerminal, setShowTerminal] = useState(true);
  const terminalRef = useRef(null);
  
  // Form for manual event creation
  const [newEvent, setNewEvent] = useState({
    type: 'accident',
    roadId: 'ROAD-001',
    severity: 'medium',
    description: ''
  });
  
  // Dynamic configuration
  const [config, setConfig] = useState({
    maxVehicles: 30,
    roadCount: 6,
    intersectionCount: 8,
    sensorCount: 5
  });

  const [stats, setStats] = useState({
    totalVehicles: 0,
    avgSpeed: 0,
    incidents: 0,
    airQuality: 'Good',
    totalTransactions: 0,
    blocksCreated: 0
  });
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  const blockNumRef = useRef(1);
  const txCountRef = useRef(0);

  // Add log to terminal
  const addTerminalLog = useCallback((type, message, details = {}) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      type, // 'success', 'error', 'info', 'warning'
      message,
      details
    };
    setTerminalLogs(prev => [...prev.slice(-50), logEntry]);
    
    // Auto-scroll terminal
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Generate random transaction hash
  const generateTxHash = () => {
    return '0x' + Array.from({ length: 16 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  };

  // Send event to blockchain API
  const sendEventToBlockchain = async (eventData) => {
    addTerminalLog('info', `📤 Sending ${eventData.type} event to blockchain...`, { roadId: eventData.roadId });
    
    try {
      const response = await fetch('/api/v1/roads/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      const result = await response.json();
      
      if (result.success) {
        if (result.source === 'blockchain') {
          addTerminalLog('success', `✅ BLOCKCHAIN TX SUCCESS: ${eventData.type} event recorded`, {
            eventId: result.data?.id,
            roadId: eventData.roadId,
            severity: eventData.severity,
            source: 'sensor-data chaincode'
          });
        } else {
          addTerminalLog('warning', `⚠️ MOCK MODE: ${eventData.type} event (blockchain unavailable)`, {
            eventId: result.data?.id,
            roadId: eventData.roadId
          });
        }
      } else {
        addTerminalLog('error', `❌ FAILED: ${result.error || 'Unknown error'}`, { eventData });
      }
      
      console.log('📦 Event sent to blockchain:', result);
      return result;
    } catch (error) {
      addTerminalLog('error', `❌ ERROR: ${error.message}`, { eventData });
      console.error('❌ Error sending event:', error);
      return null;
    }
  };

  // Add manual event (sent to blockchain)
  const handleAddManualEvent = async () => {
    const eventData = {
      type: newEvent.type,
      roadId: newEvent.roadId,
      severity: newEvent.severity,
      description: newEvent.description || `Manual ${newEvent.type} event`,
      location: { lat: 33.5731, lng: -7.5898 }
    };
    
    // Send to blockchain
    const result = await sendEventToBlockchain(eventData);
    
    if (result?.success) {
      // Add to local display
      const positions = [
        { x: 175, y: 250 },
        { x: 475, y: 250 },
        { x: 325, y: 200 },
        { x: 625, y: 300 },
      ];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      
      setEvents(prev => [
        ...prev.slice(-4),
        {
          id: Date.now(),
          type: newEvent.type,
          severity: newEvent.severity,
          x: pos.x,
          y: pos.y,
          source: result.source
        }
      ]);
      
      // Log as blockchain transaction
      addTransaction('manual_event', { 
        eventType: newEvent.type, 
        severity: newEvent.severity,
        source: result.source,
        roadId: newEvent.roadId
      });
      
      // Reset form
      setNewEvent({ type: 'accident', roadId: 'ROAD-001', severity: 'medium', description: '' });
      setShowAddEvent(false);
    }
  };

  // Add blockchain transaction
  const addTransaction = useCallback((type, details) => {
    const txHash = generateTxHash();
    const tx = {
      id: Date.now() + Math.random(),
      type,
      hash: txHash,
      blockNum: blockNumRef.current,
      timestamp: new Date().toLocaleTimeString(),
      details
    };
    
    setTransactions(prev => [tx, ...prev.slice(0, 49)]);
    
    // Increment transaction counter
    txCountRef.current += 1;
    
    // Log to terminal based on transaction type
    const typeLabels = {
      vehicle_move: '🚗 Vehicle Movement',
      sensor_reading: '📡 Sensor Reading',
      traffic_event: '⚠️ Traffic Event',
      signal_change: '🚦 Signal Change',
      road_update: '🛣️ Road Update',
      manual_event: '✋ Manual Event'
    };
    const label = typeLabels[type] || type;
    
    // Only log every 5th transaction to avoid spam, except for events
    if (type.includes('event') || txCountRef.current % 5 === 0) {
      addTerminalLog('success', `⛓️ TX #${txCountRef.current}: ${label}`, {
        hash: txHash.slice(0, 10) + '...',
        block: blockNumRef.current,
        ...details
      });
    }
    
    // Increment block every 3-5 transactions
    if (txCountRef.current % 3 === 0) {
      blockNumRef.current += 1;
      addTerminalLog('info', `📦 New Block #${blockNumRef.current} created`, { txCount: 3 });
    }
    
    // Update stats with refs to ensure latest values
    setStats(prev => ({
      ...prev,
      totalTransactions: txCountRef.current,
      blocksCreated: blockNumRef.current
    }));
  }, [addTerminalLog]);

  // Dynamic road generation based on config
  const generateRoads = useCallback((count) => {
    const baseRoads = [
      { id: 1, x1: 100, y1: 200, x2: 400, y2: 200, name: 'Avenue Mohammed V', status: 'open', lanes: 3 },
      { id: 2, x1: 400, y1: 200, x2: 700, y2: 200, name: 'Boulevard Hassan II', status: 'open', lanes: 2 },
      { id: 3, x1: 250, y1: 100, x2: 250, y2: 350, name: 'Rue de la Liberté', status: 'open', lanes: 2 },
      { id: 4, x1: 550, y1: 100, x2: 550, y2: 350, name: 'Avenue FAR', status: 'maintenance', lanes: 2 },
      { id: 5, x1: 100, y1: 300, x2: 400, y2: 300, name: 'Boulevard Zerktouni', status: 'congested', lanes: 2 },
      { id: 6, x1: 400, y1: 300, x2: 700, y2: 300, name: 'Rue Moulay Youssef', status: 'open', lanes: 2 },
      { id: 7, x1: 100, y1: 100, x2: 100, y2: 350, name: 'Avenue Anfa', status: 'open', lanes: 2 },
      { id: 8, x1: 700, y1: 100, x2: 700, y2: 350, name: 'Boulevard Massira', status: 'open', lanes: 2 },
      { id: 9, x1: 100, y1: 150, x2: 700, y2: 150, name: 'Rue des Arènes', status: 'open', lanes: 1 },
      { id: 10, x1: 100, y1: 350, x2: 700, y2: 350, name: 'Avenue Al Qods', status: 'open', lanes: 2 },
    ];
    return baseRoads.slice(0, Math.min(count, 10));
  }, []);

  // Dynamic intersection generation based on config
  const generateIntersections = useCallback((count) => {
    const baseIntersections = [
      { id: 1, x: 250, y: 200, name: 'Int-1' },
      { id: 2, x: 550, y: 200, name: 'Int-2' },
      { id: 3, x: 250, y: 300, name: 'Int-3' },
      { id: 4, x: 550, y: 300, name: 'Int-4' },
      { id: 5, x: 100, y: 200, name: 'Int-5' },
      { id: 6, x: 700, y: 200, name: 'Int-6' },
      { id: 7, x: 400, y: 150, name: 'Int-7' },
      { id: 8, x: 400, y: 350, name: 'Int-8' },
    ];
    return baseIntersections.slice(0, Math.min(count, 8));
  }, []);

  // Dynamic sensor generation based on config
  const generateSensors = useCallback((count) => {
    const baseSensors = [
      { id: 1, x: 175, y: 180, type: 'traffic', reading: '45 veh/h' },
      { id: 2, x: 475, y: 180, type: 'speed', reading: '52 km/h' },
      { id: 3, x: 175, y: 320, type: 'air_quality', reading: 'AQI: 75' },
      { id: 4, x: 475, y: 320, type: 'weather', reading: '22°C' },
      { id: 5, x: 625, y: 250, type: 'parking', reading: '12 spots' },
      { id: 6, x: 325, y: 150, type: 'traffic', reading: '38 veh/h' },
      { id: 7, x: 625, y: 150, type: 'speed', reading: '48 km/h' },
      { id: 8, x: 325, y: 350, type: 'air_quality', reading: 'AQI: 62' },
    ];
    return baseSensors.slice(0, Math.min(count, 8));
  }, []);

  const [roads, setRoads] = useState(() => generateRoads(6));
  const [intersections, setIntersections] = useState(() => generateIntersections(8));

  // Update roads and intersections when config changes
  useEffect(() => {
    setRoads(generateRoads(config.roadCount));
    setIntersections(generateIntersections(config.intersectionCount));
    setSensors(generateSensors(config.sensorCount));
  }, [config.roadCount, config.intersectionCount, config.sensorCount, generateRoads, generateIntersections, generateSensors]);

  // Initialiser les capteurs
  useEffect(() => {
    setSensors(generateSensors(config.sensorCount));
    addTerminalLog('info', '🚀 System initialized - Blockchain connection ready');
    addTerminalLog('info', '📡 Connected to Hyperledger Fabric network');
    addTerminalLog('info', '📦 Chaincode: sensor-data on traffic-channel');
  }, []);

  // Générer un nouveau véhicule
  const generateVehicle = useCallback(() => {
    const types = ['car', 'car', 'car', 'truck', 'bus', 'motorcycle'];
    const startPositions = [
      { x: 50, y: 200, dir: 'right' },
      { x: 750, y: 200, dir: 'left' },
      { x: 50, y: 300, dir: 'right' },
      { x: 750, y: 300, dir: 'left' },
      { x: 250, y: 50, dir: 'down' },
      { x: 550, y: 400, dir: 'up' },
    ];

    const start = startPositions[Math.floor(Math.random() * startPositions.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    
    let baseSpeed = scenario === 'rush' ? 25 : scenario === 'rain' ? 35 : 50;
    const speedVariation = Math.random() * 30 - 15;

    // Log vehicle creation as blockchain transaction
    addTransaction('vehicle_move', { type, speed: Math.round(baseSpeed + speedVariation) });

    return {
      id: Date.now() + Math.random(),
      x: start.x,
      y: start.y,
      type,
      speed: Math.max(10, Math.round(baseSpeed + speedVariation)),
      direction: start.dir,
      vx: start.dir === 'right' ? 2 : start.dir === 'left' ? -2 : 0,
      vy: start.dir === 'down' ? 2 : start.dir === 'up' ? -2 : 0,
    };
  }, [scenario, addTransaction]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      timeRef.current += 1;

      // Ajouter de nouveaux véhicules
      if (timeRef.current % (60 / speed) === 0) {
        const numToAdd = scenario === 'rush' ? 3 : 1;
        setVehicles(prev => {
          const newVehicles = [...prev];
          for (let i = 0; i < numToAdd; i++) {
            if (newVehicles.length < config.maxVehicles) {
              newVehicles.push(generateVehicle());
            }
          }
          return newVehicles;
        });
      }

      // Mettre à jour les positions des véhicules
      setVehicles(prev => prev
        .map(v => ({
          ...v,
          x: v.x + v.vx * speed,
          y: v.y + v.vy * speed,
        }))
        .filter(v => v.x > 0 && v.x < 800 && v.y > 0 && v.y < 450)
      );

      // Générer des événements aléatoires ET les envoyer à la blockchain
      if (timeRef.current % 300 === 0 && Math.random() < 0.3) {
        const eventTypes = ['accident', 'congestion', 'roadwork', 'weather', 'closure'];
        const severities = ['low', 'medium', 'high'];
        const roadIds = ['ROAD-001', 'ROAD-002', 'ROAD-003', 'ROAD-004', 'ROAD-005'];
        const positions = [
          { x: 175, y: 250 },
          { x: 475, y: 250 },
          { x: 325, y: 200 },
          { x: 625, y: 300 },
        ];
        const pos = positions[Math.floor(Math.random() * positions.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const severity = severities[Math.floor(Math.random() * severities.length)];
        const roadId = roadIds[Math.floor(Math.random() * roadIds.length)];
        
        // 🚀 SEND TO BLOCKCHAIN (real transaction)
        sendEventToBlockchain({
          type: eventType,
          roadId: roadId,
          severity: severity,
          description: `Auto-generated ${eventType} event on ${roadId}`,
          location: { lat: 33.5731 + Math.random() * 0.01, lng: -7.5898 + Math.random() * 0.01 }
        }).then(result => {
          if (result?.success) {
            console.log(`✅ Event ${eventType} sent to ${result.source}`);
          }
        });
        
        // Log traffic event as blockchain transaction (local display)
        addTransaction('traffic_event', { eventType, severity, roadId, source: 'blockchain' });
        
        setEvents(prev => [
          ...prev.slice(-4),
          {
            id: Date.now(),
            type: eventType,
            severity: severity,
            x: pos.x,
            y: pos.y,
            source: 'auto'
          }
        ]);
      }

      // Supprimer les événements après 10 secondes
      setEvents(prev => prev.filter(e => Date.now() - e.id < 10000));

      // Signal light changes (intersection updates)
      if (timeRef.current % 180 === 0) {
        const intIdx = Math.floor(Math.random() * intersections.length);
        if (intersections[intIdx]) {
          addTransaction('signal_change', { 
            intersection: intersections[intIdx].name, 
            state: Math.random() > 0.5 ? 'green' : 'red' 
          });
        }
      }

      // Road status updates
      if (timeRef.current % 500 === 0 && Math.random() < 0.2) {
        const roadIdx = Math.floor(Math.random() * roads.length);
        if (roads[roadIdx]) {
          addTransaction('road_update', { 
            road: roads[roadIdx].name, 
            status: ['open', 'congested', 'maintenance'][Math.floor(Math.random() * 3)]
          });
        }
      }

      // Mettre à jour les statistiques
      setVehicles(prev => {
        const avgSpd = prev.length > 0 
          ? Math.round(prev.reduce((sum, v) => sum + v.speed, 0) / prev.length)
          : 0;
        
        setStats(prevStats => ({
          ...prevStats,
          totalVehicles: prev.length,
          avgSpeed: avgSpd,
          incidents: events.length,
          airQuality: avgSpd > 40 ? 'Good' : avgSpd > 25 ? 'Moderate' : 'Poor',
          totalTransactions: txCountRef.current,
          blocksCreated: blockNumRef.current
        }));
        return prev;
      });

      // Mettre à jour les lectures des capteurs
      if (timeRef.current % 60 === 0) {
        // Log sensor reading as blockchain transaction
        addTransaction('sensor_reading', { count: sensors.length });
        
        setSensors(prev => prev.map(s => {
          switch (s.type) {
            case 'traffic':
              return { ...s, reading: `${Math.floor(Math.random() * 60 + 20)} veh/h` };
            case 'speed':
              return { ...s, reading: `${Math.floor(Math.random() * 40 + 30)} km/h` };
            case 'air_quality':
              return { ...s, reading: `AQI: ${Math.floor(Math.random() * 100 + 50)}` };
            case 'weather':
              return { ...s, reading: `${Math.floor(Math.random() * 15 + 15)}°C` };
            case 'parking':
              return { ...s, reading: `${Math.floor(Math.random() * 20 + 5)} spots` };
            default:
              return s;
          }
        }));
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, speed, scenario, config.maxVehicles, addTransaction, generateVehicle]);

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <span className="text-4xl">🚦</span>
              Real-Time Traffic Simulation
            </h1>
            <p className="text-gray-400 mt-1">Interactive urban traffic visualization</p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                showConfig
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ⚙️ Config
            </button>

            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">🌤️ Normal</option>
              <option value="rush">🚗 Rush Hour</option>
              <option value="rain">🌧️ Rainy</option>
            </select>

            <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg">
              <span className="text-gray-400 text-sm">Speed:</span>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.5"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-white text-sm">{speed}x</span>
            </div>

            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                isRunning
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isRunning ? '⏹️ Stop' : '▶️ Start'}
            </button>
          </div>
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-gray-800 rounded-xl p-4 border border-purple-700 mb-6">
            <h3 className="text-lg font-semibold text-purple-400 mb-4">⚙️ Simulation Configuration</h3>
            <div className="grid grid-cols-4 gap-4">
              <ConfigSlider
                label="Max Vehicles"
                value={config.maxVehicles}
                onChange={(v) => setConfig(prev => ({ ...prev, maxVehicles: v }))}
                min={5}
                max={50}
                icon="🚗"
              />
              <ConfigSlider
                label="Roads"
                value={config.roadCount}
                onChange={(v) => setConfig(prev => ({ ...prev, roadCount: v }))}
                min={2}
                max={10}
                icon="🛣️"
              />
              <ConfigSlider
                label="Intersections"
                value={config.intersectionCount}
                onChange={(v) => setConfig(prev => ({ ...prev, intersectionCount: v }))}
                min={2}
                max={8}
                icon="🚦"
              />
              <ConfigSlider
                label="Sensors"
                value={config.sensorCount}
                onChange={(v) => setConfig(prev => ({ ...prev, sensorCount: v }))}
                min={1}
                max={8}
                icon="📡"
              />
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">Active Vehicles</div>
            <div className="text-3xl font-bold text-blue-400">{stats.totalVehicles}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">Average Speed</div>
            <div className="text-3xl font-bold text-green-400">{stats.avgSpeed} km/h</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">Incidents</div>
            <div className="text-3xl font-bold text-red-400">{stats.incidents}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="text-gray-400 text-sm">Air Quality</div>
            <div className={`text-3xl font-bold ${
              stats.airQuality === 'Good' ? 'text-green-400' :
              stats.airQuality === 'Moderate' ? 'text-yellow-400' : 'text-red-400'
            }`}>{stats.airQuality}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-purple-700">
            <div className="text-purple-400 text-sm">⛓️ Transactions</div>
            <div className="text-3xl font-bold text-purple-400">{stats.totalTransactions}</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 border border-purple-700">
            <div className="text-purple-400 text-sm">📦 Blocks</div>
            <div className="text-3xl font-bold text-purple-400">{stats.blocksCreated}</div>
          </div>
        </div>

        {/* Main Simulation Canvas */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-2xl">
          <svg
            viewBox="0 0 800 450"
            className="w-full h-auto"
            style={{ minHeight: '500px' }}
          >
            {/* Background */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1F2937" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#111827" />
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Roads */}
            {roads.map(road => (
              <Road key={road.id} {...road} />
            ))}

            {/* Intersections */}
            {intersections.map(int => (
              <Intersection key={int.id} {...int} />
            ))}

            {/* Sensors */}
            {sensors.map(sensor => (
              <Sensor key={sensor.id} {...sensor} />
            ))}

            {/* Traffic Events */}
            {events.map(event => (
              <TrafficEvent key={event.id} {...event} />
            ))}

            {/* Vehicles */}
            {vehicles.map(vehicle => (
              <Vehicle key={vehicle.id} {...vehicle} />
            ))}

            {/* Legend */}
            <g transform="translate(650, 380)">
              <rect x={0} y={0} width={140} height={65} rx={8} fill="#1F2937" opacity={0.9} />
              <text x={10} y={18} fontSize="10" fill="#9CA3AF" fontWeight="bold">Legend:</text>
              <circle cx={20} cy={32} r={5} fill="#3B82F6" />
              <text x={30} y={35} fontSize="9" fill="#D1D5DB">Car</text>
              <circle cx={75} cy={32} r={5} fill="#EF4444" />
              <text x={85} y={35} fontSize="9" fill="#D1D5DB">Truck</text>
              <circle cx={20} cy={50} r={5} fill="#F59E0B" />
              <text x={30} y={53} fontSize="9" fill="#D1D5DB">Bus</text>
              <circle cx={75} cy={50} r={5} fill="#10B981" />
              <text x={85} y={53} fontSize="9" fill="#D1D5DB">Bike</text>
            </g>
          </svg>
        </div>

        {/* Info Panel */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">📍 Active Roads ({roads.length})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {roads.map(road => (
                <li key={road.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 truncate">{road.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    road.status === 'open' ? 'bg-green-900 text-green-300' :
                    road.status === 'closed' ? 'bg-red-900 text-red-300' :
                    road.status === 'maintenance' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-orange-900 text-orange-300'
                  }`}>
                    {road.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">📡 Sensors ({sensors.length})</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {sensors.map(sensor => (
                <li key={sensor.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 capitalize">{sensor.type.replace('_', ' ')}</span>
                  <span className="text-blue-400 font-mono">{sensor.reading}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">⚠️ Recent Events</h3>
              <button
                onClick={() => setShowAddEvent(!showAddEvent)}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition"
              >
                ➕ Add Manual
              </button>
            </div>
            
            {/* Manual Event Form */}
            {showAddEvent && (
              <div className="mb-3 p-3 bg-gray-700 rounded-lg space-y-2">
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="accident">🚗 Accident</option>
                  <option value="congestion">🚦 Congestion</option>
                  <option value="roadwork">🚧 Travaux</option>
                  <option value="weather">🌧️ Météo</option>
                  <option value="closure">🚫 Fermeture</option>
                </select>
                <select
                  value={newEvent.roadId}
                  onChange={(e) => setNewEvent({...newEvent, roadId: e.target.value})}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="ROAD-001">ROAD-001 - Avenue Mohammed V</option>
                  <option value="ROAD-002">ROAD-002 - Boulevard Hassan II</option>
                  <option value="ROAD-003">ROAD-003 - Rue Allal Ben Abdellah</option>
                  <option value="ROAD-004">ROAD-004 - Avenue des FAR</option>
                  <option value="ROAD-005">ROAD-005 - Boulevard Zerktouni</option>
                </select>
                <select
                  value={newEvent.severity}
                  onChange={(e) => setNewEvent({...newEvent, severity: e.target.value})}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                />
                <button
                  onClick={handleAddManualEvent}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-1 rounded text-sm font-medium transition"
                >
                  📦 Send to Blockchain
                </button>
              </div>
            )}
            
            {events.length === 0 ? (
              <p className="text-gray-500 text-sm">No active events</p>
            ) : (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {events.map(event => (
                  <li key={event.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      event.severity === 'high' ? 'bg-red-500' :
                      event.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-gray-300 capitalize">{event.type}</span>
                    <span className="text-gray-500">({event.severity})</span>
                    {event.source && (
                      <span className={`text-xs px-1 rounded ${
                        event.source === 'blockchain' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {event.source === 'blockchain' ? '⛓️' : '🔄'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Blockchain Transactions Panel */}
          <div className="bg-gray-800 rounded-xl p-4 border border-purple-700">
            <h3 className="text-lg font-semibold text-purple-400 mb-3">⛓️ Blockchain Transactions</h3>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-sm">Start simulation to see transactions</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {transactions.slice(0, 10).map(tx => (
                  <BlockchainTransaction key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Terminal Logs Panel */}
        <div className="bg-gray-900 rounded-xl border border-green-800 overflow-hidden">
          <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-green-800">
            <div className="flex items-center gap-2">
              <span className="text-green-400">💻</span>
              <h3 className="text-sm font-semibold text-green-400">Blockchain Transaction Logs</h3>
              <span className="text-xs text-gray-500">({terminalLogs.length} entries)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTerminalLogs([])}
                className="px-2 py-1 bg-red-800 hover:bg-red-700 text-red-200 text-xs rounded transition"
              >
                Clear
              </button>
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition"
              >
                {showTerminal ? '▼ Hide' : '▲ Show'}
              </button>
            </div>
          </div>
          
          {showTerminal && (
            <div 
              ref={terminalRef}
              className="bg-black p-3 font-mono text-xs h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-green-800"
            >
              {terminalLogs.length === 0 ? (
                <div className="text-gray-600">
                  <p>$ Blockchain transaction logs will appear here...</p>
                  <p className="text-green-600">$ System ready. Waiting for transactions...</p>
                </div>
              ) : (
                terminalLogs.map(log => (
                  <div key={log.id} className={`mb-1 ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-gray-400'
                  }`}>
                    <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                    <span>{log.message}</span>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <span className="text-gray-600 ml-2">
                        {Object.entries(log.details).map(([k, v]) => 
                          <span key={k} className="mr-2">{k}:<span className="text-cyan-400">{v}</span></span>
                        )}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SimulationPage;
