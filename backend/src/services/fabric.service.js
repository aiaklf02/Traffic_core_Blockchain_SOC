/**
 * ============================================================================
 * Service Fabric Gateway - Smart City Traffic Management System
 * ============================================================================
 * Gestion de la connexion au réseau Hyperledger Fabric via le Gateway SDK
 * ============================================================================
 */

const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fabricConfig } = require('../config');
const { fabricLogger: logger } = require('../utils/logger');

/**
 * Classe singleton pour gérer la connexion Fabric Gateway
 */
class FabricService {
    constructor() {
        this.gateway = null;
        this.client = null;
        this.contracts = new Map();        // Production contracts cache
        this.testContracts = new Map();    // Test channel contracts cache
        this.isConnected = false;
    }

    /**
     * Créer le client gRPC
     */
    async createGrpcClient() {
        logger.debug('Création du client gRPC...');
        
        const tlsCertPath = fabricConfig.getTlsCertPath();
        const tlsRootCert = fs.readFileSync(tlsCertPath);
        const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);

        return new grpc.Client(
            fabricConfig.peer.endpoint,
            tlsCredentials,
            {
                'grpc.ssl_target_name_override': fabricConfig.peer.hostAlias,
            }
        );
    }

    /**
     * Charger l'identité utilisateur
     */
    async loadIdentity() {
        logger.debug('Chargement de l\'identité utilisateur...');
        
        const certPath = fabricConfig.getCertPath();
        const credentials = fs.readFileSync(certPath);
        
        return {
            mspId: fabricConfig.mspId,
            credentials,
        };
    }

    /**
     * Créer le signer pour les transactions
     */
    async createSigner() {
        logger.debug('Création du signer...');
        
        const keyDirectoryPath = fabricConfig.getKeyDirectoryPath();
        const files = fs.readdirSync(keyDirectoryPath);
        const keyFile = files.find(file => file.endsWith('_sk'));
        
        if (!keyFile) {
            throw new Error(`Clé privée non trouvée dans ${keyDirectoryPath}`);
        }
        
        const keyPath = path.join(keyDirectoryPath, keyFile);
        const privateKeyPem = fs.readFileSync(keyPath);
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        
        return signers.newPrivateKeySigner(privateKey);
    }

    /**
     * Se connecter au réseau Fabric
     */
    async connect() {
        if (this.isConnected) {
            logger.debug('Déjà connecté au réseau Fabric');
            return;
        }

        try {
            logger.info('Connexion au réseau Fabric...');
            
            // Créer le client gRPC
            this.client = await this.createGrpcClient();
            
            // Charger l'identité et le signer
            const identity = await this.loadIdentity();
            const signer = await this.createSigner();

            // Se connecter au gateway
            this.gateway = connect({
                client: this.client,
                identity,
                signer,
                evaluateOptions: () => ({ deadline: Date.now() + fabricConfig.timeouts.query * 1000 }),
                endorseOptions: () => ({ deadline: Date.now() + fabricConfig.timeouts.endorsement * 1000 }),
                submitOptions: () => ({ deadline: Date.now() + fabricConfig.timeouts.commit * 1000 }),
                commitStatusOptions: () => ({ deadline: Date.now() + fabricConfig.timeouts.commit * 1000 }),
            });

            this.isConnected = true;
            logger.info('Connecté au réseau Fabric avec succès', {
                mspId: fabricConfig.mspId,
                peer: fabricConfig.peer.endpoint,
                channel: fabricConfig.channelName,
            });

        } catch (error) {
            logger.error('Erreur de connexion au réseau Fabric', error);
            throw error;
        }
    }

    /**
     * Obtenir un contrat par son nom
     */
    getContract(chaincodeName) {
        if (!this.isConnected || !this.gateway) {
            throw new Error('Non connecté au réseau Fabric. Appelez connect() d\'abord.');
        }

        // Vérifier le cache
        if (this.contracts.has(chaincodeName)) {
            return this.contracts.get(chaincodeName);
        }

        // Obtenir le réseau et le contrat
        const network = this.gateway.getNetwork(fabricConfig.channelName);
        const contract = network.getContract(chaincodeName);

        // Mettre en cache
        this.contracts.set(chaincodeName, contract);
        
        logger.debug(`Contrat ${chaincodeName} obtenu`, { channel: fabricConfig.channelName });
        
        return contract;
    }

    /**
     * Obtenir le contrat Road Manager
     */
    getRoadManagerContract() {
        return this.getContract(fabricConfig.chaincodes.roadManager);
    }

    /**
     * Obtenir le contrat Sensor Data
     */
    getSensorDataContract() {
        return this.getContract(fabricConfig.chaincodes.sensorData);
    }

    /**
     * Obtenir le contrat Traffic Registry
     */
    getTrafficRegistryContract() {
        return this.getContract(fabricConfig.chaincodes.trafficRegistry);
    }

    /**
     * Exécuter une transaction de lecture (query)
     */
    async evaluateTransaction(chaincodeName, functionName, ...args) {
        const contract = this.getContract(chaincodeName);
        
        logger.debug(`Évaluation de ${chaincodeName}.${functionName}`, { args });
        
        try {
            const result = await contract.evaluateTransaction(functionName, ...args);
            const resultString = Buffer.from(result).toString('utf8');
            
            logger.debug(`Résultat de ${chaincodeName}.${functionName}`, { 
                resultLength: resultString.length 
            });
            
            return resultString;
        } catch (error) {
            logger.error(`Erreur lors de l'évaluation de ${chaincodeName}.${functionName}`, error);
            throw error;
        }
    }

    /**
     * Exécuter une transaction d'écriture (submit)
     */
    async submitTransaction(chaincodeName, functionName, ...args) {
        const contract = this.getContract(chaincodeName);
        
        logger.info(`Soumission de ${chaincodeName}.${functionName}`, { args });
        
        try {
            const result = await contract.submitTransaction(functionName, ...args);
            const resultString = Buffer.from(result).toString('utf8');
            
            logger.info(`Transaction ${chaincodeName}.${functionName} réussie`);
            
            return resultString;
        } catch (error) {
            logger.error(`Erreur lors de la soumission de ${chaincodeName}.${functionName}`, error);
            throw error;
        }
    }

    /**
     * Se déconnecter du réseau
     */
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            logger.info('Déconnexion du réseau Fabric...');
            
            // Fermer le gateway
            if (this.gateway) {
                this.gateway.close();
                this.gateway = null;
            }

            // Fermer le client gRPC
            if (this.client) {
                this.client.close();
                this.client = null;
            }

            // Vider le cache des contrats
            this.contracts.clear();
            
            this.isConnected = false;
            logger.info('Déconnecté du réseau Fabric');

        } catch (error) {
            logger.error('Erreur lors de la déconnexion', error);
            throw error;
        }
    }

    /**
     * Vérifier l'état de la connexion
     */
    isConnectionActive() {
        return this.isConnected;
    }

    /**
     * Réinitialiser la connexion
     */
    async reconnect() {
        await this.disconnect();
        await this.connect();
    }
}

// Instance singleton
const fabricService = new FabricService();

module.exports = {
    fabricService,
    FabricService,
};
