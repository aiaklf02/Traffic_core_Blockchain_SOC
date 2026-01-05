/**
 * ============================================================================
 * Express Application - Smart City Traffic Management System
 * ============================================================================
 * Configuration de l'application Express avec middleware et routes
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware');
const { logger, morganStream } = require('./utils/logger');
const config = require('./config');

// ============================================================================
// Create Express App
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
    origin: config.corsConfig.origin,
    credentials: config.corsConfig.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: config.rateLimitConfig.windowMs,
    max: config.rateLimitConfig.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.',
    },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

// ============================================================================
// Body Parsing Middleware
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Compression
// ============================================================================

app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: 6,
}));

// ============================================================================
// Logging
// ============================================================================

// Morgan HTTP request logging
if (config.serverConfig.nodeEnv !== 'test') {
    app.use(morgan('combined', { stream: morganStream }));
}

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    next();
});

// ============================================================================
// Swagger Documentation
// ============================================================================

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Smart City Traffic Management API',
            version: '1.0.0',
            description: 'API pour la gestion du trafic urbain intelligent basée sur Hyperledger Fabric',
            contact: {
                name: 'Traffic Core Team',
                email: 'support@traffic-core.io',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: `http://localhost:${config.serverConfig.port}/api/v1`,
                description: 'Development server',
            },
            {
                url: 'https://api.traffic-core.io/api/v1',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                        code: { type: 'string' },
                    },
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        data: { type: 'object' },
                        message: { type: 'string' },
                    },
                },
                Road: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['highway', 'arterial', 'collector', 'local'] },
                        status: { type: 'string', enum: ['open', 'closed', 'maintenance', 'congested'] },
                        speedLimit: { type: 'integer' },
                        lanes: { type: 'integer' },
                    },
                },
                Sensor: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        type: { type: 'string', enum: ['traffic', 'speed', 'air_quality', 'weather'] },
                        status: { type: 'string', enum: ['active', 'inactive', 'maintenance', 'error'] },
                        location: {
                            type: 'object',
                            properties: {
                                latitude: { type: 'number' },
                                longitude: { type: 'number' },
                            },
                        },
                    },
                },
                Vehicle: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        licensePlate: { type: 'string' },
                        make: { type: 'string' },
                        model: { type: 'string' },
                        year: { type: 'integer' },
                        type: { type: 'string', enum: ['car', 'motorcycle', 'truck', 'bus'] },
                    },
                },
            },
        },
        security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Traffic Core API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/v1', routes);

// ============================================================================
// Root Endpoint
// ============================================================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Smart City Traffic Management System',
        version: '1.0.0',
        documentation: '/api-docs',
        api: '/api/v1',
        health: '/api/v1/health',
    });
});

// ============================================================================
// Error Handling
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================================
// Graceful Shutdown Handler
// ============================================================================

const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received, starting graceful shutdown...`);
    
    // Close server connections
    // Disconnect from Fabric network
    try {
        const { fabricService } = require('./services/fabric.service');
        if (fabricService && typeof fabricService.disconnect === 'function') {
            await fabricService.disconnect();
            logger.info('Fabric connection closed');
        }
    } catch (error) {
        logger.error('Error disconnecting from Fabric:', error);
    }
    
    process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = app;
