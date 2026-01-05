#!/bin/bash

# ============================================================================
# Deploy Chaincodes to Test Channel
# ============================================================================
# Deploys road-manager chaincode to the isolated test channel
# for consensus performance testing
# ============================================================================

set -e

CHANNEL_NAME="consensus-test-channel"
CC_NAME="test-road-manager"
CC_SRC_PATH="../chaincode/road-manager"
CC_VERSION="1.0"
CC_SEQUENCE=1
DELAY=3
MAX_RETRY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

println() {
    echo -e "${GREEN}[DEPLOY-TEST]${NC} $1"
}

errorln() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Import environment
. scripts/envVar.sh

FABRIC_CFG_PATH=$PWD/peercfg/

# ============================================================================
# Package Chaincode
# ============================================================================
packageChaincode() {
    println "Packaging chaincode ${CYAN}${CC_NAME}${NC}..."
    
    set -x
    peer lifecycle chaincode package ${CC_NAME}.tar.gz \
        --path ${CC_SRC_PATH} \
        --lang golang \
        --label ${CC_NAME}_${CC_VERSION}
    res=$?
    { set +x; } 2>/dev/null
    
    if [ $res -ne 0 ]; then
        errorln "Chaincode packaging failed"
        exit 1
    fi
    
    println "Chaincode packaged: ${CYAN}${CC_NAME}.tar.gz${NC}"
}

# ============================================================================
# Install Chaincode on All Peers
# ============================================================================
installChaincode() {
    println "Installing chaincode on all 6 peers..."
    
    for org in 1 2 3; do
        for peer in 0 1; do
            println "Installing on ${CYAN}peer${peer}.org${org}${NC}..."
            
            setGlobals $org $peer
            
            set -x
            peer lifecycle chaincode install ${CC_NAME}.tar.gz
            res=$?
            { set +x; } 2>/dev/null
            
            if [ $res -ne 0 ]; then
                errorln "Chaincode install failed on peer${peer}.org${org}"
                exit 1
            fi
            
            println "Installed on peer${peer}.org${org} ✓"
        done
    done
}

# ============================================================================
# Approve Chaincode for All Orgs
# ============================================================================
approveChaincode() {
    println "Approving chaincode for all organizations..."
    
    # Get package ID
    setGlobals 1
    
    PACKAGE_ID=$(peer lifecycle chaincode queryinstalled | grep "${CC_NAME}_${CC_VERSION}" | awk -F "[, ]+" '{print $3}')
    
    if [ -z "$PACKAGE_ID" ]; then
        errorln "Package ID not found"
        exit 1
    fi
    
    println "Package ID: ${CYAN}${PACKAGE_ID}${NC}"
    
    for org in 1 2 3; do
        println "Approving for ${CYAN}Org${org}${NC}..."
        
        setGlobals $org
        
        set -x
        peer lifecycle chaincode approveformyorg \
            -o localhost:7050 \
            --ordererTLSHostnameOverride orderer1.traffic-network.com \
            --tls --cafile "${ORDERER_CA}" \
            --channelID ${CHANNEL_NAME} \
            --name ${CC_NAME} \
            --version ${CC_VERSION} \
            --package-id ${PACKAGE_ID} \
            --sequence ${CC_SEQUENCE}
        res=$?
        { set +x; } 2>/dev/null
        
        if [ $res -ne 0 ]; then
            errorln "Chaincode approval failed for Org${org}"
            exit 1
        fi
        
        println "Approved for Org${org} ✓"
        sleep $DELAY
    done
}

# ============================================================================
# Commit Chaincode
# ============================================================================
commitChaincode() {
    println "Committing chaincode to channel..."
    
    setGlobals 1
    
    set -x
    peer lifecycle chaincode commit \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer1.traffic-network.com \
        --tls --cafile "${ORDERER_CA}" \
        --channelID ${CHANNEL_NAME} \
        --name ${CC_NAME} \
        --version ${CC_VERSION} \
        --sequence ${CC_SEQUENCE} \
        --peerAddresses localhost:7051 --tlsRootCertFiles "${PEER0_ORG1_CA}" \
        --peerAddresses localhost:8051 --tlsRootCertFiles "${PEER0_ORG2_CA}" \
        --peerAddresses localhost:9051 --tlsRootCertFiles "${PEER0_ORG3_CA}"
    res=$?
    { set +x; } 2>/dev/null
    
    if [ $res -ne 0 ]; then
        errorln "Chaincode commit failed"
        exit 1
    fi
    
    println "Chaincode committed ✓"
}

# ============================================================================
# Verify Deployment
# ============================================================================
verifyDeployment() {
    println "Verifying deployment..."
    
    setGlobals 1
    
    peer lifecycle chaincode querycommitted --channelID ${CHANNEL_NAME} --name ${CC_NAME}
    
    println "Deployment verified ✓"
}

# ============================================================================
# Main
# ============================================================================
main() {
    println "============================================"
    println "  Deploying to Test Channel"
    println "  Channel: ${CYAN}${CHANNEL_NAME}${NC}"
    println "  Chaincode: ${CYAN}${CC_NAME}${NC}"
    println "============================================"
    
    packageChaincode
    installChaincode
    approveChaincode
    commitChaincode
    verifyDeployment
    
    println "============================================"
    println "  ${GREEN}Chaincode Deployed Successfully!${NC}"
    println "============================================"
    println ""
    println "Test channel is ready for consensus testing"
    println "Chaincode: ${CYAN}${CC_NAME}${NC}"
    println "Channel: ${CYAN}${CHANNEL_NAME}${NC}"
    
    # Cleanup
    rm -f ${CC_NAME}.tar.gz
}

main
