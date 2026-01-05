/**
 * ============================================================================
 * Middleware de gestion des erreurs - Smart City Traffic Management System
 * ============================================================================
 * Gestion centralisée des erreurs pour l'API Express
 * ============================================================================
 */

const { apiLogger: logger } = require('../utils/logger');
const { serverConfig } = require('../config');

// Référence au SOC pour les logs de sécurité (lazy loading)
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
 * Envoyer un log au SOC
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
            source: 'api'
        });
    }
}

/**
 * Classe d'erreur personnalisée pour l'API
 */
class ApiError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }

    // Erreurs prédéfinies
    static badRequest(message = 'Requête invalide', details = null) {
        return new ApiError(message, 400, 'BAD_REQUEST', details);
    }

    static unauthorized(message = 'Non autorisé') {
        return new ApiError(message, 401, 'UNAUTHORIZED');
    }

    static forbidden(message = 'Accès refusé') {
        return new ApiError(message, 403, 'FORBIDDEN');
    }

    static notFound(message = 'Ressource non trouvée') {
        return new ApiError(message, 404, 'NOT_FOUND');
    }

    static conflict(message = 'Conflit de ressources') {
        return new ApiError(message, 409, 'CONFLICT');
    }

    static unprocessableEntity(message = 'Entité non traitable', details = null) {
        return new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', details);
    }

    static tooManyRequests(message = 'Trop de requêtes') {
        return new ApiError(message, 429, 'TOO_MANY_REQUESTS');
    }

    static internal(message = 'Erreur interne du serveur') {
        return new ApiError(message, 500, 'INTERNAL_ERROR');
    }

    static serviceUnavailable(message = 'Service temporairement indisponible') {
        return new ApiError(message, 503, 'SERVICE_UNAVAILABLE');
    }

    static fabricError(message = 'Erreur de communication avec le réseau blockchain') {
        return new ApiError(message, 502, 'FABRIC_ERROR');
    }
}

/**
 * Convertir les erreurs de validation express-validator
 */
function formatValidationErrors(errors) {
    const formatted = {};
    
    for (const error of errors) {
        if (error.type === 'field') {
            const field = error.path;
            if (!formatted[field]) {
                formatted[field] = [];
            }
            formatted[field].push(error.msg);
        }
    }
    
    return formatted;
}

/**
 * Middleware pour les routes non trouvées
 */
function notFoundHandler(req, res, next) {
    next(ApiError.notFound(`Route ${req.method} ${req.path} non trouvée`));
}

/**
 * Middleware principal de gestion des erreurs
 */
function errorHandler(err, req, res, _next) {
    // Déterminer le code de statut
    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Une erreur interne est survenue';
    let details = null;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        details = err.details;
    } else if (err.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = err.message;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        code = 'INVALID_TOKEN';
        message = 'Token invalide';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        code = 'TOKEN_EXPIRED';
        message = 'Token expiré';
    } else if (err.message && err.message.includes('MVCC_READ_CONFLICT')) {
        statusCode = 409;
        code = 'BLOCKCHAIN_CONFLICT';
        message = 'Conflit de version sur la blockchain, veuillez réessayer';
    } else if (err.message && err.message.includes('ENDORSEMENT_FAILURE')) {
        statusCode = 502;
        code = 'ENDORSEMENT_FAILURE';
        message = 'Échec de l\'endorsement de la transaction';
    }

    // Logger l'erreur
    const logData = {
        statusCode,
        code,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.user ? req.user.userId : undefined,
    };

    if (statusCode >= 500) {
        logger.error(message, err, logData);
    } else {
        logger.warn(message, logData);
    }

    // Log to SOC for registry/blockchain operations
    if (req.path.includes('/registry') || req.path.includes('/vehicles') || 
        req.path.includes('/drivers') || req.path.includes('/roads') ||
        code.includes('BLOCKCHAIN') || code.includes('FABRIC') || code.includes('ENDORSEMENT')) {
        const socLevel = statusCode >= 500 ? 'error' : 'warn';
        const action = req.method === 'POST' ? 'registration' : req.method === 'PUT' ? 'update' : 'operation';
        logToSOC(socLevel, `❌ REGISTRY FAILED: ${action} ${req.path} - ${message}`, {
            statusCode,
            code,
            method: req.method,
            path: req.path,
            body: req.body ? { id: req.body.id, type: req.body.vehicleType || req.body.type } : null
        });
    }

    // Construire la réponse d'erreur
    const errorResponse = {
        success: false,
        error: message,
        code,
        timestamp: new Date().toISOString(),
    };

    if (details) {
        errorResponse.details = details;
    }

    // Ajouter la stack trace en développement
    if (serverConfig.isDevelopment && err.stack) {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
}

/**
 * Wrapper pour les handlers async
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Middleware pour timeout des requêtes
 */
function timeoutHandler(timeout = 30000) {
    return (req, res, next) => {
        const timeoutId = setTimeout(() => {
            if (!res.headersSent) {
                next(ApiError.serviceUnavailable('La requête a expiré'));
            }
        }, timeout);

        res.on('finish', () => clearTimeout(timeoutId));
        res.on('close', () => clearTimeout(timeoutId));
        
        next();
    };
}

module.exports = {
    ApiError,
    formatValidationErrors,
    notFoundHandler,
    errorHandler,
    asyncHandler,
    timeoutHandler,
};
