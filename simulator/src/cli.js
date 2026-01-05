#!/usr/bin/env node
import readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();
import { rushHourScenario, rainyScenario } from './scenario.js';
import { logToFile } from './logger.js';
import { sensors, vehicles, registerAll, simulateSensorReadings, simulateTrafficEvents } from './index.js';

let simIntervalId = null;
let currentScenario = 'normal';

const scenarios = {
  normal: {
    name: 'Normal',
    desc: 'Standard simulation',
  },
  rush: rushHourScenario,
  rain: rainyScenario,
};

function startSimulation(scenarioKey = 'normal') {
  currentScenario = scenarioKey;
  logToFile(`Simulation started with scenario: ${scenarios[scenarioKey].name}`);
  simIntervalId = setInterval(async () => {
    await simulateSensorReadings();
    if (Math.random() < 0.3) {
      await simulateTrafficEvents();
    }
  }, process.env.SIM_INTERVAL || 2000);
}

function stopSimulation() {
  if (simIntervalId) {
    clearInterval(simIntervalId);
    logToFile('Simulation stopped');
    simIntervalId = null;
  }
}

function printStatus() {
  console.log(`Simulation status:`);
  console.log(`  Scenario: ${scenarios[currentScenario].name}`);
  console.log(`  Sensors: ${sensors.length}`);
  console.log(`  Vehicles: ${vehicles.length}`);
  console.log(`  Interval: ${process.env.SIM_INTERVAL || 2000}ms`);
  console.log(simIntervalId ? '  Running...' : '  Stopped');
}

async function main() {
  console.log('Traffic Simulator CLI');
  console.log('Registering sensors and vehicles...');
  await registerAll();
  console.log('Starting simulation in normal mode...');
  startSimulation('normal');
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('Commands: start [normal|rush|rain], stop, status, exit');
  rl.on('line', async (line) => {
    const parts = line.trim().split(' ');
    const cmd = parts[0];
    let arg = parts[1];
    
    // Handle case where user types the literal "[normal|rush|rain]"
    if (arg && arg.startsWith('[')) {
      arg = 'normal';
    }
    
    switch (cmd) {
      case 'start':
        stopSimulation();
        startSimulation(arg || 'normal');
        break;
      case 'stop':
        stopSimulation();
        break;
      case 'status':
        printStatus();
        break;
      case 'exit':
        stopSimulation();
        rl.close();
        process.exit(0);
        break;
      default:
        console.log('Unknown command. Use: start, stop, status, exit');
    }
  });
}

main();
