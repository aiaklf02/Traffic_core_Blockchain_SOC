import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { faker } from '@faker-js/faker';

import { rushHourScenario, rainyScenario } from './scenario.js';
import { logToFile } from './logger.js';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const SIM_INTERVAL = parseInt(process.env.SIM_INTERVAL, 10) || 2000;
const SENSOR_COUNT = parseInt(process.env.SENSOR_COUNT, 10) || 10;
const VEHICLE_COUNT = parseInt(process.env.VEHICLE_COUNT, 10) || 50;

// --- Authentication token ---
let authToken = null;

async function authenticate() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    authToken = response.data.data.tokens.accessToken;
    console.log('Authenticated successfully');
    return authToken;
  } catch (e) {
    console.error('Authentication failed:', e.message);
    return null;
  }
}

function getAuthHeaders() {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

// --- Generate mock sensors ---
function generateSensors(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sensor-${i + 1}`,
    name: `Sensor ${i + 1}`,
    type: faker.helpers.arrayElement(['traffic', 'speed', 'air_quality', 'weather']),
    location: {
      latitude: faker.location.latitude(48.8, 48.9),
      longitude: faker.location.longitude(2.3, 2.4),
    },
    manufacturer: faker.company.name(),
    model: faker.string.alphanumeric(6),
  }));
}

// --- Generate mock vehicles ---
function generateVehicles(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `vehicle-${i + 1}`,
    licensePlate: faker.string.alphanumeric(7).toUpperCase(),
    ownerId: faker.string.uuid(),
    make: faker.vehicle.manufacturer(),
    model: faker.vehicle.model(),
    year: faker.date.past({ years: 10 }).getFullYear(),
    type: faker.helpers.arrayElement(['car', 'motorcycle', 'truck', 'bus']),
    fuelType: faker.helpers.arrayElement(['gasoline', 'diesel', 'electric', 'hybrid']),
  }));
}

// --- Register sensors and vehicles ---
async function registerAll() {
  const headers = getAuthHeaders();
  for (const sensor of sensors) {
    try {
      await axios.post(`${API_BASE_URL}/sensors`, sensor, { headers });
      console.log(`Registered sensor: ${sensor.id}`);
    } catch (e) {
      // Ignore if already exists
    }
  }
  for (const vehicle of vehicles) {
    try {
      await axios.post(`${API_BASE_URL}/registry/vehicles`, vehicle, { headers });
      console.log(`Registered vehicle: ${vehicle.licensePlate}`);
    } catch (e) {
      // Ignore if already exists
    }
  }
}

// --- Simulate sensor readings ---
async function simulateSensorReadings() {
  const now = new Date();
  const headers = getAuthHeaders();
  for (const sensor of sensors) {
    try {
      let reading;
      switch (sensor.type) {
        case 'traffic': {
          const baseCount = faker.number.int({ min: 0, max: 100 });
          const vehicleCount = Math.round(baseCount * rushHourScenario.getTrafficMultiplier(now));
          const baseSpeed = faker.number.float({ min: 10, max: 120, precision: 0.1 });
          const averageSpeed = parseFloat((baseSpeed * rainyScenario.getSpeedMultiplier(now)).toFixed(1));
          reading = {
            id: faker.string.uuid(),
            sensorId: sensor.id,
            vehicleCount,
            averageSpeed,
          };
          await axios.post(`${API_BASE_URL}/sensors/readings/traffic`, reading, { headers });
          logToFile(`Traffic reading: ${JSON.stringify(reading)}`);
          break;
        }
        case 'speed': {
          const speedLimit = faker.helpers.arrayElement([30, 40, 50, 60, 80, 120]);
          const baseSpeed = faker.number.float({ min: 0, max: 150, precision: 0.1 });
          const currentSpeed = parseFloat((baseSpeed * rainyScenario.getSpeedMultiplier(now)).toFixed(1));
          reading = {
            id: faker.string.uuid(),
            sensorId: sensor.id,
            currentSpeed,
            speedLimit,
          };
          await axios.post(`${API_BASE_URL}/sensors/readings/speed`, reading, { headers });
          logToFile(`Speed reading: ${JSON.stringify(reading)}`);
          
          // 🚨 Automatic violation detection
          if (currentSpeed > speedLimit) {
            const excess = currentSpeed - speedLimit;
            await generateViolation({
              type: 'speeding',
              vehicleId: `VEH-SIM-${String(faker.number.int({ min: 1, max: 50 })).padStart(3, '0')}`,
              driverId: `DRV-SIM-${String(faker.number.int({ min: 1, max: 50 })).padStart(3, '0')}`,
              roadId: `ROAD-${String(faker.number.int({ min: 1, max: 10 })).padStart(3, '0')}`,
              speed: currentSpeed,
              speedLimit: speedLimit,
              excess: excess,
              sensorId: sensor.id,
            }, headers);
          }
          break;
        }
        case 'air_quality': {
          let aqi = faker.number.int({ min: 0, max: 500 });
          if (rainyScenario.isActive(now)) aqi += 20;
          reading = {
            id: faker.string.uuid(),
            sensorId: sensor.id,
            aqi,
          };
          await axios.post(`${API_BASE_URL}/sensors/readings/air-quality`, reading, { headers });
          logToFile(`Air quality reading: ${JSON.stringify(reading)}`);
          break;
        }
        case 'weather': {
          reading = {
            id: faker.string.uuid(),
            sensorId: sensor.id,
            temperature: faker.number.float({ min: -10, max: 40, precision: 0.1 }),
            humidity: faker.number.float({ min: 0, max: 100, precision: 0.1 }),
          };
          await axios.post(`${API_BASE_URL}/sensors/readings/weather`, reading, { headers });
          logToFile(`Weather reading: ${JSON.stringify(reading)}`);
          break;
        }
        default:
          break;
      }
    } catch (err) {
      const status = err.response?.status || 'unknown';
      if (status === 429) {
        console.log(`⏳ Rate limited for sensor ${sensor.id}, will retry later...`);
      } else {
        console.log(`⚠️ Error sending reading for ${sensor.id}: ${status}`);
      }
    }
  }
}

// --- Generate and record violation to blockchain ---
async function generateViolation(data, headers) {
  try {
    const excess = data.excess || (data.speed - data.speedLimit);
    
    // Calculate fine based on Moroccan traffic law
    let fine, points, severity;
    if (excess <= 20) {
      fine = 400; points = 2; severity = 'low';
    } else if (excess <= 30) {
      fine = 700; points = 4; severity = 'medium';
    } else if (excess <= 50) {
      fine = 1500; points = 4; severity = 'high';
    } else {
      fine = 3000; points = 6; severity = 'critical';
    }

    const violation = {
      id: `VIO-${Date.now()}-${faker.string.alphanumeric(6)}`,
      type: data.type || 'speeding',
      vehicleId: data.vehicleId,
      driverId: data.driverId,
      roadId: data.roadId,
      description: `Excès de vitesse: ${data.speed.toFixed(1)} km/h en zone ${data.speedLimit} km/h (+${excess.toFixed(1)} km/h)`,
      speed: data.speed,
      speedLimit: data.speedLimit,
      excess: excess,
      fine: fine,
      points: points,
      severity: severity,
      location: {
        lat: faker.location.latitude({ min: 33.5, max: 33.6 }),
        lng: faker.location.longitude({ min: -7.7, max: -7.5 })
      },
      evidence: {
        sensorId: data.sensorId,
        capturedAt: new Date().toISOString(),
        photoUrl: null
      },
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    // Send to blockchain via API
    await axios.post(`${API_BASE_URL}/registry/violations`, violation, { headers });
    console.log(`🚨 VIOLATION: ${violation.vehicleId} - ${data.speed.toFixed(1)}km/h in ${data.speedLimit}km/h zone (fine: ${fine} MAD)`);
    logToFile(`Violation recorded: ${JSON.stringify(violation)}`);
    
    return violation;
  } catch (err) {
    const status = err.response?.status || 'unknown';
    if (status !== 429) {
      console.log(`⚠️ Error recording violation: ${status}`);
    }
    return null;
  }
}

// --- Simulate random traffic events ---
async function simulateTrafficEvents() {
  try {
    const now = new Date();
    const headers = getAuthHeaders();
    const eventTypes = ['accident', 'congestion', 'roadwork', 'closure'];
    let type = faker.helpers.arrayElement(eventTypes);
    // Rush hour: more congestion events
    if (rushHourScenario.isActive(now) && Math.random() < 0.5) {
      type = 'congestion';
    }
    const event = {
      id: faker.string.uuid(),
      type,
      roadId: `road-${faker.number.int({ min: 1, max: 10 })}`,
      severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      description: faker.lorem.sentence(),
      timestamp: now.toISOString(),
    };
    await axios.post(`${API_BASE_URL}/roads/events`, event, { headers });
    logToFile(`Traffic event: ${JSON.stringify(event)}`);
  } catch (err) {
    const status = err.response?.status || 'unknown';
    if (status === 429) {
      console.log(`⏳ Rate limited for traffic event, will retry later...`);
    } else {
      console.log(`⚠️ Error sending traffic event: ${status}`);
    }
  }
}

// --- Main simulation loop ---
const sensors = generateSensors(SENSOR_COUNT);
const vehicles = generateVehicles(VEHICLE_COUNT);

// Export for CLI usage
export { sensors, vehicles, registerAll, simulateSensorReadings, simulateTrafficEvents };

// Only run main loop if this file is executed directly
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  (async () => {
    // Authenticate first
    await authenticate();
    // Skip registration - sensors/vehicles are auto-created or use simulation data
    // await registerAll();
    console.log('Starting simulation loop...');
    setInterval(async () => {
      await simulateSensorReadings();
      if (Math.random() < 0.3) {
        await simulateTrafficEvents();
      }
    }, SIM_INTERVAL);
  })();
}
