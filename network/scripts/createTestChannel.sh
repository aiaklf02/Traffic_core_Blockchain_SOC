#!/bin/bash

# ============================================================================
# Create Isolated Test Channel for Consensus Testing
# ============================================================================
# This script creates a separate channel "consensus-test-channel" that is
# completely isolated from the main "traffic-channel" for performance testing.
# ============================================================================

set -e

CHANNEL_NAME="consensus-test-channel"
PROFILE="ConsensusTestChannel"
DELAY=3
MAX_RETRY=5
VERBOSE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

println() {
    echo -e "${GREEN}[TEST-CHANNEL]${NC} $1"
}

errorln() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warnln() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Import environment variables
. scripts/envVar.sh

# ============================================================================
# Create Channel Genesis Block
# ============================================================================
createChannelGenesisBlock() {
    println "Creating genesis block for ${CYAN}${CHANNEL_NAME}${NC}..."
    
    set -x
    configtxgen -profile ${PROFILE} \
        -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block \
        -channelID ${CHANNEL_NAME} \
        -configPath ./configtx
    res=$?
    { set +x; } 2>/dev/null
    
    if [ $res -ne 0 ]; then
        errorln "Failed to generate channel genesis block"
        exit 1
    fi
    
    println "Genesis block created: ${CYAN}./channel-artifacts/${CHANNEL_NAME}.block${NC}"
}

# ============================================================================
# Create Channel
# ============================================================================
createChannel() {
    setGlobals 1
    
    println "Creating channel ${CYAN}${CHANNEL_NAME}${NC}..."
    
    local rc=1
    local COUNTER=1
    
    while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
        sleep $DELAY
        set -x
        osnadmin channel join \
            --channelID ${CHANNEL_NAME} \
            --config-block ./channel-artifacts/${CHANNEL_NAME}.block \
            -o localhost:7053 \
            --ca-file "${ORDERER_CA}" \
            --client-cert "${ORDERER_ADMIN_TLS_SIGN_CERT}" \
            --client-key "${ORDERER_ADMIN_TLS_PRIVATE_KEY}"
        res=$?
        { set +x; } 2>/dev/null
        
        let rc=$res
        COUNTER=$(expr $COUNTER + 1)
    done
    
    if [ $res -ne 0 ]; then
        errorln "Channel creation failed after $MAX_RETRY attempts"
        exit 1
    fi
    
    println "Channel ${CYAN}${CHANNEL_NAME}${NC} created successfully!"
}

# ============================================================================
# Join Peers to Channel
# ============================================================================
joinChannel() {
    FABRIC_CFG_PATH=$PWD/peercfg/
    
    # Join all 6 peers (2 per org, 3 orgs)
    for org in 1 2 3; do
        for peer in 0 1; do
            println "Joining ${CYAN}peer${peer}.org${org}${NC} to ${CHANNEL_NAME}..."
            
            setGlobals $org $peer
            
            local rc=1
            local COUNTER=1
            
            while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ]; do
                sleep $DELAY
                set -x
                peer channel join -b ./channel-artifacts/${CHANNEL_NAME}.block
                res=$?
                { set +x; } 2>/dev/null
                
                let rc=$res
                COUNTER=$(expr $COUNTER + 1)
            done
            
            if [ $res -ne 0 ]; then
                errorln "peer${peer}.org${org} failed to join channel"
                exit 1
            fi
            
            println "peer${peer}.org${org} joined ${CYAN}${CHANNEL_NAME}${NC} ✓"
        done
    done
}

# ============================================================================
# Set Anchor Peers
# ============================================================================
setAnchorPeers() {
    println "Setting anchor peers for all organizations..."
    
    for org in 1 2 3; do
        println "Setting anchor peer for ${CYAN}Org${org}${NC}..."
        
        setGlobals $org
        
        # Fetch config, update anchor peer, submit update
        peer channel fetch config config_block.pb \
            -o localhost:7050 \
            -c ${CHANNEL_NAME} \
            --tls --cafile "${ORDERER_CA}"
        
        configtxlator proto_decode --input config_block.pb --type common.Block \
            | jq '.data.data[0].payload.data.config' > config.json
        
        # Add anchor peer
        jq '.channel_group.groups.Application.groups.Org'${org}'MSP.values += {
            "AnchorPeers": {
                "mod_policy": "Admins",
                "value": {
                    "anchor_peers": [{
                        "host": "peer0.org'${org}'.traffic-network.com",
                        "port": '$((7051 + (org-1)*1000))'
                    }]
                },
                "version": "0"
            }
        }' config.json > modified_config.json
        
        configtxlator proto_encode --input config.json --type common.Config --output config.pb
        configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb
        configtxlator compute_update --channel_id ${CHANNEL_NAME} --original config.pb --updated modified_config.pb --output config_update.pb
        configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json
        
        echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL_NAME}'","type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' \
            | jq . > config_update_in_envelope.json
        
        configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb
        
        peer channel update -f config_update_in_envelope.pb \
            -c ${CHANNEL_NAME} \
            -o localhost:7050 \
            --tls --cafile "${ORDERER_CA}"
        
        println "Anchor peer set for ${CYAN}Org${org}${NC} ✓"
        
        # Cleanup
        rm -f config_block.pb config.json modified_config.json config.pb modified_config.pb \
            config_update.pb config_update.json config_update_in_envelope.json config_update_in_envelope.pb
    done
}

# ============================================================================
# Main
# ============================================================================
main() {
    println "============================================"
    println "  Creating Isolated Test Channel"
    println "  Channel: ${CYAN}${CHANNEL_NAME}${NC}"
    println "  Profile: ${CYAN}${PROFILE}${NC}"
    println "============================================"
    
    # Create channel artifacts directory
    mkdir -p ./channel-artifacts
    
    # Step 1: Create genesis block
    createChannelGenesisBlock
    
    # Step 2: Create channel
    createChannel
    
    # Step 3: Join all peers
    joinChannel
    
    # Step 4: Set anchor peers
    # setAnchorPeers  # Optional - can be skipped for test channel
    
    println "============================================"
    println "  ${GREEN}Test Channel Created Successfully!${NC}"
    println "============================================"
    println ""
    println "Channel: ${CYAN}${CHANNEL_NAME}${NC}"
    println "Peers joined: ${CYAN}6 peers (2 per org × 3 orgs)${NC}"
    println ""
    println "Next: Deploy chaincodes with:"
    println "  ${CYAN}./scripts/deployTestChaincode.sh${NC}"
}

main
