/**
 * ============================================================================
 * Controller Auth - Smart City Traffic Management System
 * ============================================================================
 * Gestion de l'authentification et des utilisateurs
 * ============================================================================
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { ApiError, asyncHandler, generateTokenPair, verifyRefreshToken } = require('../middleware');
const { authLogger: logger } = require('../utils/logger');

// Simulation d'une base de données utilisateurs (en production, utiliser une vraie DB)
const users = new Map();
const refreshTokens = new Map();

// Créer un utilisateur admin par défaut
const defaultAdmin = {
    id: 'admin-001',
    username: 'admin',
    email: 'admin@traffic.com',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    organizationId: 'TrafficAuthority',
    createdAt: new Date().toISOString(),
};
users.set(defaultAdmin.id, defaultAdmin);

/**
 * Inscription d'un nouvel utilisateur
 */
const register = asyncHandler(async (req, res) => {
    const { username, email, password, role, organizationId } = req.body;
    
    // Vérifier si l'utilisateur existe déjà
    const existingUser = Array.from(users.values()).find(
        u => u.username === username || u.email === email
    );
    
    if (existingUser) {
        throw ApiError.conflict('Un utilisateur avec ce nom ou email existe déjà');
    }
    
    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Créer l'utilisateur
    const user = {
        id: uuidv4(),
        username,
        email,
        password: hashedPassword,
        role: role || 'viewer',
        organizationId: organizationId || 'TrafficAuthority',
        createdAt: new Date().toISOString(),
    };
    
    users.set(user.id, user);
    
    logger.info('Nouvel utilisateur enregistré', { userId: user.id, username });
    
    // Générer les tokens
    const tokens = generateTokenPair(user);
    
    // Sauvegarder le refresh token
    refreshTokens.set(tokens.refreshToken, {
        userId: user.id,
        createdAt: new Date().toISOString(),
    });
    
    res.status(201).json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
            tokens,
        },
        message: 'Inscription réussie',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Connexion
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    // Trouver l'utilisateur
    const user = Array.from(users.values()).find(u => u.username === username);
    
    if (!user) {
        logger.warn('Tentative de connexion échouée - utilisateur non trouvé', { username });
        throw ApiError.unauthorized('Identifiants invalides');
    }
    
    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
        logger.warn('Tentative de connexion échouée - mot de passe incorrect', { username });
        throw ApiError.unauthorized('Identifiants invalides');
    }
    
    // Générer les tokens
    const tokens = generateTokenPair(user);
    
    // Sauvegarder le refresh token
    refreshTokens.set(tokens.refreshToken, {
        userId: user.id,
        createdAt: new Date().toISOString(),
    });
    
    // Mettre à jour la dernière connexion
    user.lastLogin = new Date().toISOString();
    
    logger.info('Connexion réussie', { userId: user.id, username });
    
    res.status(200).json({
        success: true,
        data: {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
            tokens,
        },
        message: 'Connexion réussie',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Rafraîchir le token
 */
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;
    
    if (!token) {
        throw ApiError.badRequest('Refresh token manquant');
    }
    
    // Vérifier si le refresh token existe
    const storedToken = refreshTokens.get(token);
    
    if (!storedToken) {
        throw ApiError.unauthorized('Refresh token invalide');
    }
    
    try {
        // Vérifier le token
        const decoded = verifyRefreshToken(token);
        
        // Trouver l'utilisateur
        const user = users.get(decoded.userId);
        
        if (!user) {
            throw ApiError.unauthorized('Utilisateur non trouvé');
        }
        
        // Supprimer l'ancien refresh token
        refreshTokens.delete(token);
        
        // Générer de nouveaux tokens
        const tokens = generateTokenPair(user);
        
        // Sauvegarder le nouveau refresh token
        refreshTokens.set(tokens.refreshToken, {
            userId: user.id,
            createdAt: new Date().toISOString(),
        });
        
        logger.info('Token rafraîchi', { userId: user.id });
        
        res.status(200).json({
            success: true,
            data: { tokens },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        refreshTokens.delete(token);
        throw ApiError.unauthorized('Refresh token expiré ou invalide');
    }
});

/**
 * Déconnexion
 */
const logout = asyncHandler(async (req, res) => {
    const { refreshToken: token } = req.body;
    
    if (token) {
        refreshTokens.delete(token);
    }
    
    logger.info('Déconnexion', { userId: req.user?.userId });
    
    res.status(200).json({
        success: true,
        message: 'Déconnexion réussie',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir le profil de l'utilisateur connecté
 */
const getProfile = asyncHandler(async (req, res) => {
    const user = users.get(req.user.userId);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        },
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le profil
 */
const updateProfile = asyncHandler(async (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    const user = users.get(req.user.userId);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    // Mettre à jour l'email
    if (email && email !== user.email) {
        const emailExists = Array.from(users.values()).find(
            u => u.email === email && u.id !== user.id
        );
        
        if (emailExists) {
            throw ApiError.conflict('Cet email est déjà utilisé');
        }
        
        user.email = email;
    }
    
    // Mettre à jour le mot de passe
    if (newPassword) {
        if (!currentPassword) {
            throw ApiError.badRequest('Mot de passe actuel requis');
        }
        
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isPasswordValid) {
            throw ApiError.unauthorized('Mot de passe actuel incorrect');
        }
        
        user.password = await bcrypt.hash(newPassword, 10);
    }
    
    user.updatedAt = new Date().toISOString();
    
    logger.info('Profil mis à jour', { userId: user.id });
    
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
        },
        message: 'Profil mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Changer le mot de passe
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = users.get(req.user.userId);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    // Vérifier le mot de passe actuel
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
        throw ApiError.unauthorized('Mot de passe actuel incorrect');
    }
    
    // Mettre à jour le mot de passe
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    
    // Invalider tous les refresh tokens de l'utilisateur
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === user.id) {
            refreshTokens.delete(token);
        }
    }
    
    logger.info('Mot de passe changé', { userId: user.id });
    
    res.status(200).json({
        success: true,
        message: 'Mot de passe changé avec succès',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Lister tous les utilisateurs (admin seulement)
 */
const listUsers = asyncHandler(async (req, res) => {
    const userList = Array.from(users.values()).map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        organizationId: u.organizationId,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
    }));
    
    res.status(200).json({
        success: true,
        data: userList,
        count: userList.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir un utilisateur par ID (admin seulement)
 */
const getUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = users.get(id);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        },
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le rôle d'un utilisateur (admin seulement)
 */
const updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    
    const user = users.get(id);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    const validRoles = ['admin', 'operator', 'analyst', 'viewer'];
    if (!validRoles.includes(role)) {
        throw ApiError.badRequest('Rôle invalide');
    }
    
    user.role = role;
    user.updatedAt = new Date().toISOString();
    
    logger.info('Rôle utilisateur mis à jour', { userId: id, newRole: role });
    
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            role: user.role,
        },
        message: 'Rôle mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Supprimer un utilisateur (admin seulement)
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (id === req.user.userId) {
        throw ApiError.badRequest('Vous ne pouvez pas supprimer votre propre compte');
    }
    
    const user = users.get(id);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    // Supprimer l'utilisateur
    users.delete(id);
    
    // Supprimer tous ses refresh tokens
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === id) {
            refreshTokens.delete(token);
        }
    }
    
    logger.info('Utilisateur supprimé', { userId: id });
    
    res.status(200).json({
        success: true,
        message: 'Utilisateur supprimé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Demander la réinitialisation du mot de passe
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    // Trouver l'utilisateur par email
    let foundUser = null;
    for (const user of users.values()) {
        if (user.email === email) {
            foundUser = user;
            break;
        }
    }
    
    // Toujours retourner succès pour ne pas révéler si l'email existe
    logger.info('Demande de réinitialisation de mot de passe', { email });
    
    if (foundUser) {
        // En production, envoyer un email avec un token
        const resetToken = crypto.randomBytes(32).toString('hex');
        foundUser.resetToken = resetToken;
        foundUser.resetTokenExpiry = Date.now() + 3600000; // 1 heure
    }
    
    res.status(200).json({
        success: true,
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Réinitialiser le mot de passe avec token
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    
    // Trouver l'utilisateur par token
    let foundUser = null;
    for (const user of users.values()) {
        if (user.resetToken === token && user.resetTokenExpiry > Date.now()) {
            foundUser = user;
            break;
        }
    }
    
    if (!foundUser) {
        throw ApiError.badRequest('Token invalide ou expiré');
    }
    
    // Mettre à jour le mot de passe
    foundUser.password = await bcrypt.hash(password, 10);
    foundUser.resetToken = null;
    foundUser.resetTokenExpiry = null;
    foundUser.updatedAt = new Date().toISOString();
    
    logger.info('Mot de passe réinitialisé', { userId: foundUser.id });
    
    res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Mettre à jour le statut d'un utilisateur (admin seulement)
 */
const updateUserStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    const user = users.get(id);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (!validStatuses.includes(status)) {
        throw ApiError.badRequest('Statut invalide');
    }
    
    user.status = status;
    user.updatedAt = new Date().toISOString();
    
    logger.info('Statut utilisateur mis à jour', { userId: id, newStatus: status });
    
    res.status(200).json({
        success: true,
        data: {
            id: user.id,
            username: user.username,
            status: user.status,
        },
        message: 'Statut mis à jour',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Réinitialiser le mot de passe d'un utilisateur (admin seulement)
 */
const adminResetPassword = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    const user = users.get(id);
    
    if (!user) {
        throw ApiError.notFound('Utilisateur non trouvé');
    }
    
    user.password = await bcrypt.hash(newPassword, 10);
    user.updatedAt = new Date().toISOString();
    
    // Invalider tous les refresh tokens
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === id) {
            refreshTokens.delete(token);
        }
    }
    
    logger.info('Mot de passe réinitialisé par admin', { userId: id, adminId: req.user.userId });
    
    res.status(200).json({
        success: true,
        message: 'Mot de passe réinitialisé',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Obtenir les sessions actives de l'utilisateur
 */
const getSessions = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const sessions = [];
    
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === userId) {
            sessions.push({
                id: token.substring(0, 8) + '...',
                createdAt: data.createdAt,
                expiresAt: data.expiresAt,
            });
        }
    }
    
    res.status(200).json({
        success: true,
        data: sessions,
        count: sessions.length,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Révoquer une session spécifique
 */
const revokeSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    
    let revoked = false;
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === userId && token.startsWith(sessionId.replace('...', ''))) {
            refreshTokens.delete(token);
            revoked = true;
            break;
        }
    }
    
    if (!revoked) {
        throw ApiError.notFound('Session non trouvée');
    }
    
    logger.info('Session révoquée', { userId, sessionId });
    
    res.status(200).json({
        success: true,
        message: 'Session révoquée',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Révoquer toutes les sessions de l'utilisateur
 */
const revokeAllSessions = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    let count = 0;
    
    for (const [token, data] of refreshTokens.entries()) {
        if (data.userId === userId) {
            refreshTokens.delete(token);
            count++;
        }
    }
    
    logger.info('Toutes les sessions révoquées', { userId, count });
    
    res.status(200).json({
        success: true,
        message: `${count} session(s) révoquée(s)`,
        timestamp: new Date().toISOString(),
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    getProfile,
    updateProfile,
    changePassword,
    getSessions,
    revokeSession,
    revokeAllSessions,
    listUsers,
    getUser,
    updateUserRole,
    updateUserStatus,
    adminResetPassword,
    deleteUser,
};
