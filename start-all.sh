#!/bin/bash

#############################################
# Traffic Core - Start All Services
# One-click startup script
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_DIR="/home/aya/traffic-core"
LOG_DIR="/tmp/traffic-core-logs"

# Create log directory
mkdir -p $LOG_DIR

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║       🚗 TRAFFIC CORE - SMART CITY BLOCKCHAIN SIMULATOR       ║"
echo "║                    Starting All Services...                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if port is in use
check_port() {
    if lsof -i:$1 > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name is ready${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    echo -e "${RED}✗ $name failed to start${NC}"
    return 1
}

#############################################
# 0. Start Hyperledger Fabric Network
#############################################
echo -e "\n${YELLOW}[0/6] Starting Hyperledger Fabric Network...${NC}"

# Check if Fabric containers are already running
FABRIC_RUNNING=$(docker ps --filter "name=peer0.org1" --format "{{.Names}}" 2>/dev/null || echo "")

if [ -n "$FABRIC_RUNNING" ]; then
    echo -e "${GREEN}✓ Hyperledger Fabric already running${NC}"
else
    echo "  Starting Fabric network..."
    cd $PROJECT_DIR
    
    # Check if network.sh exists and is executable
    if [ -x "$PROJECT_DIR/scripts/network.sh" ]; then
        # Start the network
        $PROJECT_DIR/scripts/network.sh up > $LOG_DIR/fabric.log 2>&1 &
        FABRIC_PID=$!
        
        echo "  Waiting for Fabric containers to start..."
        sleep 15
        
        # Check if peer container is running
        if docker ps --filter "name=peer0.org1" --format "{{.Names}}" | grep -q "peer"; then
            echo -e "${GREEN}✓ Fabric peers started${NC}"
            
            # Deploy chaincodes if not already deployed
            echo "  Checking chaincodes..."
            sleep 5
        else
            echo -e "${YELLOW}⚠ Fabric starting in background (check logs: $LOG_DIR/fabric.log)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Fabric network script not found or not executable${NC}"
        echo "  Running in mock mode (no blockchain)"
    fi
fi

#############################################
# 1. Start LM Studio (Mistral 7B)
#############################################
echo -e "\n${YELLOW}[1/6] Starting LM Studio (Mistral 7B)...${NC}"

if check_port 1234; then
    echo -e "${GREEN}✓ LM Studio already running on port 1234${NC}"
else
    if [ -f "/mnt/newdisk/LMStudio.AppImage" ]; then
        nohup /mnt/newdisk/LMStudio.AppImage > $LOG_DIR/lmstudio.log 2>&1 &
        echo "  Waiting for LM Studio to start..."
        sleep 5
        if check_port 1234; then
            echo -e "${GREEN}✓ LM Studio started${NC}"
        else
            echo -e "${YELLOW}⚠ LM Studio starting in background (check GUI)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ LM Studio not found at /mnt/newdisk/LMStudio.AppImage${NC}"
        echo "  Please start LM Studio manually"
    fi
fi

#############################################
# 2. Start Backend API
#############################################
echo -e "\n${YELLOW}[2/6] Starting Backend API...${NC}"

if check_port 3000; then
    echo -e "${GREEN}✓ Backend already running on port 3000${NC}"
else
    cd $PROJECT_DIR/backend
    # Set FABRIC_CONNECT_ON_STARTUP to automatically connect to blockchain
    FABRIC_CONNECT_ON_STARTUP=true nohup node src/server.js > $LOG_DIR/backend.log 2>&1 &
    BACKEND_PID=$!
    echo "  Backend PID: $BACKEND_PID"
    wait_for_service "http://localhost:3000/api/v1/health" "Backend API"
fi

#############################################
# 3. Start Frontend Dashboard
#############################################
echo -e "\n${YELLOW}[3/6] Starting Frontend Dashboard...${NC}"

if check_port 5173; then
    echo -e "${GREEN}✓ Frontend already running on port 5173${NC}"
else
    cd $PROJECT_DIR/frontend
    nohup npm run dev > $LOG_DIR/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo "  Frontend PID: $FRONTEND_PID"
    sleep 3
    if check_port 5173; then
        echo -e "${GREEN}✓ Frontend started${NC}"
    else
        echo -e "${YELLOW}⚠ Frontend starting...${NC}"
    fi
fi

#############################################
# 4. Initialize Blockchain Data (if Fabric is running)
#############################################
echo -e "\n${YELLOW}[4/6] Initializing Blockchain Data...${NC}"

sleep 2
# Try to initialize the ledger
INIT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/registry/init \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer admin-token" 2>/dev/null || echo '{"success":false}')

if echo "$INIT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Blockchain ledger initialized${NC}"
else
    echo -e "${CYAN}ℹ Ledger already initialized or running in mock mode${NC}"
fi

#############################################
# 5. Activate SOC (Security Operations Center)
#############################################
echo -e "\n${YELLOW}[5/6] Activating SOC...${NC}"

sleep 2
SOC_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/soc/start 2>/dev/null)
if echo "$SOC_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ SOC activated with all agents${NC}"
else
    echo -e "${YELLOW}⚠ SOC activation: $SOC_RESPONSE${NC}"
fi

#############################################
# 6. Verify LLM Integration
#############################################
echo -e "\n${YELLOW}[6/6] Verifying LLM Integration...${NC}"

LLM_CHECK=$(curl -s http://localhost:1234/v1/models 2>/dev/null)
if echo "$LLM_CHECK" | grep -q "mistral"; then
    echo -e "${GREEN}✓ Mistral 7B Instruct ready${NC}"
    
    # Configure LLM in SOC
    curl -s -X POST http://localhost:3000/api/v1/soc/llm/config \
        -H "Content-Type: application/json" \
        -d '{"enabled": true, "baseUrl": "http://localhost:1234/v1", "model": "mistral-7b-instruct-v0.2"}' > /dev/null 2>&1
    echo -e "${GREEN}✓ LLM configured in SOC Analyzer${NC}"
else
    echo -e "${YELLOW}⚠ LM Studio not responding - start it manually and load Mistral 7B${NC}"
fi

#############################################
# Summary
#############################################
echo -e "\n${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 ALL SERVICES STARTED                    ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║  📊 Frontend Dashboard:  http://localhost:5173                ║"
echo "║  🔧 Backend API:         http://localhost:3000                ║"
echo "║  📚 API Docs:            http://localhost:3000/api-docs       ║"
echo "║  🤖 LM Studio:           http://localhost:1234                ║"
echo "║                                                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  Logs: $LOG_DIR                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Quick Test Commands:${NC}"
echo "  # Check SOC status"
echo "  curl http://localhost:3000/api/v1/soc/dashboard | jq ."
echo ""
echo "  # Test LLM threat analysis"
echo '  curl -X POST http://localhost:3000/api/v1/soc/llm/analyze \'
echo '    -H "Content-Type: application/json" \'
echo '    -d '\''{"event": {"type": "ddos", "txRate": 5000}}'\'' | jq .'
echo ""
echo -e "${YELLOW}To stop all services: ./stop-all.sh${NC}"
