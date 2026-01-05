/**
 * ============================================================================
 * Server Entry Point - Smart City Traffic Management System
 * ============================================================================
 * Point d'entrée du serveur Express
 * ============================================================================
 */

const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger');
const { fabricService } = require('./services/fabric.service');

// ============================================================================
// Server Configuration
// ============================================================================

const PORT = config.serverConfig.port;
const HOST = config.serverConfig.host;
const NODE_ENV = config.serverConfig.nodeEnv;

// ============================================================================
// Start Server
// ============================================================================

const startServer = async () => {
    try {
        // Log startup information
        logger.info('=========================================');
        logger.info('Smart City Traffic Management System');
        logger.info('=========================================');
        logger.info(`Environment: ${NODE_ENV}`);
        logger.info(`Node Version: ${process.version}`);
        logger.info(`Process ID: ${process.pid}`);
        
        // Connect to Hyperledger Fabric (optional at startup)
        if (process.env.FABRIC_CONNECT_ON_STARTUP === 'true') {
            logger.info('Connecting to Hyperledger Fabric network...');
            try {
                await fabricService.connect();
                logger.info('Successfully connected to Fabric network');
            } catch (fabricError) {
                logger.warn('Failed to connect to Fabric network:', fabricError.message);
                logger.warn('Server will start without Fabric connection');
                logger.warn('Fabric connection can be established later via API');
            }
        } else {
            logger.info('Fabric connection deferred (FABRIC_CONNECT_ON_STARTUP=false)');
        }

        // Start HTTP server
        const server = app.listen(PORT, HOST, () => {
            logger.info('=========================================');
            logger.info(`Server running on http://${HOST}:${PORT}`);
            logger.info(`API Base URL: http://${HOST}:${PORT}/api/v1`);
            logger.info(`API Docs: http://${HOST}:${PORT}/api-docs`);
            logger.info(`Health Check: http://${HOST}:${PORT}/api/v1/health`);
            logger.info('=========================================');
        });

        // Server error handling
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use`);
            } else if (error.code === 'EACCES') {
                logger.error(`Port ${PORT} requires elevated privileges`);
            } else {
                logger.error('Server error:', error);
            }
            process.exit(1);
        });

        // Keep-alive timeout
        server.keepAliveTimeout = 65000; // 65 seconds
        server.headersTimeout = 66000; // 66 seconds

        // Store server reference for graceful shutdown
        app.set('server', server);

        return server;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// ============================================================================
// Execute
// ============================================================================

startServer().catch((error) => {
    logger.error('Startup error:', error);
    process.exit(1);
});
