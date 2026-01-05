/**
 * Routes Index - Smart City Traffic Management System
 */

const express = require('express');
const roadRoutes = require('./road.routes');
const sensorRoutes = require('./sensor.routes');
const registryRoutes = require('./registry.routes');
const authRoutes = require('./auth.routes');
const socRoutes = require('./soc.routes');
const consensusTestRoutes = require('./consensus-test.routes');

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Smart City Traffic Management API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
    });
});

router.get('/health/detailed', async (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: { api: 'healthy', fabric: 'unknown' },
    });
});

// API Routes
router.use('/auth', authRoutes);
router.use('/roads', roadRoutes);
router.use('/sensors', sensorRoutes);
router.use('/registry', registryRoutes);
router.use('/soc', socRoutes);
router.use('/consensus-test', consensusTestRoutes);

// API Info
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Smart City Traffic Management API',
        version: '1.0.0',
        endpoints: {
            health: '/api/v1/health',
            auth: '/api/v1/auth',
            roads: '/api/v1/roads',
            sensors: '/api/v1/sensors',
            registry: '/api/v1/registry',
            soc: '/api/v1/soc',
            docs: '/api-docs',
        },
    });
});

module.exports = router;
