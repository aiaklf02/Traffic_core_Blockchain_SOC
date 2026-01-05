/**
 * ============================================================================
 * Controller Traffic Registry - Smart City Traffic Management System
 * ============================================================================
 * Gestion des véhicules, conducteurs, infractions et transferts
 * ============================================================================
 */

const { fabricService } = require('../services/fabric.service');
const { fabricConfig } = require('../config');
const { ApiError, asyncHandler } = require('../middleware');
const { apiLogger: logger } = require('../utils/logger');

const CHAINCODE = fabricConfig.chaincodes.trafficRegistry;

// Référence au SOC pour les logs (lazy loading)
let socManager = null;
function getSOC() {
    if (!socManager) {
        try {
            const { getSOCManager } = require('../security/SOCManager');
            socManager = getSOCManager();
        } catch (e) {
            // SOC not available
        }
    }
    return socManager;
}

/**
 * Log an operation to SOC
 */
function logToSOC(level, message, data = {}) {
    const soc = getSOC();
    if (soc) {
        soc.globalLogs.push({
            timestamp: new Date().toISOString(),
            agent: 'Registry',
            level,
            message,
            data,
            source: 'blockchain'
        });
    }
}

/**
 * Initialiser le ledger avec les données de test
 */
const initLedger = asyncHandler(async (req, res) => {
    logger.info('Initialisation du ledger Traffic Registry');
    
    await fabricService.submitTransaction(CHAINCODE, 'InitLedger');
    
    res.status(200).json({
        success: true,
        message: 'Ledger initialisé avec succès',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Véhicules
// ============================================================================

/**
 * Enregistrer un nouveau véhicule
 */
const registerVehicle = asyncHandler(async (req, res) => {
    const { 
        id, vin, licensePlate, brand, model, year, color, 
        vehicleType, fuelType, engineCapacity, horsePower, weight, ownerId 
    } = req.body;
    
    logger.info('Enregistrement d\'un véhicule', { id, licensePlate, vin });
    logToSOC('info', `🚗 VEHICLE REGISTRATION: Attempting to register ${id} (${licensePlate})`, { id, licensePlate, vin });
    
    try {
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RegisterVehicle',
            id,
            vin,
            licensePlate,
            brand,
            model,
            year.toString(),
            color,
            vehicleType,
            fuelType,
            (engineCapacity || 0).toString(),
            (horsePower || 0).toString(),
            (weight || 0).toString(),
            ownerId
        );
        
        const vehicle = JSON.parse(result);
        logToSOC('info', `✅ VEHICLE REGISTERED: ${id} (${licensePlate}) - ${brand} ${model}`, { id, licensePlate, brand, model, ownerId });
        
        res.status(201).json({
            success: true,
            data: vehicle,
            message: 'Véhicule enregistré avec succès',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logToSOC('error', `❌ VEHICLE REGISTRATION FAILED: ${id} (${licensePlate}) - ${error.message}`, { id, licensePlate, error: error.message });
        throw error;
    }
});

/**
 * Obtenir un véhicule par ID
 */
const getVehicle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetVehicle', id);
    
    if (!result) {
        throw ApiError.notFound(`Véhicule ${id} non trouvé`);
    }
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir tous les véhicules
 */
const getAllVehicles = asyncHandler(async (req, res) => {
    logger.info('Récupération de tous les véhicules');
    
    let vehicles = [];
    let source = 'simulation';
    
    try {
        // First try GetAllVehicles (requires CouchDB)
        const result = await fabricService.evaluateTransaction(
            CHAINCODE, 
            'GetAllVehicles'
        );
        vehicles = result ? JSON.parse(result) : [];
        if (vehicles.length > 0) {
            source = 'blockchain';
            logger.info(`${vehicles.length} véhicules récupérés de la blockchain (CouchDB query)`);
        }
    } catch (fabricError) {
        logger.warn('Erreur Fabric, utilisation des données de simulation', { error: fabricError.message });
    }
    
    // Use simulation data if no blockchain data was retrieved
    if (vehicles.length === 0) {
        const { SIMULATION_VEHICLES } = require('../services/dataInitializer');
        vehicles = SIMULATION_VEHICLES.map(v => ({
            ...v,
            make: v.brand,
            type: v.vehicleType,
            status: 'active',
        }));
        source = 'simulation';
    }
    
    res.status(200).json({
        success: true,
        data: vehicles,
        count: vehicles.length,
        source: source,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un véhicule par plaque d'immatriculation
 */
const getVehicleByPlate = asyncHandler(async (req, res) => {
    const { plate } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetVehicleByPlate', 
        plate
    );
    
    if (!result) {
        throw ApiError.notFound(`Véhicule avec plaque ${plate} non trouvé`);
    }
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un véhicule par VIN
 */
const getVehicleByVIN = asyncHandler(async (req, res) => {
    const { vin } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetVehicleByVIN', 
        vin
    );
    
    if (!result) {
        throw ApiError.notFound(`Véhicule avec VIN ${vin} non trouvé`);
    }
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut d'un véhicule
 */
const updateVehicleStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Mise à jour du statut du véhicule', { id, status });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateVehicleStatus',
        id,
        status
    );
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Statut du véhicule mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le kilométrage d'un véhicule
 */
const updateVehicleMileage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mileage } = req.body;
    
    logger.info('Mise à jour du kilométrage', { id, mileage });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateVehicleMileage',
        id,
        mileage.toString()
    );
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Kilométrage mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour la localisation d'un véhicule
 */
const updateVehicleLocation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { location } = req.body;
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateVehicleLocation',
        id,
        JSON.stringify(location)
    );
    
    const vehicle = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Localisation mise à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les véhicules par propriétaire
 */
const getVehiclesByOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryVehiclesByOwner',
        ownerId
    );
    
    const vehicles = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: vehicles,
        count: vehicles.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les véhicules par statut
 */
const getVehiclesByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryVehiclesByStatus',
        status
    );
    
    const vehicles = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: vehicles,
        count: vehicles.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir l'historique d'un véhicule
 */
const getVehicleHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetVehicleHistory',
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
// Conducteurs
// ============================================================================

/**
 * Enregistrer un conducteur
 */
const registerDriver = asyncHandler(async (req, res) => {
    const { 
        id, nationalId, firstName, lastName, dateOfBirth, 
        address, phone, email, licenseNumber, licenseCategories, licenseExpiryDate 
    } = req.body;
    
    logger.info('Enregistrement d\'un conducteur', { id, nationalId, firstName, lastName });
    logToSOC('info', `👤 DRIVER REGISTRATION: Attempting to register ${id} (${firstName} ${lastName})`, { id, nationalId, firstName, lastName });
    
    try {
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RegisterDriver',
            id,
            nationalId,
            firstName,
            lastName,
            dateOfBirth,
            address,
            phone,
            email,
            licenseNumber,
            JSON.stringify(licenseCategories),
            licenseExpiryDate
        );
        
        const driver = JSON.parse(result);
        logToSOC('info', `✅ DRIVER REGISTERED: ${id} (${firstName} ${lastName}) - License: ${licenseNumber}`, { id, firstName, lastName, licenseNumber });
        
        res.status(201).json({
            success: true,
            data: driver,
            message: 'Conducteur enregistré avec succès',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logToSOC('error', `❌ DRIVER REGISTRATION FAILED: ${id} (${firstName} ${lastName}) - ${error.message}`, { id, firstName, lastName, error: error.message });
        throw error;
    }
});

/**
 * Obtenir un conducteur par ID
 */
const getDriver = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetDriver', id);
    
    if (!result) {
        throw ApiError.notFound(`Conducteur ${id} non trouvé`);
    }
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut du permis
 */
const updateLicenseStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Mise à jour du statut du permis', { id, status });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateLicenseStatus',
        id,
        status
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: 'Statut du permis mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Déduire des points
 */
const deductPoints = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { points, reason } = req.body;
    
    logger.info('Déduction de points', { id, points, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'DeductPoints',
        id,
        points.toString(),
        reason
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: `${points} points déduits`,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Restaurer des points
 */
const restorePoints = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { points } = req.body;
    
    logger.info('Restauration de points', { id, points });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RestorePoints',
        id,
        points.toString()
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: `${points} points restaurés`,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Renouveler le permis
 */
const renewLicense = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newExpiryDate } = req.body;
    
    logger.info('Renouvellement du permis', { id, newExpiryDate });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RenewLicense',
        id,
        newExpiryDate
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: 'Permis renouvelé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Associer un véhicule à un conducteur
 */
const associateVehicle = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { vehicleId } = req.body;
    
    logger.info('Association véhicule-conducteur', { driverId: id, vehicleId });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'AssociateVehicle',
        id,
        vehicleId
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: 'Véhicule associé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les conducteurs par statut de permis
 */
const getDriversByLicenseStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryDriversByLicenseStatus',
        status
    );
    
    const drivers = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: drivers,
        count: drivers.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir tous les conducteurs
 */
const getAllDrivers = asyncHandler(async (req, res) => {
    logger.info('Récupération de tous les conducteurs');
    
    let drivers = [];
    let source = 'simulation';
    
    try {
        // First try GetAllDrivers (requires CouchDB)
        const result = await fabricService.evaluateTransaction(
            CHAINCODE, 
            'GetAllDrivers'
        );
        drivers = result ? JSON.parse(result) : [];
        if (drivers.length > 0) {
            source = 'blockchain';
            logger.info(`${drivers.length} conducteurs récupérés de la blockchain (CouchDB query)`);
        }
    } catch (fabricError) {
        logger.warn('Erreur Fabric, utilisation des données de simulation', { error: fabricError.message });
    }
    
    // Use simulation data if no blockchain data was retrieved
    if (drivers.length === 0) {
        const { SIMULATION_DRIVERS } = require('../services/dataInitializer');
        drivers = SIMULATION_DRIVERS.map(d => ({
            ...d,
            licenseStatus: 'active',
            points: 12,
        }));
        source = 'simulation';
    }
    
    res.status(200).json({
        success: true,
        data: drivers,
        count: drivers.length,
        source: source,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un conducteur par numéro de permis
 */
const getDriverByLicense = asyncHandler(async (req, res) => {
    const { license } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetDriverByLicense', 
        license
    );
    
    if (!result) {
        throw ApiError.notFound(`Conducteur avec permis ${license} non trouvé`);
    }
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir l'historique d'un conducteur
 */
const getDriverHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetDriverHistory',
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

/**
 * Ajouter des points au permis
 */
const addPoints = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { points, reason } = req.body;
    
    logger.info('Ajout de points', { id, points, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'AddPoints',
        id,
        points.toString(),
        reason || ''
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: `${points} points ajoutés`,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut d'un conducteur
 */
const updateDriverStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Mise à jour du statut du conducteur', { id, status });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateDriverStatus',
        id,
        status
    );
    
    const driver = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: driver,
        message: 'Statut du conducteur mis à jour',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Infractions
// ============================================================================

/**
 * Enregistrer une infraction
 */
const recordViolation = asyncHandler(async (req, res) => {
    const { 
        id, vehicleId, driverId, type, description, 
        location, roadId, fineAmount, pointsDeducted 
    } = req.body;
    
    logger.info('Enregistrement d\'une infraction', { id, vehicleId, driverId, type });
    logToSOC('info', `⚠️ VIOLATION RECORDING: ${type} - Vehicle: ${vehicleId}, Driver: ${driverId}`, { id, vehicleId, driverId, type, fineAmount });
    
    let violation;
    let source = 'blockchain';
    
    try {
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'RecordViolation',
            id || `VIO-${Date.now()}`,
            vehicleId,
            driverId,
            type,
            description,
            JSON.stringify(location || {}),
            roadId || '',
            (fineAmount || 400).toString(),
            (pointsDeducted || 2).toString()
        );
        
        violation = JSON.parse(result);
        logToSOC('warn', `🚨 VIOLATION RECORDED ON BLOCKCHAIN: ${id} - ${type} - Fine: ${fineAmount}€, Points: -${pointsDeducted}`, { id, type, vehicleId, driverId, fineAmount, pointsDeducted });
    } catch (error) {
        // Fallback to simulation mode
        logger.warn('Blockchain violation recording failed, using simulation mode', { error: error.message });
        source = 'simulation';
        violation = {
            id: id || `VIO-SIM-${Date.now()}`,
            vehicleId,
            driverId,
            type,
            description,
            location: location || { lat: 33.5731, lng: -7.5898 },
            roadId: roadId || 'ROAD-001',
            fineAmount: fineAmount || 400,
            pointsDeducted: pointsDeducted || 2,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        logToSOC('warn', `🚨 VIOLATION RECORDED (SIM): ${violation.id} - ${type}`, { ...violation, source: 'simulation' });
    }
    
    res.status(201).json({
        success: true,
        source,
        data: violation,
        message: source === 'blockchain' ? 'Infraction enregistrée sur BLOCKCHAIN' : 'Infraction enregistrée (mode simulation)',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer un excès de vitesse
 */
const recordSpeedingViolation = asyncHandler(async (req, res) => {
    const { id, vehicleId, driverId, location, roadId, speed, speedLimit } = req.body;
    
    logger.info('Enregistrement d\'un excès de vitesse', { id, speed, speedLimit });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RecordSpeedingViolation',
        id,
        vehicleId,
        driverId,
        JSON.stringify(location),
        roadId || '',
        speed.toString(),
        speedLimit.toString()
    );
    
    const violation = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: violation,
        message: 'Excès de vitesse enregistré',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer un feu rouge grillé
 */
const recordRedLightViolation = asyncHandler(async (req, res) => {
    const { id, vehicleId, driverId, location, intersectionId } = req.body;
    
    logger.info('Enregistrement d\'un feu rouge grillé', { id, intersectionId });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RecordRedLightViolation',
        id,
        vehicleId,
        driverId,
        JSON.stringify(location),
        intersectionId
    );
    
    const violation = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: violation,
        message: 'Infraction feu rouge enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Payer une infraction
 */
const payViolation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Paiement d\'une infraction', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'PayViolation',
        id
    );
    
    const violation = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: violation,
        message: 'Infraction payée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Contester une infraction
 */
const contestViolation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('Contestation d\'une infraction', { id, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'ContestViolation',
        id,
        reason
    );
    
    const violation = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: violation,
        message: 'Contestation enregistrée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les infractions par véhicule
 */
const getViolationsByVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryViolationsByVehicle',
        vehicleId
    );
    
    const violations = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: violations,
        count: violations.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les infractions par conducteur
 */
const getViolationsByDriver = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryViolationsByDriver',
        driverId
    );
    
    const violations = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: violations,
        count: violations.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les statistiques des infractions
 */
const getViolationStatistics = asyncHandler(async (req, res) => {
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetViolationStatistics'
    );
    
    const statistics = JSON.parse(result || '{}');
    
    res.status(200).json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir une infraction par ID
 */
const getViolation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetViolation', id);
    
    if (!result) {
        throw ApiError.notFound(`Infraction ${id} non trouvée`);
    }
    
    const violation = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: violation,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir toutes les infractions
 */
const getAllViolations = asyncHandler(async (req, res) => {
    logger.info('Récupération de toutes les infractions');
    
    let violations = [];
    let source = 'mock';
    
    try {
        // First try GetAllViolations (requires CouchDB)
        const result = await fabricService.evaluateTransaction(
            CHAINCODE, 
            'GetAllViolations'
        );
        violations = result ? JSON.parse(result) : [];
        source = 'blockchain';
        logger.info(`${violations.length} infractions récupérées de la blockchain (CouchDB query)`);
    } catch (fabricError) {
        // Check if it's a LevelDB limitation error
        if (fabricError.message && fabricError.message.includes('ExecuteQuery not supported for leveldb')) {
            logger.info('CouchDB query not supported, trying individual violation lookup...');
            
            // Fallback: Try to get violations individually (works with LevelDB)
            try {
                const knownViolationIds = ['VIO001', 'VIO002', 'VIO003', 'VIO004', 'VIO005', 'VIO006', 'VIO007', 'VIO008', 'VIO009', 'VIO010'];
                violations = [];
                
                for (const id of knownViolationIds) {
                    try {
                        const violationResult = await fabricService.evaluateTransaction(CHAINCODE, 'GetViolation', id);
                        if (violationResult) {
                            violations.push(JSON.parse(violationResult));
                        }
                    } catch (e) {
                        // Violation doesn't exist, skip
                    }
                }
                
                if (violations.length > 0) {
                    source = 'blockchain';
                    logger.info(`${violations.length} infractions récupérées de la blockchain (LevelDB lookup)`);
                }
            } catch (lookupError) {
                logger.warn('Individual violation lookup failed', { error: lookupError.message });
            }
        } else if (!fabricService.isConnectionActive || !fabricService.isConnectionActive()) {
            logger.warn('Fabric non connecté, retour des données mock', { error: fabricError.message });
        } else {
            logger.warn('Erreur Fabric', { error: fabricError.message });
        }
    }
    
    // Use mock data only if no blockchain data was retrieved
    if (violations.length === 0) {
        violations = [
            { id: 'VIO001', vehicleId: 'VEH001', driverId: 'DRV001', type: 'speeding', fineAmount: 500, location: { lat: 33.5731, lng: -7.5898 }, timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'pending', description: 'Speeding: 85 km/h in 60 km/h zone' },
            { id: 'VIO002', vehicleId: 'VEH002', driverId: 'DRV002', type: 'red_light', fineAmount: 700, location: { lat: 33.5750, lng: -7.5920 }, timestamp: new Date(Date.now() - 172800000).toISOString(), status: 'paid', description: 'Red light violation' },
            { id: 'VIO003', vehicleId: 'VEH003', driverId: 'DRV003', type: 'parking', fineAmount: 150, location: { lat: 33.5800, lng: -7.5950 }, timestamp: new Date(Date.now() - 259200000).toISOString(), status: 'pending', description: 'Illegal parking' },
            { id: 'VIO004', vehicleId: 'VEH001', driverId: 'DRV001', type: 'speeding', fineAmount: 1000, location: { lat: 33.5900, lng: -7.6000 }, timestamp: new Date(Date.now() - 345600000).toISOString(), status: 'paid', description: 'Excessive speeding: 120 km/h in 80 km/h zone' },
            { id: 'VIO005', vehicleId: 'VEH004', driverId: 'DRV004', type: 'no_insurance', fineAmount: 2000, location: { lat: 33.5650, lng: -7.5800 }, timestamp: new Date(Date.now() - 432000000).toISOString(), status: 'pending', description: 'No insurance' },
            { id: 'VIO006', vehicleId: 'VEH005', driverId: 'DRV005', type: 'reckless_driving', fineAmount: 1500, location: { lat: 33.5700, lng: -7.5850 }, timestamp: new Date(Date.now() - 518400000).toISOString(), status: 'pending', description: 'Reckless driving' },
        ];
        source = 'mock';
    }
    
    res.status(200).json({
        success: true,
        data: violations,
        count: violations.length,
        source: source,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les infractions non payées
 */
const getUnpaidViolations = asyncHandler(async (req, res) => {
    const { driverId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetUnpaidViolations',
        driverId || ''
    );
    
    const violations = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: violations,
        count: violations.length,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Transferts et documents
// ============================================================================

/**
 * Initier un transfert de véhicule
 */
const initiateTransfer = asyncHandler(async (req, res) => {
    const { id, vehicleId, fromOwnerId, toOwnerId, price } = req.body;
    
    logger.info('Initiation d\'un transfert', { id, vehicleId, fromOwnerId, toOwnerId });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'InitiateTransfer',
        id,
        vehicleId,
        fromOwnerId,
        toOwnerId,
        price.toString()
    );
    
    const transfer = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: transfer,
        message: 'Transfert initié',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Approuver un transfert
 */
const approveTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Approbation d\'un transfert', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'ApproveTransfer',
        id
    );
    
    const transfer = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: transfer,
        message: 'Transfert approuvé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Rejeter un transfert
 */
const rejectTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('Rejet d\'un transfert', { id, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'RejectTransfer',
        id,
        reason
    );
    
    const transfer = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: transfer,
        message: 'Transfert rejeté',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un transfert par ID
 */
const getTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetTransfer', id);
    
    if (!result) {
        throw ApiError.notFound(`Transfert ${id} non trouvé`);
    }
    
    const transfer = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: transfer,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir tous les transferts
 */
const getAllTransfers = asyncHandler(async (req, res) => {
    logger.info('Récupération de tous les transferts');
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetAllTransfers'
    );
    
    const transfers = result ? JSON.parse(result) : [];
    
    res.status(200).json({
        success: true,
        data: transfers,
        count: transfers.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Compléter un transfert
 */
const completeTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    logger.info('Finalisation d\'un transfert', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CompleteTransfer',
        id
    );
    
    const transfer = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: transfer,
        message: 'Transfert complété',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Annuler un transfert
 */
const cancelTransfer = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('Annulation d\'un transfert', { id, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CancelTransfer',
        id,
        reason || ''
    );
    
    const transfer = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: transfer,
        message: 'Transfert annulé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Enregistrer un contrôle technique
 */
const recordInspection = asyncHandler(async (req, res) => {
    const { id, vehicleId, result: inspectionResult, mileage, defects, recommendations, inspectorId, centerId } = req.body;
    
    logger.info('Enregistrement d\'un contrôle technique', { id, vehicleId, result: inspectionResult });
    
    const resultData = await fabricService.submitTransaction(
        CHAINCODE,
        'RecordInspection',
        id,
        vehicleId,
        inspectionResult,
        mileage.toString(),
        JSON.stringify(defects || []),
        JSON.stringify(recommendations || []),
        inspectorId,
        centerId
    );
    
    const inspection = JSON.parse(resultData);
    
    res.status(201).json({
        success: true,
        data: inspection,
        message: 'Contrôle technique enregistré',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un contrôle technique par ID
 */
const getInspection = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetInspection', id);
    
    if (!result) {
        throw ApiError.notFound(`Contrôle technique ${id} non trouvé`);
    }
    
    const inspection = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: inspection,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les contrôles techniques par véhicule
 */
const getInspectionsByVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetInspectionsByVehicle',
        vehicleId
    );
    
    const inspections = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir tous les contrôles techniques
 */
const getAllInspections = asyncHandler(async (req, res) => {
    logger.info('Récupération de tous les contrôles techniques');
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetAllInspections'
    );
    
    const inspections = result ? JSON.parse(result) : [];
    
    res.status(200).json({
        success: true,
        data: inspections,
        count: inspections.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Créer une assurance
 */
const createInsurance = asyncHandler(async (req, res) => {
    const { id, vehicleId, provider, policyNumber, type, coverage, startDate, endDate, premium } = req.body;
    
    logger.info('Création d\'une assurance', { id, vehicleId, provider });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CreateInsurance',
        id,
        vehicleId,
        provider,
        policyNumber,
        type,
        coverage,
        startDate,
        endDate,
        premium.toString()
    );
    
    const insurance = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: insurance,
        message: 'Assurance créée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir une assurance par ID
 */
const getInsurance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetInsurance', id);
    
    if (!result) {
        throw ApiError.notFound(`Assurance ${id} non trouvée`);
    }
    
    const insurance = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: insurance,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les assurances par véhicule
 */
const getInsuranceByVehicle = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetInsuranceByVehicle',
        vehicleId
    );
    
    const insurance = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: insurance,
        count: insurance.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir toutes les assurances
 */
const getAllInsurance = asyncHandler(async (req, res) => {
    logger.info('Récupération de toutes les assurances');
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE, 
        'GetAllInsurance'
    );
    
    const insurance = result ? JSON.parse(result) : [];
    
    res.status(200).json({
        success: true,
        data: insurance,
        count: insurance.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir l'assurance active d'un véhicule
 */
const getActiveInsurance = asyncHandler(async (req, res) => {
    const { vehicleId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetActiveInsurance',
        vehicleId
    );
    
    if (!result) {
        throw ApiError.notFound(`Aucune assurance active pour le véhicule ${vehicleId}`);
    }
    
    const insurance = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: insurance,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Annuler une assurance
 */
const cancelInsurance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    
    logger.info('Annulation d\'une assurance', { id, reason });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CancelInsurance',
        id,
        reason || ''
    );
    
    const insurance = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: insurance,
        message: 'Assurance annulée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Émettre un permis de stationnement
 */
const issueParkingPermit = asyncHandler(async (req, res) => {
    const { id, vehicleId, zone, permitType, startDate, endDate } = req.body;
    
    logger.info('Émission d\'un permis de stationnement', { id, vehicleId, zone });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'IssueParkingPermit',
        id,
        vehicleId,
        zone,
        permitType,
        startDate,
        endDate
    );
    
    const permit = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: permit,
        message: 'Permis de stationnement émis',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Valider un permis de stationnement
 */
const validateParkingPermit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { zone } = req.query;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'ValidateParkingPermit',
        id,
        zone || ''
    );
    
    const validation = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: validation,
        timestamp: new Date().toISOString(),
    });
});

module.exports = {
    // Initialization
    initLedger,
    
    // Vehicles
    registerVehicle,
    getVehicle,
    getAllVehicles,
    getVehicleByPlate,
    getVehicleByVIN,
    updateVehicleStatus,
    updateVehicleMileage,
    updateVehicleLocation,
    getVehiclesByOwner,
    getVehiclesByStatus,
    getVehicleHistory,
    
    // Drivers
    registerDriver,
    getDriver,
    getAllDrivers,
    getDriverByLicense,
    getDriverHistory,
    updateLicenseStatus,
    updateDriverStatus,
    deductPoints,
    addPoints,
    restorePoints,
    renewLicense,
    associateVehicle,
    getDriversByLicenseStatus,
    
    // Violations
    recordViolation,
    recordSpeedingViolation,
    recordRedLightViolation,
    getViolation,
    getAllViolations,
    getUnpaidViolations,
    payViolation,
    contestViolation,
    getViolationsByVehicle,
    getViolationsByDriver,
    getViolationStatistics,
    
    // Transfers
    initiateTransfer,
    getTransfer,
    getAllTransfers,
    approveTransfer,
    completeTransfer,
    cancelTransfer,
    rejectTransfer,
    
    // Inspections
    recordInspection,
    getInspection,
    getInspectionsByVehicle,
    getAllInspections,
    
    // Insurance
    createInsurance,
    getInsurance,
    getInsuranceByVehicle,
    getAllInsurance,
    getActiveInsurance,
    cancelInsurance,
    
    // Parking
    issueParkingPermit,
    validateParkingPermit,
};
