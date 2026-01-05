/**
 * ============================================================================
 * Consensus Test Routes - Isolated Test Channel
 * ============================================================================
 * Routes for consensus testing on the isolated test channel
 * ============================================================================
 */

const express = require('express');
const {
    getTestNetworkStatus,
    runPBFTTest,
    runPoATest,
    runComparisonTest,
} = require('../controllers/consensus-test.controller');

const router = express.Router();

/**
 * @route GET /api/v1/consensus-test/status
 * @desc Get test network status
 * @access Public (for testing)
 */
router.get('/status', getTestNetworkStatus);

/**
 * @route POST /api/v1/consensus-test/pbft
 * @desc Run PBFT-like consensus test on isolated channel
 * @access Public (for testing)
 */
router.post('/pbft', runPBFTTest);

/**
 * @route POST /api/v1/consensus-test/poa
 * @desc Run PoA-like consensus test on isolated channel
 * @access Public (for testing)
 */
router.post('/poa', runPoATest);

/**
 * @route POST /api/v1/consensus-test/compare
 * @desc Run comparison test (both mechanisms) on isolated channel
 * @access Public (for testing)
 */
router.post('/compare', runComparisonTest);

module.exports = router;
