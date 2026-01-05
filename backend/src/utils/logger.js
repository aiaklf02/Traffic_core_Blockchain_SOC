/**
 * ============================================================================
 * Logger - Smart City Traffic Management System
 * ============================================================================
 * Configuration Winston pour la journalisation structurée
 * ============================================================================
 */

const winston = require('winston');
const path = require('path');
const { logConfig, serverConfig } = require('../config');

// Format personnalisé pour les logs
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// Format JSON pour la production
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Configuration des transports
const transports = [
    // Console - toujours actif
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            customFormat
        ),
    }),
];

// Ajouter les fichiers de log en production
if (serverConfig.isProduction) {
    const logDir = path.resolve(logConfig.directory);
    
    // Logs d'erreurs
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: jsonFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
    
    // Logs combinés
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: jsonFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Créer le logger
const logger = winston.createLogger({
    level: logConfig.level,
    format: serverConfig.isProduction ? jsonFormat : customFormat,
    transports,
    exitOnError: false,
});

// Stream pour Morgan (HTTP logging)
const morganStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

/**
 * Logger contextuel pour les services
 */
function createServiceLogger(serviceName) {
    return {
        info: (message, meta = {}) => 
            logger.info(message, { service: serviceName, ...meta }),
        
        error: (message, error, meta = {}) => {
            const errorMeta = error instanceof Error 
                ? { error: error.message, stack: error.stack }
                : { error: String(error) };
            logger.error(message, { service: serviceName, ...errorMeta, ...meta });
        },
        
        warn: (message, meta = {}) => 
            logger.warn(message, { service: serviceName, ...meta }),
        
        debug: (message, meta = {}) => 
            logger.debug(message, { service: serviceName, ...meta }),
        
        http: (message, meta = {}) => 
            logger.http(message, { service: serviceName, ...meta }),
    };
}

// Loggers pré-configurés
const fabricLogger = createServiceLogger('fabric');
const apiLogger = createServiceLogger('api');
const authLogger = createServiceLogger('auth');

module.exports = {
    logger,
    morganStream,
    createServiceLogger,
    fabricLogger,
    apiLogger,
    authLogger,
};
