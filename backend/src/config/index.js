/**
 * ============================================================================
 * Configuration - Smart City Traffic Management System
 * ============================================================================
 * Chargement et validation de la configuration depuis les variables d'environnement
 * ============================================================================
 */

const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Configuration du serveur
 */
const serverConfig = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || 'localhost',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
};

/**
 * Configuration JWT
 */
const jwtConfig = {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
};

/**
 * Configuration Hyperledger Fabric
 */
const fabricConfig = {
    // Canal Principal (Production)
    channelName: process.env.CHANNEL_NAME || 'traffic-channel',
    
    // Canal de Test Isolé (Consensus Testing)
    testChannelName: process.env.TEST_CHANNEL_NAME || 'consensus-test-channel',
    
    // Chaincodes
    chaincodes: {
        roadManager: process.env.CHAINCODE_ROAD_MANAGER || 'road-manager',
        sensorData: process.env.CHAINCODE_SENSOR_DATA || 'sensor-data',
        trafficRegistry: process.env.CHAINCODE_TRAFFIC_REGISTRY || 'traffic-registry',
        testRoadManager: process.env.CHAINCODE_TEST_ROAD_MANAGER || 'test-road-manager',
    },
    
    // Organisation - Org1 is Traffic Authority
    mspId: process.env.MSP_ID || 'Org1MSP',
    
    // Chemins des certificats - Use org1.traffic-network.com
    cryptoPath: process.env.CRYPTO_PATH || path.resolve(__dirname, '../../../network/organizations/peerOrganizations/org1.traffic-network.com'),
    
    // Getters pour les chemins dynamiques
    getCertPath() {
        return process.env.CERT_PATH || 
            path.resolve(this.cryptoPath, 'users/User1@org1.traffic-network.com/msp/signcerts/User1@org1.traffic-network.com-cert.pem');
    },
    
    getKeyDirectoryPath() {
        return process.env.KEY_PATH || 
            path.resolve(this.cryptoPath, 'users/User1@org1.traffic-network.com/msp/keystore');
    },
    
    getTlsCertPath() {
        return process.env.TLS_CERT_PATH || 
            path.resolve(this.cryptoPath, 'peers/peer0.org1.traffic-network.com/tls/ca.crt');
    },
    
    // Configuration Peer - peer0.org1 on port 7051
    peer: {
        endpoint: process.env.PEER_ENDPOINT || 'localhost:7051',
        hostAlias: process.env.PEER_HOST_ALIAS || 'peer0.org1.traffic-network.com',
    },
    
    // Configuration Orderer
    orderer: {
        endpoint: process.env.ORDERER_ENDPOINT || 'localhost:7050',
        hostAlias: process.env.ORDERER_HOST_ALIAS || 'orderer1.traffic-network.com',
    },
    
    // Timeouts (en secondes)
    timeouts: {
        endorsement: 30,
        commit: 60,
        query: 30,
    },
};

/**
 * Configuration CORS
 */
const corsConfig = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
    methods: process.env.CORS_METHODS ? process.env.CORS_METHODS.split(',') : ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
};

/**
 * Configuration Rate Limiting
 */
const rateLimitConfig = {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute (dev-friendly)
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10), // 1000 requests per minute
    message: {
        error: 'Trop de requêtes, veuillez réessayer plus tard',
        retryAfter: 'Réessayez dans quelques minutes',
    },
};

/**
 * Configuration Logging
 */
const logConfig = {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'combined',
    directory: process.env.LOG_DIR || './logs',
};

/**
 * Configuration API
 */
const apiConfig = {
    prefix: process.env.API_PREFIX || '/api/v1',
    docsEnabled: process.env.API_DOCS_ENABLED === 'true',
    docsPath: process.env.API_DOCS_PATH || '/api-docs',
    pagination: {
        defaultLimit: 20,
        maxLimit: 100,
    },
};

/**
 * Configuration globale
 */
const config = {
    server: serverConfig,
    jwt: jwtConfig,
    fabric: fabricConfig,
    cors: corsConfig,
    rateLimit: rateLimitConfig,
    log: logConfig,
    api: apiConfig,
};

/**
 * Validation de la configuration
 */
function validateConfig() {
    const requiredEnvVars = ['JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0 && serverConfig.isProduction) {
        throw new Error(`Variables d'environnement manquantes: ${missingVars.join(', ')}`);
    }
    
    if (serverConfig.isProduction && jwtConfig.secret === 'default-secret-change-in-production') {
        throw new Error('JWT_SECRET doit être défini en production');
    }
}

module.exports = {
    config,
    serverConfig,
    jwtConfig,
    fabricConfig,
    corsConfig,
    rateLimitConfig,
    logConfig,
    apiConfig,
    validateConfig,
};
