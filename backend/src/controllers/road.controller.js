/**
 * ============================================================================
 * Controller Road Manager - Smart City Traffic Management System
 * ============================================================================
 * Gestion des routes, intersections et événements de circulation
 * ============================================================================
 */

const { fabricService } = require('../services/fabric.service');
const { fabricConfig } = require('../config');
const { ApiError, asyncHandler } = require('../middleware');
const { apiLogger: logger } = require('../utils/logger');

const CHAINCODE = fabricConfig.chaincodes.roadManager;

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
    logger.info('Initialisation du ledger Road Manager');
    
    const result = await fabricService.submitTransaction(CHAINCODE, 'InitLedger');
    
    res.status(200).json({
        success: true,
        message: 'Ledger initialisé avec succès',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Routes (Roads)
// ============================================================================

/**
 * Créer une nouvelle route
 */
const createRoad = asyncHandler(async (req, res) => {
    const { id, name, description, startPoint, endPoint, length, lanes, speedLimit, roadType, surfaceCondition } = req.body;
    
    logger.info('Création d\'une route', { id, name });
    logToSOC('info', `🛣️ ROAD CREATION: Attempting to create ${id} (${name})`, { id, name, roadType, lanes });
    
    try {
        const result = await fabricService.submitTransaction(
            CHAINCODE,
            'CreateRoad',
            id,
            name,
            description || '',
            JSON.stringify(startPoint),
            JSON.stringify(endPoint),
            length.toString(),
            lanes.toString(),
            speedLimit.toString(),
            roadType,
            surfaceCondition || 'good'
        );
        
        const road = JSON.parse(result);
        logToSOC('info', `✅ ROAD CREATED: ${id} (${name}) - ${length}km, ${lanes} lanes, ${speedLimit}km/h`, { id, name, length, lanes, speedLimit });
        
        res.status(201).json({
            success: true,
            data: road,
            message: 'Route créée avec succès',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logToSOC('error', `❌ ROAD CREATION FAILED: ${id} (${name}) - ${error.message}`, { id, name, error: error.message });
        throw error;
    }
});

/**
 * Obtenir une route par ID
 */
const getRoad = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetRoad', id);
    
    if (!result) {
        throw ApiError.notFound(`Route ${id} non trouvée`);
    }
    
    const road = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: road,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir toutes les routes
 */
const getAllRoads = asyncHandler(async (req, res) => {
    let roads = [];
    let source = 'blockchain';
    
    // Status variés pour rendre la simulation plus réaliste
    const roadStatuses = {
        'ROAD-001': 'open',
        'ROAD-002': 'open',
        'ROAD-003': 'maintenance',  // Rue Allal Ben Abdellah - travaux
        'ROAD-004': 'open',
        'ROAD-005': 'congested',    // Boulevard Zerktouni - embouteillage
        'ROAD-006': 'open',
        'ROAD-007': 'closed',       // Avenue Moulay Rachid - fermée
        'ROAD-008': 'open',
        'ROAD-009': 'maintenance',  // Rue de Paris - travaux
        'ROAD-010': 'open',
    };
    
    try {
        const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetAllRoads');
        roads = JSON.parse(result || '[]');
        
        // Si blockchain vide ou erreur, utiliser données de simulation
        if (roads.length === 0) {
            const { SIMULATION_ROADS } = require('../services/dataInitializer');
            roads = SIMULATION_ROADS.map(r => ({
                ...r,
                status: roadStatuses[r.id] || 'open',
                surfaceCondition: r.id === 'ROAD-003' || r.id === 'ROAD-009' ? 'poor' : 'good',
            }));
            source = 'simulation';
        }
    } catch (error) {
        // Return simulation data if Fabric is not connected
        logger.warn('Fabric not connected, returning simulation data');
        const { SIMULATION_ROADS } = require('../services/dataInitializer');
        roads = SIMULATION_ROADS.map(r => ({
            ...r,
            status: roadStatuses[r.id] || 'open',
            surfaceCondition: r.id === 'ROAD-003' || r.id === 'ROAD-009' ? 'poor' : 'good',
        }));
        source = 'simulation';
    }
    
    res.status(200).json({
        success: true,
        data: roads,
        count: roads.length,
        source,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut d'une route
 */
const updateRoadStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    logger.info('Mise à jour du statut de la route', { id, status });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateRoadStatus',
        id,
        status
    );
    
    const road = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: road,
        message: 'Statut de la route mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour la limite de vitesse
 */
const updateSpeedLimit = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { speedLimit } = req.body;
    
    logger.info('Mise à jour de la limite de vitesse', { id, speedLimit });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateSpeedLimit',
        id,
        speedLimit.toString()
    );
    
    const road = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: road,
        message: 'Limite de vitesse mise à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Rechercher des routes par statut
 */
const getRoadsByStatus = asyncHandler(async (req, res) => {
    const { status } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryRoadsByStatus',
        status
    );
    
    const roads = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: roads,
        count: roads.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Rechercher des routes par type
 */
const getRoadsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryRoadsByType',
        type
    );
    
    const roads = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: roads,
        count: roads.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir l'historique d'une route
 */
const getRoadHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'GetRoadHistory',
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
// Intersections
// ============================================================================

/**
 * Créer une intersection
 */
const createIntersection = asyncHandler(async (req, res) => {
    const { id, name, location, type, connectedRoads, trafficLights, pedestrianCrossings } = req.body;
    
    logger.info('Création d\'une intersection', { id, name });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'CreateIntersection',
        id,
        name,
        JSON.stringify(location),
        type,
        JSON.stringify(connectedRoads),
        JSON.stringify(trafficLights || []),
        (pedestrianCrossings || 0).toString()
    );
    
    const intersection = JSON.parse(result);
    
    res.status(201).json({
        success: true,
        data: intersection,
        message: 'Intersection créée avec succès',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir une intersection par ID
 */
const getIntersection = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetIntersection', id);
    
    if (!result) {
        throw ApiError.notFound(`Intersection ${id} non trouvée`);
    }
    
    const intersection = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: intersection,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir toutes les intersections
 */
const getAllIntersections = asyncHandler(async (req, res) => {
    let intersections = [];
    let source = 'blockchain';
    
    try {
        const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetAllIntersections');
        intersections = JSON.parse(result || '[]');
        
        // Si blockchain vide, utiliser données de simulation
        if (intersections.length === 0) {
            const { SIMULATION_INTERSECTIONS } = require('../services/dataInitializer');
            intersections = SIMULATION_INTERSECTIONS.map(i => ({
                ...i,
                status: 'active',
                signalTiming: {
                    cycleTime: i.cycleDuration,
                    phases: i.trafficLightPhases,
                },
            }));
            source = 'simulation';
        }
    } catch (error) {
        logger.warn('Fabric not connected, returning simulation data for intersections');
        const { SIMULATION_INTERSECTIONS } = require('../services/dataInitializer');
        intersections = SIMULATION_INTERSECTIONS.map(i => ({
            ...i,
            status: 'active',
            signalTiming: {
                cycleTime: i.cycleDuration,
                phases: i.trafficLightPhases,
            },
        }));
        source = 'simulation';
    }
    
    res.status(200).json({
        success: true,
        data: intersections,
        count: intersections.length,
        source,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour la phase des feux de circulation
 */
const updateTrafficLightPhase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { lightId, phase, duration } = req.body;
    
    logger.info('Mise à jour de la phase du feu', { intersectionId: id, lightId, phase });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateTrafficLightPhase',
        id,
        lightId,
        phase,
        duration.toString()
    );
    
    const intersection = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: intersection,
        message: 'Phase du feu mise à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les intersections par type
 */
const getIntersectionsByType = asyncHandler(async (req, res) => {
    const { type } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryIntersectionsByType',
        type
    );
    
    const intersections = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: intersections,
        count: intersections.length,
        timestamp: new Date().toISOString(),
    });
});

// ============================================================================
// Événements de circulation
// ============================================================================

/**
 * Créer un événement de circulation - Enregistré sur BLOCKCHAIN
 */
const createTrafficEvent = asyncHandler(async (req, res) => {
    const { id, type, roadId, location, description, severity, estimatedDuration, affectedLanes } = req.body;
    
    // Generate event ID if not provided
    const eventId = id || `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info('🚨 Création d\'un événement de circulation', { eventId, type, roadId });
    logToSOC('info', `🚨 TRAFFIC EVENT: Creating ${type} on ${roadId}`, { eventId, type, roadId, severity });
    
    let event;
    let source = 'blockchain';
    
    // Try to record on blockchain using sensor-data chaincode (which is working)
    try {
        const result = await fabricService.submitTransaction(
            'sensor-data',
            'RecordSecurityIncident',
            eventId,                                    // incidentID
            type || 'traffic_event',                    // incidentType
            severity || 'medium',                       // severity
            description || 'Traffic event reported',   // description
            roadId || 'ROAD-001',                       // sourceIP (using roadId)
            'TrafficSimulator',                         // detectedBy
            '50.0',                                     // threatScore (as string)
            JSON.stringify({                            // llmAnalysis (metadata as JSON)
                roadId: roadId || 'ROAD-001',
                location: location || { lat: 33.5731, lng: -7.5898 },
                estimatedDuration: estimatedDuration || 60,
                affectedLanes: affectedLanes || [],
                eventType: type,
                category: 'road_event'
            })
        );
        
        event = {
            id: eventId,
            type: type || 'traffic_event',
            roadId: roadId || 'ROAD-001',
            severity: severity || 'medium',
            description: description || 'Traffic event reported',
            location: location || { lat: 33.5731, lng: -7.5898 },
            estimatedDuration: estimatedDuration || 60,
            affectedLanes: affectedLanes || [],
            timestamp: new Date().toISOString(),
            status: 'active',
            blockchainTx: result ? JSON.parse(result) : null
        };
        
        logger.info(`✅ Traffic event ${eventId} recorded on BLOCKCHAIN (sensor-data)`);
        logToSOC('info', `✅ BLOCKCHAIN TX: Traffic event ${eventId} recorded`, { eventId, type, roadId, source: 'blockchain' });
        
    } catch (fabricError) {
        logger.warn('⚠️ Blockchain error, trying road-manager chaincode:', fabricError.message);
        
        // Try road-manager chaincode as fallback
        try {
            const result = await fabricService.submitTransaction(
                CHAINCODE,
                'CreateEvent',
                eventId,
                type,
                roadId,
                JSON.stringify(location || {}),
                description || '',
                severity || 'low',
                (estimatedDuration || 0).toString(),
                JSON.stringify(affectedLanes || [])
            );
            event = JSON.parse(result);
            logger.info(`✅ Traffic event ${eventId} recorded on BLOCKCHAIN (road-manager)`);
        } catch (roadManagerError) {
            // Mock mode when both chaincodes fail
            source = 'mock';
            event = {
                id: eventId,
                type,
                roadId,
                severity: severity || 'low',
                description: description || '',
                location: location || { lat: 33.5731, lng: -7.5898 },
                timestamp: new Date().toISOString(),
                status: 'active'
            };
            logger.warn(`⚠️ Mode mock: événement ${eventId} simulé (blockchain unavailable)`);
            logToSOC('warn', `⚠️ MOCK MODE: Traffic event ${eventId} not on blockchain`, { eventId, error: roadManagerError.message });
        }
    }
    
    res.status(201).json({
        success: true,
        source,
        data: event,
        message: source === 'blockchain' ? 'Événement enregistré sur la BLOCKCHAIN' : 'Événement enregistré (mode mock)',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un événement par ID
 */
const getTrafficEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetEvent', id);
    
    if (!result) {
        throw ApiError.notFound(`Événement ${id} non trouvé`);
    }
    
    const event = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: event,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les événements actifs
 */
const getActiveEvents = asyncHandler(async (req, res) => {
    let events;
    try {
        const result = await fabricService.evaluateTransaction(CHAINCODE, 'GetActiveEvents');
        events = JSON.parse(result || '[]');
    } catch (fabricError) {
        // Mock data when Fabric is not connected
        events = [
            { id: 'EVT001', roadId: 'ROAD001', type: 'accident', severity: 'high', description: 'Collision entre deux véhicules', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'active', location: { lat: 33.5731, lng: -7.5898 } },
            { id: 'EVT002', roadId: 'ROAD002', type: 'congestion', severity: 'medium', description: 'Trafic dense - ralentissement', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'active', location: { lat: 33.5750, lng: -7.5920 } },
            { id: 'EVT003', roadId: 'ROAD003', type: 'construction', severity: 'low', description: 'Travaux de voirie - voie réduite', timestamp: new Date(Date.now() - 14400000).toISOString(), status: 'active', location: { lat: 33.5800, lng: -7.5950 } },
            { id: 'EVT004', roadId: 'ROAD001', type: 'weather', severity: 'medium', description: 'Route glissante - pluie forte', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'active', location: { lat: 33.5900, lng: -7.6000 } },
            { id: 'EVT005', roadId: 'ROAD004', type: 'closure', severity: 'high', description: 'Route fermée pour manifestation', timestamp: new Date(Date.now() - 21600000).toISOString(), status: 'active', location: { lat: 33.5650, lng: -7.5800 } },
        ];
        logger.debug('Mode mock: données événements simulées');
    }
    
    res.status(200).json({
        success: true,
        data: events,
        count: events.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les événements par route
 */
const getEventsByRoad = asyncHandler(async (req, res) => {
    const { roadId } = req.params;
    
    const result = await fabricService.evaluateTransaction(
        CHAINCODE,
        'QueryEventsByRoad',
        roadId
    );
    
    const events = JSON.parse(result || '[]');
    
    res.status(200).json({
        success: true,
        data: events,
        count: events.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Résoudre un événement
 */
const resolveEvent = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { resolution } = req.body;
    
    logger.info('Résolution d\'un événement', { id });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'ResolveEvent',
        id,
        resolution || ''
    );
    
    const event = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: event,
        message: 'Événement résolu',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour la sévérité d'un événement
 */
const updateEventSeverity = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { severity } = req.body;
    
    logger.info('Mise à jour de la sévérité', { id, severity });
    
    const result = await fabricService.submitTransaction(
        CHAINCODE,
        'UpdateEventSeverity',
        id,
        severity
    );
    
    const event = JSON.parse(result);
    
    res.status(200).json({
        success: true,
        data: event,
        message: 'Sévérité mise à jour',
        timestamp: new Date().toISOString(),
    });
});

module.exports = {
    // Initialization
    initLedger,
    
    // Roads
    createRoad,
    getRoad,
    getAllRoads,
    updateRoadStatus,
    updateSpeedLimit,
    getRoadsByStatus,
    getRoadsByType,
    getRoadHistory,
    
    // Intersections
    createIntersection,
    getIntersection,
    getAllIntersections,
    updateTrafficLightPhase,
    getIntersectionsByType,
    
    // Events
    createTrafficEvent,
    getTrafficEvent,
    getActiveEvents,
    getEventsByRoad,
    resolveEvent,
    updateEventSeverity,
};
