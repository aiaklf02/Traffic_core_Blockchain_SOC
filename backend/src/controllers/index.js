/**
 * ============================================================================
 * Controllers Index - Smart City Traffic Management System
 * ============================================================================
 * Export centralisé de tous les controllers
 * ============================================================================
 */

const roadController = require('./road.controller');
const sensorController = require('./sensor.controller');
const registryController = require('./registry.controller');
const authController = require('./auth.controller');

module.exports = {
    roadController,
    sensorController,
    registryController,
    authController,
};
