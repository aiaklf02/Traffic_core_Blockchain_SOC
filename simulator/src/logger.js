import fs from 'fs';

export function logToFile(message) {
  const logLine = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync('simulation.log', logLine);
}
