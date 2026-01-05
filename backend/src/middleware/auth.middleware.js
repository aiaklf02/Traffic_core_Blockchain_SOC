/**
 * ============================================================================
 * Middleware d'authentification - Smart City Traffic Management System
 * ============================================================================
 * Gestion de l'authentification JWT et autorisation par rôles
 * ============================================================================
 */

const jwt = require('jsonwebtoken');
const { jwtConfig } = require('../config');
const { ApiError } = require('./error.middleware');
const { authLogger: logger } = require('../utils/logger');

/**
 * Rôles utilisateur
 */
const UserRole = {
    ADMIN: 'admin',
    OPERATOR: 'operator',
    ANALYST: 'analyst',
    VIEWER: 'viewer',
};

/**
 * Hiérarchie des rôles (plus le nombre est élevé, plus les permissions sont grandes)
 */
const roleHierarchy = {
    [UserRole.VIEWER]: 1,
    [UserRole.ANALYST]: 2,
    [UserRole.OPERATOR]: 3,
    [UserRole.ADMIN]: 4,
};

/**
 * Extraire le token du header Authorization
 */
function extractToken(req) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return null;
    }
    
    const parts = authHeader.split(' ');
    
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }
    
    return parts[1];
}

/**
 * Middleware d'authentification
 * Vérifie le token JWT et ajoute les informations utilisateur à req.user
 */
function authenticate(req, res, next) {
    try {
        const token = extractToken(req);
        
        if (!token) {
            throw ApiError.unauthorized('Token d\'authentification manquant');
        }
        
        // Vérifier et décoder le token
        const decoded = jwt.verify(token, jwtConfig.secret);
        
        // Ajouter les informations utilisateur à la requête
        req.user = {
            userId: decoded.userId,
            username: decoded.username,
            role: decoded.role,
            organizationId: decoded.organizationId,
        };
        
        logger.debug('Utilisateur authentifié', { 
            userId: decoded.userId, 
            username: decoded.username 
        });
        
        next();
    } catch (error) {
        if (error instanceof ApiError) {
            next(error);
        } else if (error.name === 'TokenExpiredError') {
            next(ApiError.unauthorized('Token expiré'));
        } else if (error.name === 'JsonWebTokenError') {
            next(ApiError.unauthorized('Token invalide'));
        } else {
            next(ApiError.unauthorized('Erreur d\'authentification'));
        }
    }
}

/**
 * Middleware d'authentification optionnel
 * Ne bloque pas si pas de token, mais ajoute req.user si token valide
 */
function optionalAuth(req, res, next) {
    try {
        const token = extractToken(req);
        
        if (token) {
            const decoded = jwt.verify(token, jwtConfig.secret);
            req.user = {
                userId: decoded.userId,
                username: decoded.username,
                role: decoded.role,
                organizationId: decoded.organizationId,
            };
        }
        
        next();
    } catch (error) {
        // Ignorer les erreurs de token en mode optionnel
        next();
    }
}

/**
 * Middleware d'autorisation par rôle
 * @param {string[]} allowedRoles - Liste des rôles autorisés
 */
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentification requise'));
        }
        
        const userRole = req.user.role;
        
        if (!allowedRoles.includes(userRole)) {
            logger.warn('Accès refusé - rôle insuffisant', {
                userId: req.user.userId,
                userRole,
                requiredRoles: allowedRoles,
            });
            return next(ApiError.forbidden('Vous n\'avez pas les permissions nécessaires'));
        }
        
        next();
    };
}

/**
 * Middleware d'autorisation par niveau de rôle minimum
 * @param {string} minRole - Rôle minimum requis
 */
function authorizeMinRole(minRole) {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentification requise'));
        }
        
        const userRoleLevel = roleHierarchy[req.user.role] || 0;
        const minRoleLevel = roleHierarchy[minRole] || 0;
        
        if (userRoleLevel < minRoleLevel) {
            logger.warn('Accès refusé - niveau de rôle insuffisant', {
                userId: req.user.userId,
                userRole: req.user.role,
                minRole,
            });
            return next(ApiError.forbidden('Niveau de permission insuffisant'));
        }
        
        next();
    };
}

/**
 * Middleware pour vérifier l'appartenance à une organisation
 * @param {string} orgIdParam - Nom du paramètre contenant l'ID de l'organisation
 */
function authorizeOrganization(orgIdParam = 'organizationId') {
    return (req, res, next) => {
        if (!req.user) {
            return next(ApiError.unauthorized('Authentification requise'));
        }
        
        // Les admins peuvent accéder à toutes les organisations
        if (req.user.role === UserRole.ADMIN) {
            return next();
        }
        
        const requestedOrgId = req.params[orgIdParam] || req.body[orgIdParam];
        
        if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
            logger.warn('Accès refusé - organisation différente', {
                userId: req.user.userId,
                userOrg: req.user.organizationId,
                requestedOrg: requestedOrgId,
            });
            return next(ApiError.forbidden('Accès non autorisé à cette organisation'));
        }
        
        next();
    };
}

/**
 * Générer un token JWT
 */
function generateToken(payload) {
    return jwt.sign(payload, jwtConfig.secret, { 
        expiresIn: jwtConfig.expiresIn 
    });
}

/**
 * Générer un refresh token
 */
function generateRefreshToken(payload) {
    return jwt.sign(payload, jwtConfig.refreshSecret, { 
        expiresIn: jwtConfig.refreshExpiresIn 
    });
}

/**
 * Vérifier un refresh token
 */
function verifyRefreshToken(token) {
    return jwt.verify(token, jwtConfig.refreshSecret);
}

/**
 * Générer une paire de tokens (access + refresh)
 */
function generateTokenPair(user) {
    const payload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId,
    };
    
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken({ userId: user.id });
    
    // Calculer l'expiration en secondes
    const expiresIn = parseExpiration(jwtConfig.expiresIn);
    
    return {
        accessToken,
        refreshToken,
        expiresIn,
    };
}

/**
 * Parser la durée d'expiration en secondes
 */
function parseExpiration(expiration) {
    const match = expiration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 3600; // 1 heure par défaut
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 3600;
    }
}

module.exports = {
    UserRole,
    roleHierarchy,
    extractToken,
    authenticate,
    optionalAuth,
    authorize,
    authorizeMinRole,
    authorizeOrganization,
    generateToken,
    generateRefreshToken,
    verifyRefreshToken,
    generateTokenPair,
};
