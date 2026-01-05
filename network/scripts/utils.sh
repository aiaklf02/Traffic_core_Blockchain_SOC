#!/bin/bash
# ============================================================================
# Utils - Fonctions utilitaires pour le réseau
# Smart City Traffic Management System
# ============================================================================

# Charger les variables d'environnement
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/envVar.sh"

# ============================================================================
# Fonctions de logging
# ============================================================================

infoln() {
    echo -e "${C_BLUE}[INFO]${C_RESET} $1"
}

successln() {
    echo -e "${C_GREEN}[SUCCESS]${C_RESET} $1"
}

warnln() {
    echo -e "${C_YELLOW}[WARN]${C_RESET} $1"
}

errorln() {
    echo -e "${C_RED}[ERROR]${C_RESET} $1"
}

fatalln() {
    errorln "$1"
    exit 1
}

# ============================================================================
# Fonctions de vérification
# ============================================================================

# Vérifier si une commande existe
verifyCommand() {
    local cmd=$1
    if ! command -v "$cmd" &> /dev/null; then
        fatalln "La commande '$cmd' n'est pas installée"
    fi
}

# Vérifier les prérequis
verifyPrerequisites() {
    infoln "Vérification des prérequis..."
    
    verifyCommand docker
    verifyCommand docker-compose
    verifyCommand peer
    verifyCommand configtxgen
    verifyCommand cryptogen
    
    # Vérifier que Docker est en cours d'exécution
    if ! docker info &> /dev/null; then
        fatalln "Docker n'est pas en cours d'exécution"
    fi
    
    successln "Tous les prérequis sont satisfaits"
}

# Vérifier le résultat d'une commande
verifyResult() {
    local rc=$1
    local message=$2
    
    if [ $rc -ne 0 ]; then
        fatalln "$message"
    fi
}

# ============================================================================
# Fonctions de gestion des conteneurs
# ============================================================================

# Vérifier si un conteneur est en cours d'exécution
isContainerRunning() {
    local container=$1
    docker ps --format '{{.Names}}' | grep -q "^${container}$"
}

# Attendre qu'un conteneur soit prêt
waitForContainer() {
    local container=$1
    local max_retry=${2:-30}
    local delay=${3:-1}
    local counter=0
    
    infoln "Attente du conteneur $container..."
    
    while ! isContainerRunning "$container"; do
        sleep $delay
        counter=$((counter + 1))
        if [ $counter -ge $max_retry ]; then
            fatalln "Timeout: le conteneur $container n'est pas démarré"
        fi
    done
    
    successln "Le conteneur $container est prêt"
}

# Arrêter et supprimer les conteneurs
cleanContainers() {
    infoln "Nettoyage des conteneurs..."
    
    # Arrêter les conteneurs du réseau traffic
    docker ps -a --format '{{.Names}}' | grep "traffic" | xargs -r docker stop
    docker ps -a --format '{{.Names}}' | grep "traffic" | xargs -r docker rm -f
    
    # Supprimer les volumes
    docker volume ls --format '{{.Name}}' | grep "traffic" | xargs -r docker volume rm -f
    
    # Supprimer les réseaux
    docker network ls --format '{{.Name}}' | grep "traffic" | xargs -r docker network rm 2>/dev/null || true
    
    successln "Conteneurs nettoyés"
}

# Supprimer les images de chaincode
cleanChaincodeImages() {
    infoln "Nettoyage des images de chaincode..."
    
    docker images --format '{{.Repository}}:{{.Tag}}' | grep "dev-peer" | xargs -r docker rmi -f
    
    successln "Images de chaincode nettoyées"
}

# ============================================================================
# Fonctions de gestion des artefacts
# ============================================================================

# Créer le dossier des artefacts du channel
createChannelArtifactsDir() {
    if [ ! -d "${CHANNEL_ARTIFACTS}" ]; then
        mkdir -p "${CHANNEL_ARTIFACTS}"
        infoln "Dossier channel-artifacts créé"
    fi
}

# Nettoyer les artefacts
cleanArtifacts() {
    infoln "Nettoyage des artefacts..."
    
    rm -rf "${CHANNEL_ARTIFACTS}"/*
    rm -rf "${ORGANIZATIONS}/peerOrganizations"
    rm -rf "${ORGANIZATIONS}/ordererOrganizations"
    
    successln "Artefacts nettoyés"
}

# ============================================================================
# Fonctions de gestion du channel
# ============================================================================

# Vérifier si le channel existe
channelExists() {
    local channel_name=$1
    
    setGlobalsForPeer0Org1
    peer channel list 2>&1 | grep -q "^${channel_name}$"
}

# Attendre que le channel soit créé
waitForChannel() {
    local channel_name=$1
    local max_retry=${2:-10}
    local delay=${3:-3}
    local counter=0
    
    infoln "Attente du channel $channel_name..."
    
    setGlobalsForPeer0Org1
    
    while ! peer channel list 2>&1 | grep -q "^${channel_name}$"; do
        sleep $delay
        counter=$((counter + 1))
        if [ $counter -ge $max_retry ]; then
            return 1
        fi
    done
    
    return 0
}

# ============================================================================
# Fonctions de gestion du chaincode
# ============================================================================

# Vérifier si le chaincode est installé
isChaincodeInstalled() {
    local cc_name=$1
    local cc_version=$2
    
    peer lifecycle chaincode queryinstalled 2>&1 | grep -q "${cc_name}_${cc_version}"
}

# Vérifier si le chaincode est approuvé
isChaincodeApproved() {
    local channel_name=$1
    local cc_name=$2
    
    peer lifecycle chaincode checkcommitreadiness \
        --channelID "$channel_name" \
        --name "$cc_name" \
        --version "${CC_VERSION}" \
        --sequence "${CC_SEQUENCE}" \
        --output json 2>&1 | grep -q '"approvals"'
}

# Attendre que le chaincode soit prêt
waitForChaincode() {
    local channel_name=$1
    local cc_name=$2
    local max_retry=${3:-10}
    local delay=${4:-3}
    local counter=0
    
    infoln "Attente du chaincode $cc_name sur $channel_name..."
    
    while ! peer chaincode list --channelID "$channel_name" --installed 2>&1 | grep -q "$cc_name"; do
        sleep $delay
        counter=$((counter + 1))
        if [ $counter -ge $max_retry ]; then
            return 1
        fi
    done
    
    return 0
}

# ============================================================================
# Fonctions de parsing des arguments
# ============================================================================

# Parser les arguments de ligne de commande
parseArgs() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--channel)
                CHANNEL_NAME="$2"
                shift 2
                ;;
            -cc|--chaincode)
                CC_NAME="$2"
                shift 2
                ;;
            -ccv|--version)
                CC_VERSION="$2"
                shift 2
                ;;
            -ccs|--sequence)
                CC_SEQUENCE="$2"
                shift 2
                ;;
            -ccp|--path)
                CC_PATH="$2"
                shift 2
                ;;
            -ccl|--lang)
                CC_LANG="$2"
                shift 2
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                printHelp
                exit 0
                ;;
            *)
                warnln "Argument inconnu: $1"
                shift
                ;;
        esac
    done
}

# ============================================================================
# Fonctions utilitaires diverses
# ============================================================================

# Générer un ID aléatoire
generateId() {
    echo $(date +%s%N | sha256sum | head -c 16)
}

# Formater la taille en bytes
formatBytes() {
    local bytes=$1
    if [ $bytes -lt 1024 ]; then
        echo "${bytes}B"
    elif [ $bytes -lt 1048576 ]; then
        echo "$((bytes / 1024))KB"
    elif [ $bytes -lt 1073741824 ]; then
        echo "$((bytes / 1048576))MB"
    else
        echo "$((bytes / 1073741824))GB"
    fi
}

# Afficher un timer
timer() {
    local start=$1
    local end=$(date +%s)
    local elapsed=$((end - start))
    local minutes=$((elapsed / 60))
    local seconds=$((elapsed % 60))
    echo "${minutes}m ${seconds}s"
}

# Créer un backup
backupArtifacts() {
    local backup_dir="${NETWORK_HOME}/backups/$(date +%Y%m%d_%H%M%S)"
    
    infoln "Création du backup dans $backup_dir..."
    
    mkdir -p "$backup_dir"
    cp -r "${CHANNEL_ARTIFACTS}" "$backup_dir/" 2>/dev/null || true
    cp -r "${ORGANIZATIONS}" "$backup_dir/" 2>/dev/null || true
    
    successln "Backup créé"
}

# Afficher les informations du réseau
printNetworkInfo() {
    echo -e "${C_BLUE}============================================${C_RESET}"
    echo -e "${C_BLUE}     Smart City Traffic Network Info${C_RESET}"
    echo -e "${C_BLUE}============================================${C_RESET}"
    echo ""
    echo -e "${C_GREEN}Organisations:${C_RESET}"
    echo "  - TrafficAuthority (Org1) - Régulateur"
    echo "  - MobilityServices (Org2) - Services"
    echo "  - SensorNetwork (Org3) - Capteurs IoT"
    echo ""
    echo -e "${C_GREEN}Peers:${C_RESET}"
    echo "  - peer0.trafficauthority.traffic.com:7051"
    echo "  - peer1.trafficauthority.traffic.com:7061"
    echo "  - peer0.mobilityservices.traffic.com:8051"
    echo "  - peer1.mobilityservices.traffic.com:8061"
    echo "  - peer0.sensornetwork.traffic.com:9051"
    echo "  - peer1.sensornetwork.traffic.com:9061"
    echo ""
    echo -e "${C_GREEN}Orderers (Raft):${C_RESET}"
    echo "  - orderer1.traffic.com:7050"
    echo "  - orderer2.traffic.com:8050"
    echo "  - orderer3.traffic.com:9050"
    echo ""
    echo -e "${C_GREEN}Channel:${C_RESET}"
    echo "  - ${CHANNEL_NAME}"
    echo ""
    echo -e "${C_GREEN}Chaincodes:${C_RESET}"
    echo "  - road-manager (Gestion des routes)"
    echo "  - sensor-data (Données capteurs)"
    echo "  - traffic-registry (Véhicules et conducteurs)"
    echo -e "${C_BLUE}============================================${C_RESET}"
}
