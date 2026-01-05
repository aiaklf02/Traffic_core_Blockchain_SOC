/**
 * ============================================================================
 * Routes Traffic Registry - Smart City Traffic Management System
 * ============================================================================
 * Routes API pour la gestion des véhicules, conducteurs, infractions
 * ============================================================================
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { registryController } = require('../controllers');
const { authenticate, authorize, UserRole } = require('../middleware');

const router = express.Router();

// ============================================================================
// Validateurs
// ============================================================================

const vehicleValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('licensePlate').notEmpty().withMessage('Plaque d\'immatriculation requise'),
    body('ownerId').notEmpty().withMessage('ID propriétaire requis'),
    body('make').notEmpty().withMessage('Marque requise'),
    body('model').notEmpty().withMessage('Modèle requis'),
    body('year').isInt({ min: 1900, max: 2030 }).withMessage('Année invalide'),
    body('type').isIn(['car', 'motorcycle', 'truck', 'bus', 'van', 'other']).withMessage('Type invalide'),
    body('fuelType').isIn(['gasoline', 'diesel', 'electric', 'hybrid', 'other']).withMessage('Type de carburant invalide'),
];

const driverValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('licenseNumber').notEmpty().withMessage('Numéro de permis requis'),
    body('firstName').notEmpty().withMessage('Prénom requis'),
    body('lastName').notEmpty().withMessage('Nom requis'),
    body('dateOfBirth').isISO8601().withMessage('Date de naissance invalide'),
    body('licenseClass').notEmpty().withMessage('Classe de permis requise'),
    body('licenseExpiry').isISO8601().withMessage('Date d\'expiration invalide'),
];

const violationValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('driverId').notEmpty().withMessage('ID conducteur requis'),
    body('type').isIn(['speeding', 'red_light', 'parking', 'no_insurance', 'no_license', 'dui', 'reckless_driving', 'other']).withMessage('Type invalide'),
    body('location').isObject().withMessage('Localisation requise'),
    body('fineAmount').isFloat({ min: 0 }).withMessage('Montant de l\'amende invalide'),
];

const transferValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('fromOwnerId').notEmpty().withMessage('ID propriétaire actuel requis'),
    body('toOwnerId').notEmpty().withMessage('ID nouveau propriétaire requis'),
    body('price').isFloat({ min: 0 }).withMessage('Prix invalide'),
];

const inspectionValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('inspectorId').notEmpty().withMessage('ID inspecteur requis'),
    body('result').isIn(['passed', 'failed', 'conditional']).withMessage('Résultat invalide'),
];

const insuranceValidation = [
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('providerId').notEmpty().withMessage('ID assureur requis'),
    body('policyNumber').notEmpty().withMessage('Numéro de police requis'),
    body('coverageType').isIn(['liability', 'comprehensive', 'collision', 'full']).withMessage('Type de couverture invalide'),
    body('startDate').isISO8601().withMessage('Date de début invalide'),
    body('endDate').isISO8601().withMessage('Date de fin invalide'),
];

// ============================================================================
// Routes - Initialization
// ============================================================================

/**
 * @route POST /api/v1/registry/init
 * @desc Initialiser le ledger avec les données de test
 * @access Admin
 */
router.post(
    '/init',
    authenticate,
    authorize(UserRole.ADMIN),
    registryController.initLedger
);

// ============================================================================
// Routes - Vehicles
// ============================================================================

/**
 * @route GET /api/v1/registry/vehicles
 * @desc Obtenir tous les véhicules
 * @access Public (lecture seule)
 */
router.get(
    '/vehicles',
    registryController.getAllVehicles
);

/**
 * @route POST /api/v1/registry/vehicles
 * @desc Enregistrer un nouveau véhicule
 * @access Operator, Admin
 */
router.post(
    '/vehicles',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    vehicleValidation,
    registryController.registerVehicle
);

/**
 * @route GET /api/v1/registry/vehicles/:id
 * @desc Obtenir un véhicule par ID
 * @access Authenticated
 */
router.get(
    '/vehicles/:id',
    authenticate,
    registryController.getVehicle
);

/**
 * @route GET /api/v1/registry/vehicles/plate/:licensePlate
 * @desc Obtenir un véhicule par plaque d'immatriculation
 * @access Authenticated
 */
router.get(
    '/vehicles/plate/:licensePlate',
    authenticate,
    registryController.getVehicleByPlate
);

/**
 * @route GET /api/v1/registry/vehicles/owner/:ownerId
 * @desc Obtenir les véhicules par propriétaire
 * @access Authenticated
 */
router.get(
    '/vehicles/owner/:ownerId',
    authenticate,
    registryController.getVehiclesByOwner
);

/**
 * @route PATCH /api/v1/registry/vehicles/:id/status
 * @desc Mettre à jour le statut d'un véhicule
 * @access Operator, Admin
 */
router.patch(
    '/vehicles/:id/status',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('status').isIn(['active', 'suspended', 'stolen', 'scrapped']).withMessage('Statut invalide'),
    registryController.updateVehicleStatus
);

/**
 * @route GET /api/v1/registry/vehicles/:id/history
 * @desc Obtenir l'historique d'un véhicule
 * @access Analyst, Admin
 */
router.get(
    '/vehicles/:id/history',
    authenticate,
    authorize(UserRole.ANALYST, UserRole.ADMIN),
    registryController.getVehicleHistory
);

// ============================================================================
// Routes - Drivers
// ============================================================================

/**
 * @route GET /api/v1/registry/drivers
 * @desc Obtenir tous les conducteurs
 * @access Public (lecture seule)
 */
router.get(
    '/drivers',
    registryController.getAllDrivers
);

/**
 * @route POST /api/v1/registry/drivers
 * @desc Enregistrer un nouveau conducteur
 * @access Operator, Admin
 */
router.post(
    '/drivers',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    driverValidation,
    registryController.registerDriver
);

/**
 * @route GET /api/v1/registry/drivers/:id
 * @desc Obtenir un conducteur par ID
 * @access Authenticated
 */
router.get(
    '/drivers/:id',
    authenticate,
    registryController.getDriver
);

/**
 * @route GET /api/v1/registry/drivers/license/:licenseNumber
 * @desc Obtenir un conducteur par numéro de permis
 * @access Authenticated
 */
router.get(
    '/drivers/license/:licenseNumber',
    authenticate,
    registryController.getDriverByLicense
);

/**
 * @route PATCH /api/v1/registry/drivers/:id/status
 * @desc Mettre à jour le statut d'un conducteur
 * @access Operator, Admin
 */
router.patch(
    '/drivers/:id/status',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('status').isIn(['active', 'suspended', 'revoked', 'expired']).withMessage('Statut invalide'),
    registryController.updateDriverStatus
);

/**
 * @route PATCH /api/v1/registry/drivers/:id/points
 * @desc Ajouter des points au permis d'un conducteur
 * @access Operator, Admin
 */
router.patch(
    '/drivers/:id/points',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('points').isInt({ min: 1 }).withMessage('Points invalides'),
    body('reason').notEmpty().withMessage('Raison requise'),
    registryController.addPoints
);

/**
 * @route PATCH /api/v1/registry/drivers/:id/renew
 * @desc Renouveler le permis d'un conducteur
 * @access Operator, Admin
 */
router.patch(
    '/drivers/:id/renew',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('newExpiryDate').isISO8601().withMessage('Nouvelle date d\'expiration invalide'),
    registryController.renewLicense
);

/**
 * @route GET /api/v1/registry/drivers/:id/history
 * @desc Obtenir l'historique d'un conducteur
 * @access Analyst, Admin
 */
router.get(
    '/drivers/:id/history',
    authenticate,
    authorize(UserRole.ANALYST, UserRole.ADMIN),
    registryController.getDriverHistory
);

// ============================================================================
// Routes - Violations
// ============================================================================

/**
 * @route GET /api/v1/registry/violations
 * @desc Obtenir toutes les infractions
 * @access Public (lecture seule)
 */
router.get(
    '/violations',
    registryController.getAllViolations
);

/**
 * @route POST /api/v1/registry/violations
 * @desc Enregistrer une infraction
 * @access Public (for simulator auto-detection)
 */
router.post(
    '/violations',
    violationValidation,
    registryController.recordViolation
);

/**
 * @route POST /api/v1/registry/violations/speeding
 * @desc Enregistrer une infraction de vitesse
 * @access Public (for simulator auto-detection)
 */
router.post(
    '/violations/speeding',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('driverId').notEmpty().withMessage('ID conducteur requis'),
    body('speedLimit').isInt({ min: 0 }).withMessage('Limite de vitesse invalide'),
    body('recordedSpeed').isInt({ min: 0 }).withMessage('Vitesse enregistrée invalide'),
    body('location').isObject().withMessage('Localisation requise'),
    registryController.recordSpeedingViolation
);

/**
 * @route POST /api/v1/registry/violations/red-light
 * @desc Enregistrer une infraction de feu rouge
 * @access Operator, Admin
 */
router.post(
    '/violations/red-light',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('id').notEmpty().withMessage('ID requis'),
    body('vehicleId').notEmpty().withMessage('ID véhicule requis'),
    body('driverId').notEmpty().withMessage('ID conducteur requis'),
    body('intersectionId').notEmpty().withMessage('ID intersection requis'),
    body('location').isObject().withMessage('Localisation requise'),
    registryController.recordRedLightViolation
);

/**
 * @route GET /api/v1/registry/violations/:id
 * @desc Obtenir une infraction par ID
 * @access Authenticated
 */
router.get(
    '/violations/:id',
    authenticate,
    registryController.getViolation
);

/**
 * @route GET /api/v1/registry/violations/vehicle/:vehicleId
 * @desc Obtenir les infractions par véhicule
 * @access Authenticated
 */
router.get(
    '/violations/vehicle/:vehicleId',
    authenticate,
    registryController.getViolationsByVehicle
);

/**
 * @route GET /api/v1/registry/violations/driver/:driverId
 * @desc Obtenir les infractions par conducteur
 * @access Authenticated
 */
router.get(
    '/violations/driver/:driverId',
    authenticate,
    registryController.getViolationsByDriver
);

/**
 * @route GET /api/v1/registry/violations/unpaid
 * @desc Obtenir les infractions non payées
 * @access Authenticated
 */
router.get(
    '/violations/unpaid',
    authenticate,
    registryController.getUnpaidViolations
);

/**
 * @route PATCH /api/v1/registry/violations/:id/pay
 * @desc Payer une infraction
 * @access Operator, Admin
 */
router.patch(
    '/violations/:id/pay',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('paymentMethod').isIn(['cash', 'card', 'bank_transfer', 'online']).withMessage('Méthode de paiement invalide'),
    body('paymentReference').notEmpty().withMessage('Référence de paiement requise'),
    registryController.payViolation
);

/**
 * @route PATCH /api/v1/registry/violations/:id/contest
 * @desc Contester une infraction
 * @access Authenticated
 */
router.patch(
    '/violations/:id/contest',
    authenticate,
    body('reason').notEmpty().withMessage('Raison requise'),
    registryController.contestViolation
);

// ============================================================================
// Routes - Transfers
// ============================================================================

/**
 * @route GET /api/v1/registry/transfers
 * @desc Obtenir tous les transferts
 * @access Authenticated
 */
router.get(
    '/transfers',
    authenticate,
    registryController.getAllTransfers
);

/**
 * @route POST /api/v1/registry/transfers
 * @desc Initier un transfert de propriété
 * @access Operator, Admin
 */
router.post(
    '/transfers',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    transferValidation,
    registryController.initiateTransfer
);

/**
 * @route GET /api/v1/registry/transfers/:id
 * @desc Obtenir un transfert par ID
 * @access Authenticated
 */
router.get(
    '/transfers/:id',
    authenticate,
    registryController.getTransfer
);

/**
 * @route PATCH /api/v1/registry/transfers/:id/complete
 * @desc Compléter un transfert
 * @access Operator, Admin
 */
router.patch(
    '/transfers/:id/complete',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    registryController.completeTransfer
);

/**
 * @route PATCH /api/v1/registry/transfers/:id/cancel
 * @desc Annuler un transfert
 * @access Operator, Admin
 */
router.patch(
    '/transfers/:id/cancel',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('reason').notEmpty().withMessage('Raison requise'),
    registryController.cancelTransfer
);

// ============================================================================
// Routes - Inspections
// ============================================================================

/**
 * @route GET /api/v1/registry/inspections
 * @desc Obtenir toutes les inspections
 * @access Authenticated
 */
router.get(
    '/inspections',
    authenticate,
    registryController.getAllInspections
);

/**
 * @route POST /api/v1/registry/inspections
 * @desc Enregistrer une inspection
 * @access Operator, Admin
 */
router.post(
    '/inspections',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    inspectionValidation,
    registryController.recordInspection
);

/**
 * @route GET /api/v1/registry/inspections/:id
 * @desc Obtenir une inspection par ID
 * @access Authenticated
 */
router.get(
    '/inspections/:id',
    authenticate,
    registryController.getInspection
);

/**
 * @route GET /api/v1/registry/inspections/vehicle/:vehicleId
 * @desc Obtenir les inspections par véhicule
 * @access Authenticated
 */
router.get(
    '/inspections/vehicle/:vehicleId',
    authenticate,
    registryController.getInspectionsByVehicle
);

// ============================================================================
// Routes - Insurance
// ============================================================================

/**
 * @route GET /api/v1/registry/insurance
 * @desc Obtenir toutes les assurances
 * @access Authenticated
 */
router.get(
    '/insurance',
    authenticate,
    registryController.getAllInsurance
);

/**
 * @route POST /api/v1/registry/insurance
 * @desc Créer une assurance
 * @access Operator, Admin
 */
router.post(
    '/insurance',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    insuranceValidation,
    registryController.createInsurance
);

/**
 * @route GET /api/v1/registry/insurance/:id
 * @desc Obtenir une assurance par ID
 * @access Authenticated
 */
router.get(
    '/insurance/:id',
    authenticate,
    registryController.getInsurance
);

/**
 * @route GET /api/v1/registry/insurance/vehicle/:vehicleId
 * @desc Obtenir l'assurance par véhicule
 * @access Authenticated
 */
router.get(
    '/insurance/vehicle/:vehicleId',
    authenticate,
    registryController.getInsuranceByVehicle
);

/**
 * @route GET /api/v1/registry/insurance/active
 * @desc Obtenir les assurances actives
 * @access Authenticated
 */
router.get(
    '/insurance/active',
    authenticate,
    registryController.getActiveInsurance
);

/**
 * @route PATCH /api/v1/registry/insurance/:id/cancel
 * @desc Annuler une assurance
 * @access Operator, Admin
 */
router.patch(
    '/insurance/:id/cancel',
    authenticate,
    authorize(UserRole.OPERATOR, UserRole.ADMIN),
    body('reason').notEmpty().withMessage('Raison requise'),
    registryController.cancelInsurance
);

module.exports = router;
