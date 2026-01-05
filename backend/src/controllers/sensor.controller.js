/**
 * ============================================================================
 * Controller Sensor Data - Smart City Traffic Management System
 * ============================================================================
 * Gestion des capteurs, lectures et alertes
 * ============================================================================
 */

const { fabricService } = require('../services/fabric.service');
const { fabricConfig } = require('../config');
const { ApiError, asyncHandler } = require('../middleware');
const { apiLogger: logger } = require('../utils/logger');

const CHAINCODE = fabricConfig.chaincodes.sensorData;

/**
 * Initialiser le ledger avec les données de test
 */
const initLedger = asyncHandler(async (req, res) => {
    logger.info('Initialisation du ledger Sensor Data');
    
    await fabricService.submitTransaction(CHAINCODE, 'InitLedger');
    
    res.status(200).json({
        success: true,
        message: 'Ledger initialisé avec succès',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Capteurs (Sensors)
// ============================================================================

/**
 * Enregistrer un nouveau capteur
 */
const registerSensor = asyncHandler(async (req, res) => {
    const { 
        id, name, type, location, roadId, intersectionId, 
        manufacturer, model, firmwareVersion 
    } = req.body;
    
    logger.info('Enregistrement d\'un capteur', { id, name, type });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RegisterSensor',
        id,
        name,
        type,
        JSON.stringify(location),
        roadId || '',
        intersectionId || '',
        manufacturer,
        model,
        firmwareVersion || '1.0.0'
    );
    
    const sensor = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: sensor,
        message: 'Capteur enregistré avec succès',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un capteur par ID
 */
const getSensor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetSensor', id);
    
    if (!result) {
        throw ApiError.notFound(`Capteur ${id} non trouvé`);
    }
    
    const sensor = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: sensor,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir tous les capteurs
 */
const getAllSensors = asyncHandler(async (req, res) => {
    let sensors;
    try {
        const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetAllSensors');
        sensors = JSON.parse(result || '[]');
    } catch (fabricError) {
        // Mock data when Fabric is not connected - Casablanca coordinates
        sensors = [
            { id: 'SENS001', name: 'Traffic Sensor - Mohammed V', type: 'traffic', status: 'active', location: { latitude: 33.5731, longitude: -7.5898 }, manufacturer: 'Siemens', model: 'TC-200' },
            { id: 'SENS002', name: 'Speed Radar - Hassan II', type: 'speed', status: 'active', location: { latitude: 33.5650, longitude: -7.6100 }, manufacturer: 'Kapsch', model: 'SR-150' },
            { id: 'SENS003', name: 'Air Quality - Maarif', type: 'air_quality', status: 'active', location: { latitude: 33.5800, longitude: -7.6300 }, manufacturer: 'Enviro', model: 'AQ-500' },
            { id: 'SENS004', name: 'Weather Station - Anfa', type: 'weather', status: 'active', location: { latitude: 33.5950, longitude: -7.6700 }, manufacturer: 'Davis', model: 'WS-Pro' },
            { id: 'SENS005', name: 'Parking Sensor - Twin Center', type: 'parking', status: 'active', location: { latitude: 33.5850, longitude: -7.6200 }, manufacturer: 'ParkTech', model: 'PS-100' },
            { id: 'SENS006', name: 'Traffic Sensor - Zerktouni', type: 'traffic', status: 'maintenance', location: { latitude: 33.5780, longitude: -7.6400 }, manufacturer: 'Siemens', model: 'TC-200' },
            { id: 'SENS007', name: 'Speed Radar - Corniche', type: 'speed', status: 'active', location: { latitude: 33.6000, longitude: -7.6600 }, manufacturer: 'Kapsch', model: 'SR-150' },
            { id: 'SENS008', name: 'Noise Sensor - Habous', type: 'noise', status: 'active', location: { latitude: 33.5700, longitude: -7.6000 }, manufacturer: 'SoundTech', model: 'NS-300' },
        ];
        logger.debug('Mode mock: données capteurs simulées');
    }
    
    res.status(200).json({
        success: true,
        data: sensors,
        count: sensors.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut d'un capteur
 */
const updateSensorStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Mise à jour du statut du capteur', { id, status });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateSensorStatus',
        id,
        status
    );
    
    const sensor = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: sensor,
        message: 'Statut du capteur mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour la santé d'un capteur
 */
const updateSensorHealth = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { healthScore, batteryLevel } = req.body;
    
    logger.info('Mise à jour de la santé du capteur', { id, healthScore, batteryLevel });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateSensorHealth',
        id,
        healthScore.toString(),
        batteryLevel.toString()
    );
    
    const sensor = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: sensor,
        message: 'Santé du capteur mise à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le firmware d'un capteur
 */
const updateFirmware = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firmwareVersion } = req.body;
    
    logger.info('Mise à jour du firmware', { id, firmwareVersion });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateFirmware',
        id,
        firmwareVersion
    );
    
    const sensor = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: sensor,
        message: 'Firmware mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les capteurs par type
 */
const getSensorsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QuerySensorsByType',
        type
    );
    
    const sensors = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: sensors,
        count: sensors.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les capteurs par statut
 */
const getSensorsByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QuerySensorsByStatus',
        status
    );
    
    const sensors = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: sensors,
        count: sensors.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les capteurs par route
 */
const getSensorsByRoad = asyncHandler(async (req, res) => {
    const { roadId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QuerySensorsByRoad',
        roadId
    );
    
    const sensors = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: sensors,
        count: sensors.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir l'historique d'un capteur
 */
const getSensorHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetSensorHistory',
        id
    );
    
    const history = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: history,
        count: history.length,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Lectures (Readings)
// ============================================================================

/**
 * Enregistrer une lecture de capteur
 */
const recordReading = asyncHandler(async (req, res) => {
    const { id, sensorId, data, quality } = req.body;
    
    logger.info('Enregistrement d\'une lecture', { id, sensorId });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RecordReading',
        id,
        sensorId,
        JSON.stringify(data),
        (quality || 100).toString()
    );
    
    const reading = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: reading,
        message: 'Lecture enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer une lecture de trafic
 */
const recordTrafficReading = asyncHandler(async (req, res) => {
    const { id, sensorId, vehicleCount, averageSpeed, occupancy, flowRate, flow, laneNumber, density, vehicleTypes } = req.body;
    
    logger.info('Enregistrement d\'une lecture de trafic', { id, sensorId, vehicleCount });
    
    let reading;
    try {
        // Chaincode expects: readingID, sensorID, vehicleCount, averageSpeed, occupancy, flow, laneNumber
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RecordTrafficReading',
            id,
            sensorId,
            (vehicleCount || 0).toString(),
            (averageSpeed || 0).toString(),
            (occupancy || 0).toString(),
            (flowRate || flow || 0).toString(),
            (laneNumber || 1).toString()
        );
        reading = JSON.parse(result);
    } catch (fabricError) {
        // Mock mode when Fabric is not connected
        reading = {
            id,
            sensorId,
            vehicleCount,
            averageSpeed: averageSpeed || 0,
            timestamp: new Date().toISOString(),
            type: 'traffic'
        };
        logger.debug('Mode mock: lecture de trafic simulée');
    }
    
    res.status(201).json({
        success: true,
        data: reading,
        message: 'Lecture de trafic enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer une lecture de vitesse
 */
const recordSpeedReading = asyncHandler(async (req, res) => {
    const { id, sensorId, currentSpeed, averageSpeed, maxSpeed, minSpeed, speedLimit, violationCount, speedViolations } = req.body;
    
    logger.info('Enregistrement d\'une lecture de vitesse', { id, sensorId, currentSpeed });
    
    let reading;
    try {
        // Chaincode expects: readingID, sensorID, currentSpeed, maxSpeed, minSpeed, averageSpeed, speedLimit, violationCount
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RecordSpeedReading',
            id,
            sensorId,
            (currentSpeed || 0).toString(),
            (maxSpeed || currentSpeed || 0).toString(),
            (minSpeed || currentSpeed || 0).toString(),
            (averageSpeed || currentSpeed || 0).toString(),
            (speedLimit || 50).toString(),
            (violationCount || speedViolations || 0).toString()
        );
        reading = JSON.parse(result);
    } catch (fabricError) {
        // Mock mode when Fabric is not connected
        reading = {
            id,
            sensorId,
            currentSpeed,
            timestamp: new Date().toISOString(),
            type: 'speed'
        };
        logger.debug('Mode mock: lecture de vitesse simulée');
    }
    
    res.status(201).json({
        success: true,
        data: reading,
        message: 'Lecture de vitesse enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer une lecture de qualité de l'air
 */
const recordAirQualityReading = asyncHandler(async (req, res) => {
    const { id, sensorId, pm25, pm10, co2, co, no2, o3, aqi, temperature, humidity } = req.body;
    
    logger.info('Enregistrement d\'une lecture de qualité de l\'air', { id, sensorId, aqi });
    
    let reading;
    try {
        // Chaincode expects: readingID, sensorID, pm25, pm10, no2, co, o3, aqi, temperature, humidity
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RecordAirQualityReading',
            id,
            sensorId,
            (pm25 || 0).toString(),
            (pm10 || 0).toString(),
            (no2 || 0).toString(),
            (co || co2 || 0).toString(),
            (o3 || 0).toString(),
            (aqi || 0).toString(),
            (temperature || 20).toString(),
            (humidity || 50).toString()
        );
        reading = JSON.parse(result);
    } catch (fabricError) {
        // Mock mode when Fabric is not connected
        reading = {
            id,
            sensorId,
            aqi: aqi || 0,
            timestamp: new Date().toISOString(),
            type: 'air_quality'
        };
        logger.debug('Mode mock: lecture de qualité de l\'air simulée');
    }
    
    res.status(201).json({
        success: true,
        data: reading,
        message: 'Lecture de qualité de l\'air enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer une lecture météo
 */
const recordWeatherReading = asyncHandler(async (req, res) => {
    const { id, sensorId, temperature, humidity, pressure, windSpeed, windDirection, precipitation, visibility, roadCondition } = req.body;
    
    logger.info('Enregistrement d\'une lecture météo', { id, sensorId, temperature });
    
    let reading;
    try {
        // Chaincode expects: readingID, sensorID, temperature, humidity, pressure, windSpeed, windDirection, precipitation, visibility, roadCondition
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RecordWeatherReading',
            id,
            sensorId,
            (temperature || 20).toString(),
            (humidity || 50).toString(),
            (pressure || 1013).toString(),
            (windSpeed || 0).toString(),
            windDirection || 'N',
            (precipitation || 0).toString(),
            (visibility || 10).toString(),
            roadCondition || 'dry'
        );
        reading = JSON.parse(result);
    } catch (fabricError) {
        // Mock mode when Fabric is not connected
        reading = {
            id,
            sensorId,
            temperature,
            humidity,
            timestamp: new Date().toISOString(),
            type: 'weather'
        };
        logger.debug('Mode mock: lecture météo simulée');
    }
    
    res.status(201).json({
        success: true,
        data: reading,
        message: 'Lecture météo enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir une lecture par ID
 */
const getReading = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetReading', id);
    
    if (!result) {
        throw ApiError.notFound(`Lecture ${id} non trouvée`);
    }
    
    const reading = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: reading,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les lectures par capteur
 */
const getReadingsBySensor = asyncHandler(async (req, res) => {
    const { sensorId } = req.params;
    const { limit } = req.query;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetReadingsBySensor',
        sensorId,
        (limit || 100).toString()
    );
    
    const readings = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: readings,
        count: readings.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer un lot de lectures
 */
const batchRecordReadings = asyncHandler(async (req, res) => {
    const { readings } = req.body;
    
    logger.info('Enregistrement d\'un lot de lectures', { count: readings.length });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'BatchRecordReadings',
        JSON.stringify(readings)
    );
    
    const recorded = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: recorded,
        message: `${recorded.length} lectures enregistrées`,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Alertes
// ============================================================================

/**
 * Créer une alerte
 */
const createAlert = asyncHandler(async (req, res) => {
    const { id, sensorId, type, severity, message } = req.body;
    
    logger.info('Création d\'une alerte', { id, sensorId, type, severity });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CreateAlert',
        id,
        sensorId,
        type,
        severity,
        message
    );
    
    const alert = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: alert,
        message: 'Alerte créée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Résoudre une alerte
 */
const resolveAlert = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Résolution d\'une alerte', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'ResolveAlert',
        id
    );
    
    const alert = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: alert,
        message: 'Alerte résolue',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Escalader une alerte
 */
const escalateAlert = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Escalade d\'une alerte', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'EscalateAlert',
        id
    );
    
    const alert = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: alert,
        message: 'Alerte escaladée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les alertes par capteur
 */
const getAlertsBySensor = asyncHandler(async (req, res) => {
    const { sensorId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetAlertsBySensor',
        sensorId
    );
    
    const alerts = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les alertes actives
 */
const getActiveAlerts = asyncHandler(async (req, res) => {
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetActiveAlerts');
    
    const alerts = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: alerts,
        count: alerts.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les statistiques d'un capteur
 */
const getSensorStatistics = asyncHandler(async (req, res) => {
    const { sensorId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetSensorStatistics',
        sensorId
    );
    
    const statistics = JSON.parse(result || '{}');
    
    res.status(200).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
    });
});

module.exports = {
    // Initialization
    initLedger,
    
    // Sensors
    registerSensor,
    getSensor,
    getAllSensors,
    updateSensorStatus,
    updateSensorHealth,
    updateFirmware,
    getSensorsByType,
    getSensorsByStatus,
    getSensorsByRoad,
    getSensorHistory,
    
    // Readings
    recordReading,
    recordTrafficReading,
    recordSpeedReading,
    recordAirQualityReading,
    recordWeatherReading,
    getReading,
    getReadingsBySensor,
    batchRecordReadings,
    
    // Alerts
    createAlert,
    resolveAlert,
    escalateAlert,
    getAlertsBySensor,
    getActiveAlerts,
    getSensorStatistics,
};
