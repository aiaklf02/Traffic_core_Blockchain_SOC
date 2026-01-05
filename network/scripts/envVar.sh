#!/bin/bash
# ============================================================================
# Environment Variables - Variables d'environnement pour le réseau
# Smart City Traffic Management System
# ============================================================================

# Couleurs pour les logs
export C_RESET='\033[0m'
export C_RED='\033[0;31m'
export C_GREEN='\033[0;32m'
export C_BLUE='\033[0;34m'
export C_YELLOW='\033[1;33m'

# Chemins de base
export NETWORK_HOME="${PWD}"
export FABRIC_CFG_PATH="/configtx"
export CHANNEL_ARTIFACTS="${NETWORK_HOME}/channel-artifacts"
export ORGANIZATIONS="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations"
export CHAINCODE_PATH="${NETWORK_HOME}/../chaincode"

# Configuration du channel
export CHANNEL_NAME="traffic-channel"
export ORDERER_CA="${ORGANIZATIONS}/ordererOrganizations/traffic-network.com/tlsca/tlsca.traffic-network.com-cert.pem"

# Délais et timeouts
export MAX_RETRY=5
export CLI_DELAY=3
export VERBOSE=false

# Version des chaincodes
export CC_VERSION="1.0"
export CC_SEQUENCE="1"

# ============================================================================
# Fonctions pour définir les variables d'environnement par organisation
# ============================================================================


# Org1 (TrafficAuthority)
setGlobalsForOrg1() {
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE="${ORGANIZATIONS}/peerOrganizations/org1.traffic-network.com/peers/peer0.org1.traffic-network.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${ORGANIZATIONS}/peerOrganizations/org1.traffic-network.com/users/Admin@org1.traffic-network.com/msp"
    export CORE_PEER_ADDRESS=peer0.org1.traffic-network.com:7051
}

setGlobalsForPeer0Org1() {
    setGlobalsForOrg1
    export CORE_PEER_ADDRESS=peer0.org1.traffic-network.com:7051
}

setGlobalsForPeer1Org1() {
    setGlobalsForOrg1
    export CORE_PEER_ADDRESS=peer1.org1.traffic-network.com:7061
}

# Org2 (MobilityServices)
setGlobalsForOrg2() {
    export CORE_PEER_LOCALMSPID="Org2MSP"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE="${ORGANIZATIONS}/peerOrganizations/org2.traffic-network.com/peers/peer0.org2.traffic-network.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${ORGANIZATIONS}/peerOrganizations/org2.traffic-network.com/users/Admin@org2.traffic-network.com/msp"
    export CORE_PEER_ADDRESS=peer0.org2.traffic-network.com:8051
}

setGlobalsForPeer0Org2() {
    setGlobalsForOrg2
    export CORE_PEER_ADDRESS=peer0.org2.traffic-network.com:8051
}

setGlobalsForPeer1Org2() {
    setGlobalsForOrg2
    export CORE_PEER_ADDRESS=peer1.org2.traffic-network.com:8061
}

# Org3 (SensorNetwork)
setGlobalsForOrg3() {
    export CORE_PEER_LOCALMSPID="Org3MSP"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_TLS_ROOTCERT_FILE="${ORGANIZATIONS}/peerOrganizations/org3.traffic-network.com/peers/peer0.org3.traffic-network.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${ORGANIZATIONS}/peerOrganizations/org3.traffic-network.com/users/Admin@org3.traffic-network.com/msp"
    export CORE_PEER_ADDRESS=peer0.org3.traffic-network.com:9051
}

setGlobalsForPeer0Org3() {
    setGlobalsForOrg3
    export CORE_PEER_ADDRESS=peer0.org3.traffic-network.com:9051
}

setGlobalsForPeer1Org3() {
    setGlobalsForOrg3
    export CORE_PEER_ADDRESS=peer1.org3.traffic-network.com:9061
}

# ============================================================================
# Fonction générique pour définir les variables selon l'organisation
# ============================================================================

setGlobals() {
    local ORG=$1
    local PEER=$2

    case $ORG in
        1|org1|trafficauthority)
            if [ "$PEER" == "1" ]; then
                setGlobalsForPeer1Org1
            else
                setGlobalsForPeer0Org1
            fi
            ;;
        2|org2|mobilityservices)
            if [ "$PEER" == "1" ]; then
                setGlobalsForPeer1Org2
            else
                setGlobalsForPeer0Org2
            fi
            ;;
        3|org3|sensornetwork)
            if [ "$PEER" == "1" ]; then
                setGlobalsForPeer1Org3
            else
                setGlobalsForPeer0Org3
            fi
            ;;
        *)
            echo -e "${C_RED}Erreur: Organisation inconnue: $ORG${C_RESET}"
            exit 1
            ;;
    esac
}

# ============================================================================
# Variables pour les orderers
# ============================================================================

export ORDERER1_ADDRESS=localhost:7050
export ORDERER2_ADDRESS=localhost:8050
export ORDERER3_ADDRESS=localhost:9050

export ORDERER1_CA="${ORGANIZATIONS}/ordererOrganizations/traffic-network.com/tlsca/tlsca.traffic-network.com-cert.pem"
export ORDERER2_CA="${ORGANIZATIONS}/ordererOrganizations/traffic-network.com/tlsca/tlsca.traffic-network.com-cert.pem"
export ORDERER3_CA="${ORGANIZATIONS}/ordererOrganizations/traffic-network.com/tlsca/tlsca.traffic-network.com-cert.pem"

# ============================================================================
# Variables TLS des peers
# ============================================================================

export PEER0_ORG1_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org1.traffic-network.com/peers/peer0.org1.traffic-network.com/tls/ca.crt"
export PEER1_ORG1_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org1.traffic-network.com/peers/peer1.org1.traffic-network.com/tls/ca.crt"
export PEER0_ORG2_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org2.traffic-network.com/peers/peer0.org2.traffic-network.com/tls/ca.crt"
export PEER1_ORG2_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org2.traffic-network.com/peers/peer1.org2.traffic-network.com/tls/ca.crt"
export PEER0_ORG3_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org3.traffic-network.com/peers/peer0.org3.traffic-network.com/tls/ca.crt"
export PEER1_ORG3_TLS_ROOTCERT="${ORGANIZATIONS}/peerOrganizations/org3.traffic-network.com/peers/peer1.org3.traffic-network.com/tls/ca.crt"

# ============================================================================
# Afficher la configuration actuelle
# ============================================================================

printEnv() {
    echo -e "${C_BLUE}============================================${C_RESET}"
    echo -e "${C_BLUE}Configuration actuelle:${C_RESET}"
    echo -e "${C_BLUE}============================================${C_RESET}"
    echo -e "NETWORK_HOME: ${NETWORK_HOME}"
    echo -e "CHANNEL_NAME: ${CHANNEL_NAME}"
    echo -e "CORE_PEER_LOCALMSPID: ${CORE_PEER_LOCALMSPID}"
    echo -e "CORE_PEER_ADDRESS: ${CORE_PEER_ADDRESS}"
    echo -e "${C_BLUE}============================================${C_RESET}"
}
