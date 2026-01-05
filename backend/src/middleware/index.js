/**
 * ============================================================================
 * Middleware Index - Smart City Traffic Management System
 * ============================================================================
 * Export centralisé de tous les middlewares
 * ============================================================================
 */

const {
    ApiError,
    formatValidationErrors,
    notFoundHandler,
    errorHandler,
    asyncHandler,
    timeoutHandler,
} = require('./error.middleware');

const {
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
} = require('./auth.middleware');

module.exports = {
    // Error middleware
    ApiError,
    formatValidationErrors,
    notFoundHandler,
    errorHandler,
    asyncHandler,
    timeoutHandler,
    
    // Auth middleware
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
