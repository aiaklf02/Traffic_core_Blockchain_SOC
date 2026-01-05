/**
 * ============================================================================
 * Routes Road Manager - Smart City Traffic Management System
 * ============================================================================
 * Routes API pour la gestion des routes, intersections et événements
 * ============================================================================
 */

const express = require('express');
const { body, param } = require('express-validator');
const { roadController } = require('../controllers');
const { authenticate, authorize, UserRole } = require('../middleware');

const router = express.Router();

// ============================================================================
// Validateurs
// ============================================================================

const roadValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('name').notEmpty().withMessage('Nom requis'),
    body('startPoint').isObject().withMessage('Point de départ requis'),
    body('startPoint.latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('startPoint.longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    body('endPoint').isObject().withMessage('Point d\'arrivée requis'),
    body('endPoint.latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('endPoint.longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    body('length').isFloat({ min: 0 }).withMessage('Longueur invalide'),
    body('lanes').isInt({ min: 1 }).withMessage('Nombre de voies invalide'),
    body('speedLimit').isInt({ min: 5, max: 200 }).withMessage('Limite de vitesse invalide'),
    body('roadType').notEmpty().withMessage('Type de route requis'),
];

const intersectionValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('name').notEmpty().withMessage('Nom requis'),
    body('location').isObject().withMessage('Localisation requise'),
    body('location.latitude').isFloat({ min: -90, max: 90 }).withMessage('Latitude invalide'),
    body('location.longitude').isFloat({ min: -180, max: 180 }).withMessage('Longitude invalide'),
    body('type').isIn(['signalized', 'roundabout', 'stop_sign', 'yield', 'uncontrolled']).withMessage('Type invalide'),
    body('connectedRoads').isArray().withMessage('Routes connectées requises'),
];

const eventValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('type').notEmpty().withMessage('Type requis'),
    body('roadId').notEmpty().withMessage('ID de route requis'),
    body('location').isObject().withMessage('Localisation requise'),
    body('description').notEmpty().withMessage('Description requise'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Sévérité invalide'),
];

// ============================================================================
// Routes - Initialization
// ============================================================================

/**
 * @route POST /api/v1/roads/init
 * @desc Initialiser le ledger avec les données de test
 * @access Admin
 */
router.post(
    '/init',
    authenticate,
    authorize(UserRole.ADMIN),
    roadController.initLedger
);

// ============================================================================
// Routes - Roads
// ============================================================================

/**
 * @route GET /api/v1/roads
 * @desc Obtenir toutes les routes
 * @access Public (lecture seule)
 */
router.get(
    '/',
    roadController.getAllRoads
);

/**
 * @route POST /api/v1/roads
 * @desc Créer une nouvelle route
 * @access Operator, Admin
 */
router.post(
    '/',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    roadValidation,
    roadController.createRoad
);

/**
 * @route GET /api/v1/roads/status/:status
 * @desc Obtenir les routes par statut
 * @access Authenticated
 */
router.get(
    '/status/:status',
    authenticate,
    param('status').isIn(['active', 'under_construction', 'closed', 'maintenance']).withMessage('Statut invalide'),
    roadController.getRoadsByStatus
);

/**
 * @route GET /api/v1/roads/type/:type
 * @desc Obtenir les routes par type
 * @access Authenticated
 */
router.get(
    '/type/:type',
    authenticate,
    roadController.getRoadsByType
);

/**
 * @route GET /api/v1/roads/:id
 * @desc Obtenir une route par ID
 * @access Authenticated
 */
router.get(
    '/:id',
    authenticate,
    roadController.getRoad
);

/**
 * @route PATCH /api/v1/roads/:id/status
 * @desc Mettre à jour le statut d'une route
 * @access Operator, Admin
 */
router.patch(
    '/:id/status',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('status').isIn(['active', 'under_construction', 'closed', 'maintenance']).withMessage('Statut invalide'),
    roadController.updateRoadStatus
);

/**
 * @route PATCH /api/v1/roads/:id/speed-limit
 * @desc Mettre à jour la limite de vitesse
 * @access Operator, Admin
 */
router.patch(
    '/:id/speed-limit',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('speedLimit').isInt({ min: 5, max: 200 }).withMessage('Limite de vitesse invalide'),
    roadController.updateSpeedLimit
);

/**
 * @route GET /api/v1/roads/:id/history
 * @desc Obtenir l'historique d'une route
 * @access Analyst, Admin
 */
router.get(
    '/:id/history',
    authenticate,
    authorize(UserRole.ANALYST, UserRole.ADMIN),
    roadController.getRoadHistory
);

// ============================================================================
// Routes - Intersections
// ============================================================================

/**
 * @route GET /api/v1/roads/intersections/all
 * @desc Obtenir toutes les intersections
 * @access Public (for simulation display)
 */
router.get(
    '/intersections/all',
    roadController.getAllIntersections
);

/**
 * @route POST /api/v1/roads/intersections
 * @desc Créer une intersection
 * @access Operator, Admin
 */
router.post(
    '/intersections',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    intersectionValidation,
    roadController.createIntersection
);

/**
 * @route GET /api/v1/roads/intersections/type/:type
 * @desc Obtenir les intersections par type
 * @access Authenticated
 */
router.get(
    '/intersections/type/:type',
    authenticate,
    roadController.getIntersectionsByType
);

/**
 * @route GET /api/v1/roads/intersections/:id
 * @desc Obtenir une intersection par ID
 * @access Authenticated
 */
router.get(
    '/intersections/:id',
    authenticate,
    roadController.getIntersection
);

/**
 * @route PATCH /api/v1/roads/intersections/:id/traffic-light
 * @desc Mettre à jour la phase d'un feu de circulation
 * @access Operator, Admin
 */
router.patch(
    '/intersections/:id/traffic-light',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('lightId').notEmpty().withMessage('ID du feu requis'),
    body('phase').isIn(['red', 'yellow', 'green', 'flashing']).withMessage('Phase invalide'),
    body('duration').isInt({ min: 1 }).withMessage('Durée invalide'),
    roadController.updateTrafficLightPhase
);

// ============================================================================
// Routes - Events
// ============================================================================

/**
 * @route GET /api/v1/roads/events/active
 * @desc Obtenir les événements actifs
 * @access Public (lecture seule)
 */
router.get(
    '/events/active',
    roadController.getActiveEvents
);

/**
 * @route GET /api/v1/roads/events
 * @desc Obtenir tous les événements
 * @access Public (lecture seule)
 */
router.get(
    '/events',
    roadController.getActiveEvents
);

/**
 * @route POST /api/v1/roads/events
 * @desc Créer un événement de circulation - Enregistré sur BLOCKCHAIN
 * @access Public (for simulator)
 */
router.post(
    '/events',
    // Removed strict validation to allow simulator events
    roadController.createTrafficEvent
);

/**
 * @route GET /api/v1/roads/events/road/:roadId
 * @desc Obtenir les événements par route
 * @access Authenticated
 */
router.get(
    '/events/road/:roadId',
    authenticate,
    roadController.getEventsByRoad
);

/**
 * @route GET /api/v1/roads/events/:id
 * @desc Obtenir un événement par ID
 * @access Authenticated
 */
router.get(
    '/events/:id',
    authenticate,
    roadController.getTrafficEvent
);

/**
 * @route PATCH /api/v1/roads/events/:id/resolve
 * @desc Résoudre un événement
 * @access Operator, Admin
 */
router.patch(
    '/events/:id/resolve',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    roadController.resolveEvent
);

/**
 * @route PATCH /api/v1/roads/events/:id/severity
 * @desc Mettre à jour la sévérité d'un événement
 * @access Operator, Admin
 */
router.patch(
    '/events/:id/severity',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Sévérité invalide'),
    roadController.updateEventSeverity
);

module.exports = router;
