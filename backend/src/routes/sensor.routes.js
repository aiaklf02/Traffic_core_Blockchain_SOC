/**
 * ============================================================================
 * Routes Sensor Data - Smart City Traffic Management System
 * ============================================================================
 * Routes API pour la gestion des capteurs, lectures et alertes
 * ============================================================================
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { sensorController } = require('../controllers');
const { authenticate, authorize, UserRole } = require('../middleware');

const router = express.Router();

// ============================================================================
// Validateurs
// ============================================================================

const sensorValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('name').notEmpty().withMessage('Nom requis'),
    body('type').isIn(['traffic', 'speed', 'air_quality', 'weather', 'parking', 'noise']).withMessage('Type invalide'),
    body('location').isObject().withMessage('Localisation requise'),
    body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    body('manufacturer').notEmpty().withMessage('Fabricant requis'),
    body('model').notEmpty().withMessage('Modèle requis'),
];

const readingValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('data').isObject().withMessage('Données requises'),
];

const alertValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('type').notEmpty().withMessage('Type requis'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Sévérité invalide'),
    body('message').notEmpty().withMessage('Message requis'),
];

// ============================================================================
// Routes - Initialization
// ============================================================================

/**
 * @route POST /api/v1/sensors/init
 * @desc Initialiser le ledger avec les données de test
 * @access Admin
 */
router.post(
    '/init',
    authenticate,
    authorize(UserRole.ADMIN),
    sensorController.initLedger
);

// ============================================================================
// Routes - Sensors
// ============================================================================

/**
 * @route GET /api/v1/sensors
 * @desc Obtenir tous les capteurs
 * @access Public (lecture seule)
 */
router.get(
    '/',
    sensorController.getAllSensors
);

/**
 * @route POST /api/v1/sensors
 * @desc Enregistrer un nouveau capteur
 * @access Operator, Admin
 */
router.post(
    '/',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    sensorValidation,
    sensorController.registerSensor
);

/**
 * @route GET /api/v1/sensors/type/:type
 * @desc Obtenir les capteurs par type
 * @access Authenticated
 */
router.get(
    '/type/:type',
    authenticate,
    param('type').isIn(['traffic', 'speed', 'air_quality', 'weather', 'parking', 'noise']).withMessage('Type invalide'),
    sensorController.getSensorsByType
);

/**
 * @route GET /api/v1/sensors/status/:status
 * @desc Obtenir les capteurs par statut
 * @access Authenticated
 */
router.get(
    '/status/:status',
    authenticate,
    param('status').isIn(['active', 'inactive', 'maintenance', 'error']).withMessage('Statut invalide'),
    sensorController.getSensorsByStatus
);

/**
 * @route GET /api/v1/sensors/road/:roadId
 * @desc Obtenir les capteurs par route
 * @access Authenticated
 */
router.get(
    '/road/:roadId',
    authenticate,
    sensorController.getSensorsByRoad
);

/**
 * @route GET /api/v1/sensors/:id
 * @desc Obtenir un capteur par ID
 * @access Authenticated
 */
router.get(
    '/:id',
    authenticate,
    sensorController.getSensor
);

/**
 * @route PATCH /api/v1/sensors/:id/status
 * @desc Mettre à jour le statut d'un capteur
 * @access Operator, Admin
 */
router.patch(
    '/:id/status',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('status').isIn(['active', 'inactive', 'maintenance', 'error']).withMessage('Statut invalide'),
    sensorController.updateSensorStatus
);

/**
 * @route PATCH /api/v1/sensors/:id/health
 * @desc Mettre à jour la santé d'un capteur
 * @access Operator, Admin
 */
router.patch(
    '/:id/health',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('healthScore').isInt({ min: 0, max: 100 }).withMessage('Score de santé invalide'),
    body('batteryLevel').isInt({ min: 0, max: 100 }).withMessage('Niveau de batterie invalide'),
    sensorController.updateSensorHealth
);

/**
 * @route PATCH /api/v1/sensors/:id/firmware
 * @desc Mettre à jour le firmware d'un capteur
 * @access Admin
 */
router.patch(
    '/:id/firmware',
    authenticate,
    authorize(UserRole.ADMIN),
    body('firmwareVersion').notEmpty().withMessage('Version firmware requise'),
    sensorController.updateFirmware
);

/**
 * @route GET /api/v1/sensors/:id/history
 * @desc Obtenir l'historique d'un capteur
 * @access Analyst, Admin
 */
router.get(
    '/:id/history',
    authenticate,
    authorize(UserRole.ANALYST, UserRole.ADMIN),
    sensorController.getSensorHistory
);

/**
 * @route GET /api/v1/sensors/:sensorId/statistics
 * @desc Obtenir les statistiques d'un capteur
 * @access Analyst, Admin
 */
router.get(
    '/:sensorId/statistics',
    authenticate,
    authorize(UserRole.ANALYST, UserRole.ADMIN),
    sensorController.getSensorStatistics
);

// ============================================================================
// Routes - Readings
// ============================================================================

/**
 * @route POST /api/v1/sensors/readings
 * @desc Enregistrer une lecture générique
 * @access Operator, Admin
 */
router.post(
    '/readings',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    readingValidation,
    sensorController.recordReading
);

/**
 * @route POST /api/v1/sensors/readings/traffic
 * @desc Enregistrer une lecture de trafic
 * @access Public (for simulator)
 */
router.post(
    '/readings/traffic',
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('vehicleCount').isInt({ min: 0 }).withMessage('Nombre de véhicules invalide'),
    body('averageSpeed').isFloat({ min: 0 }).withMessage('Vitesse moyenne invalide'),
    sensorController.recordTrafficReading
);

/**
 * @route POST /api/v1/sensors/readings/speed
 * @desc Enregistrer une lecture de vitesse
 * @access Public (for simulator)
 */
router.post(
    '/readings/speed',
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('currentSpeed').isFloat({ min: 0 }).withMessage('Vitesse actuelle invalide'),
    sensorController.recordSpeedReading
);

/**
 * @route POST /api/v1/sensors/readings/air-quality
 * @desc Enregistrer une lecture de qualité de l'air
 * @access Public (for simulator)
 */
router.post(
    '/readings/air-quality',
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('aqi').isInt({ min: 0, max: 500 }).withMessage('AQI invalide'),
    sensorController.recordAirQualityReading
);

/**
 * @route POST /api/v1/sensors/readings/weather
 * @desc Enregistrer une lecture météo
 * @access Public (for simulator)
 */
router.post(
    '/readings/weather',
    body('id').notEmpty().withMessage('ID requis'),
    body('sensorId').notEmpty().withMessage('ID capteur requis'),
    body('temperature').isFloat().withMessage('Température invalide'),
    body('humidity').isFloat({ min: 0, max: 100 }).withMessage('Humidité invalide'),
    sensorController.recordWeatherReading
);

/**
 * @route POST /api/v1/sensors/readings/batch
 * @desc Enregistrer un lot de lectures
 * @access Operator, Admin
 */
router.post(
    '/readings/batch',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('readings').isArray({ min: 1 }).withMessage('Lectures requises'),
    sensorController.batchRecordReadings
);

/**
 * @route GET /api/v1/sensors/readings/:id
 * @desc Obtenir une lecture par ID
 * @access Authenticated
 */
router.get(
    '/readings/:id',
    authenticate,
    sensorController.getReading
);

/**
 * @route GET /api/v1/sensors/:sensorId/readings
 * @desc Obtenir les lectures par capteur
 * @access Authenticated
 */
router.get(
    '/:sensorId/readings',
    authenticate,
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limite invalide'),
    sensorController.getReadingsBySensor
);

// ============================================================================
// Routes - Alerts
// ============================================================================

/**
 * @route GET /api/v1/sensors/alerts/active
 * @desc Obtenir les alertes actives
 * @access Authenticated
 */
router.get(
    '/alerts/active',
    authenticate,
    sensorController.getActiveAlerts
);

/**
 * @route POST /api/v1/sensors/alerts
 * @desc Créer une alerte
 * @access Operator, Admin
 */
router.post(
    '/alerts',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    alertValidation,
    sensorController.createAlert
);

/**
 * @route GET /api/v1/sensors/:sensorId/alerts
 * @desc Obtenir les alertes par capteur
 * @access Authenticated
 */
router.get(
    '/:sensorId/alerts',
    authenticate,
    sensorController.getAlertsBySensor
);

/**
 * @route PATCH /api/v1/sensors/alerts/:id/resolve
 * @desc Résoudre une alerte
 * @access Operator, Admin
 */
router.patch(
    '/alerts/:id/resolve',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    sensorController.resolveAlert
);

/**
 * @route PATCH /api/v1/sensors/alerts/:id/escalate
 * @desc Escalader une alerte
 * @access Operator, Admin
 */
router.patch(
    '/alerts/:id/escalate',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    sensorController.escalateAlert
);

module.exports = router;
