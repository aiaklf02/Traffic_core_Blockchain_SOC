/**
 * ============================================================================
 * Routes Authentication - Smart City Traffic Management System
 * ============================================================================
 * Routes API pour l'authentification et la gestion des utilisateurs
 * ============================================================================
 */

const express = require('express');
const { body } = require('express-validator');
const { authController } = require('../controllers');
const { authenticate, authorize, UserRole } = require('../middleware');

const router = express.Router();

// ============================================================================
// Validateurs
// ============================================================================

const registerValidation = [
    body('username')
        .notEmpty().withMessage('Nom d\'utilisateur requis')
        .isLength({ min: 3, max: 30 }).withMessage('Nom d\'utilisateur: 3-30 caractères')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Caractères alphanumériques et underscore uniquement'),
    body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mot de passe: majuscule, minuscule et chiffre requis'),
    body('firstName')
        .notEmpty().withMessage('Prénom requis')
        .trim(),
    body('lastName')
        .notEmpty().withMessage('Nom requis')
        .trim(),
    body('organization')
        .optional()
        .isIn(['TrafficAuthority', 'MobilityServices', 'SensorNetwork']).withMessage('Organisation invalide'),
];

const loginValidation = [
    body('email')
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Mot de passe requis'),
];

const updateProfileValidation = [
    body('firstName')
        .optional()
        .notEmpty().withMessage('Prénom invalide')
        .trim(),
    body('lastName')
        .optional()
        .notEmpty().withMessage('Nom invalide')
        .trim(),
    body('email')
        .optional()
        .isEmail().withMessage('Email invalide')
        .normalizeEmail(),
];

const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Mot de passe actuel requis'),
    body('newPassword')
        .isLength({ min: 8 }).withMessage('Nouveau mot de passe: minimum 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mot de passe: majuscule, minuscule et chiffre requis'),
    body('confirmPassword')
        .custom((value, { req }) => value === req.body.newPassword).withMessage('Les mots de passe ne correspondent pas'),
];

const updateRoleValidation = [
    body('role')
        .isIn(['admin', 'operator', 'analyst', 'viewer']).withMessage('Rôle invalide'),
];

// ============================================================================
// Routes - Public
// ============================================================================

/**
 * @route POST /api/v1/auth/register
 * @desc Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post(
    '/register',
    registerValidation,
    authController.register
);

/**
 * @route POST /api/v1/auth/login
 * @desc Connexion d'un utilisateur
 * @access Public
 */
router.post(
    '/login',
    loginValidation,
    authController.login
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Rafraîchir le token d'accès
 * @access Public (avec refresh token)
 */
router.post(
    '/refresh',
    body('refreshToken').notEmpty().withMessage('Refresh token requis'),
    authController.refreshToken
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @desc Demander la réinitialisation du mot de passe
 * @access Public
 */
router.post(
    '/forgot-password',
    body('email').isEmail().withMessage('Email invalide'),
    authController.forgotPassword
);

/**
 * @route POST /api/v1/auth/reset-password
 * @desc Réinitialiser le mot de passe
 * @access Public (avec token de réinitialisation)
 */
router.post(
    '/reset-password',
    body('token').notEmpty().withMessage('Token requis'),
    body('password')
        .isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mot de passe: majuscule, minuscule et chiffre requis'),
    authController.resetPassword
);

// ============================================================================
// Routes - Authenticated
// ============================================================================

/**
 * @route POST /api/v1/auth/logout
 * @desc Déconnexion de l'utilisateur
 * @access Authenticated
 */
router.post(
    '/logout',
    authenticate,
    authController.logout
);

/**
 * @route GET /api/v1/auth/me
 * @desc Obtenir le profil de l'utilisateur connecté
 * @access Authenticated
 */
router.get(
    '/me',
    authenticate,
    authController.getProfile
);

/**
 * @route PATCH /api/v1/auth/me
 * @desc Mettre à jour le profil de l'utilisateur connecté
 * @access Authenticated
 */
router.patch(
    '/me',
    authenticate,
    updateProfileValidation,
    authController.updateProfile
);

/**
 * @route PATCH /api/v1/auth/change-password
 * @desc Changer le mot de passe
 * @access Authenticated
 */
router.patch(
    '/change-password',
    authenticate,
    changePasswordValidation,
    authController.changePassword
);

/**
 * @route GET /api/v1/auth/sessions
 * @desc Obtenir les sessions actives de l'utilisateur
 * @access Authenticated
 */
router.get(
    '/sessions',
    authenticate,
    authController.getSessions
);

/**
 * @route DELETE /api/v1/auth/sessions/:sessionId
 * @desc Révoquer une session spécifique
 * @access Authenticated
 */
router.delete(
    '/sessions/:sessionId',
    authenticate,
    authController.revokeSession
);

/**
 * @route DELETE /api/v1/auth/sessions
 * @desc Révoquer toutes les sessions (sauf celle en cours)
 * @access Authenticated
 */
router.delete(
    '/sessions',
    authenticate,
    authController.revokeAllSessions
);

// ============================================================================
// Routes - Admin
// ============================================================================

/**
 * @route GET /api/v1/auth/users
 * @desc Obtenir la liste des utilisateurs
 * @access Admin
 */
router.get(
    '/users',
    authenticate,
    authorize(UserRole.ADMIN),
    authController.listUsers
);

/**
 * @route GET /api/v1/auth/users/:id
 * @desc Obtenir un utilisateur par ID
 * @access Admin
 */
router.get(
    '/users/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    authController.getUser
);

/**
 * @route PATCH /api/v1/auth/users/:id/role
 * @desc Mettre à jour le rôle d'un utilisateur
 * @access Admin
 */
router.patch(
    '/users/:id/role',
    authenticate,
    authorize(UserRole.ADMIN),
    updateRoleValidation,
    authController.updateUserRole
);

/**
 * @route PATCH /api/v1/auth/users/:id/status
 * @desc Activer/Désactiver un utilisateur
 * @access Admin
 */
router.patch(
    '/users/:id/status',
    authenticate,
    authorize(UserRole.ADMIN),
    body('isActive').isBoolean().withMessage('Statut invalide'),
    authController.updateUserStatus
);

/**
 * @route DELETE /api/v1/auth/users/:id
 * @desc Supprimer un utilisateur
 * @access Admin
 */
router.delete(
    '/users/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    authController.deleteUser
);

/**
 * @route POST /api/v1/auth/users/:id/reset-password
 * @desc Forcer la réinitialisation du mot de passe d'un utilisateur
 * @access Admin
 */
router.post(
    '/users/:id/reset-password',
    authenticate,
    authorize(UserRole.ADMIN),
    authController.adminResetPassword
);

module.exports = router;
