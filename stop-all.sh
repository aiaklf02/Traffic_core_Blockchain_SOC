#!/bin/bash

#############################################
# Traffic Core - Stop All Services
#############################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="/home/aya/traffic-core"

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            🛑 TRAFFIC CORE - STOPPING ALL SERVICES            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Stop Backend
echo -n "Stopping Backend API... "
pkill -f "node src/server.js" 2>/dev/null && echo -e "${GREEN}stopped${NC}" || echo -e "${YELLOW}not running${NC}"

# Stop Frontend
echo -n "Stopping Frontend... "
pkill -f "vite" 2>/dev/null && echo -e "${GREEN}stopped${NC}" || echo -e "${YELLOW}not running${NC}"

# Stop Simulator
echo -n "Stopping Simulator... "
pkill -f "node src/index.js" 2>/dev/null && echo -e "${GREEN}stopped${NC}" || echo -e "${YELLOW}not running${NC}"

# Stop Hyperledger Fabric (optional - ask user)
echo ""
read -p "Stop Hyperledger Fabric network? (y/N): " stop_fabric
if [[ "$stop_fabric" =~ ^[Yy]$ ]]; then
    echo -n "Stopping Fabric network... "
    if [ -x "$PROJECT_DIR/scripts/network.sh" ]; then
        $PROJECT_DIR/scripts/network.sh down > /dev/null 2>&1
        echo -e "${GREEN}stopped${NC}"
    else
        # Stop Docker containers manually
        docker stop $(docker ps -q --filter "name=peer" --filter "name=orderer" --filter "name=ca_" --filter "name=couchdb") 2>/dev/null
        echo -e "${GREEN}stopped${NC}"
    fi
else
    echo -e "${CYAN}Fabric network left running${NC}"
fi

# Note: LM Studio needs to be closed manually (GUI app)
echo -e "\n${YELLOW}Note: Close LM Studio manually from the GUI${NC}"

echo -e "\n${GREEN}✓ All services stopped.${NC}"
