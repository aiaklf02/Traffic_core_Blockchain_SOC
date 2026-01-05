#!/bin/bash

# ============================================================================
# Script de gestion du réseau Traffic Core
# Hyperledger Fabric Network Management
# ============================================================================

set -e

# Configuration
export COMPOSE_PROJECT_NAME=traffic-core
export IMAGE_TAG=2.5.4
export CA_IMAGE_TAG=1.5.7
export CHANNEL_NAME="traffic-channel"
export CHAINCODE_LANGUAGE="go"

# Répertoires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
NETWORK_DIR="$PROJECT_DIR/network"
DOCKER_DIR="$NETWORK_DIR/docker"
CHAINCODE_DIR="$PROJECT_DIR/chaincode"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "  $1"
    echo "============================================================================"
    echo -e "${NC}"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ $1${NC}"; }

# Afficher l'aide
show_help() {
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  up              - Démarrer le réseau complet"
    echo "  down            - Arrêter le réseau"
    echo "  restart         - Redémarrer le réseau"
    echo "  generate        - Générer les certificats et artefacts"
    echo "  createChannel   - Créer le channel"
    echo "  joinChannel     - Joindre les peers au channel"
    echo "  deployCC        - Déployer les chaincodes"
    echo "  status          - Afficher le statut du réseau"
    echo "  logs            - Afficher les logs"
    echo "  clean           - Nettoyer tous les artefacts"
    echo "  help            - Afficher cette aide"
    echo ""
    echo "Options:"
    echo "  -c, --channel   - Nom du channel (défaut: traffic-channel)"
    echo "  -v, --verbose   - Mode verbeux"
    echo ""
    echo "Exemples:"
    echo "  $0 up                    # Démarrer tout le réseau"
    echo "  $0 deployCC              # Déployer les chaincodes"
    echo "  $0 logs peer0.org1       # Voir les logs d'un peer"
    echo ""
}

# Vérifier Docker
check_docker() {
    if ! docker info &> /dev/null; then
        print_error "Docker n'est pas en cours d'exécution"
        exit 1
    fi
}

# Générer les certificats avec cryptogen
generate_crypto() {
    print_header "Génération des certificats"
    
    cd "$NETWORK_DIR"
    
    # Créer le répertoire pour les organisations
    mkdir -p organizations/peerOrganizations
    mkdir -p organizations/ordererOrganizations
    
    print_info "Génération des certificats avec cryptogen..."
    
    # Utiliser cryptogen si disponible
    if command -v cryptogen &> /dev/null; then
        cryptogen generate --config="$NETWORK_DIR/organizations/crypto-config.yaml" --output="$NETWORK_DIR/organizations"
        print_success "Certificats générés avec cryptogen"
    else
        print_warning "cryptogen non trouvé, utilisation des CA Docker"
        # Les certificats seront générés par les CA Docker
    fi
}

# Générer les artefacts du channel
generate_channel_artifacts() {
    print_header "Génération des artefacts du channel ($CHANNEL_NAME)"

    cd "$NETWORK_DIR"
    mkdir -p channel-artifacts

    if command -v configtxgen &> /dev/null; then
        export FABRIC_CFG_PATH="$NETWORK_DIR/configtx"

        # Générer le bloc genesis (une seule fois pour le réseau)
        if [ ! -f "$NETWORK_DIR/channel-artifacts/genesis.block" ]; then
            print_info "Génération du bloc genesis..."
            configtxgen -profile TrafficNetworkGenesis -channelID system-channel -outputBlock "$NETWORK_DIR/channel-artifacts/genesis.block"
        fi

        # Générer la transaction de création du channel demandé
        print_info "Génération de la transaction du channel $CHANNEL_NAME..."
        configtxgen -profile TrafficChannel -outputCreateChannelTx "$NETWORK_DIR/channel-artifacts/${CHANNEL_NAME}.tx" -channelID $CHANNEL_NAME

        # Générer les anchor peer updates pour ce channel
        for org in Org1MSP Org2MSP Org3MSP; do
            print_info "Génération de l'anchor peer pour $org sur $CHANNEL_NAME..."
            configtxgen -profile TrafficChannel -outputAnchorPeersUpdate "$NETWORK_DIR/channel-artifacts/${org}_${CHANNEL_NAME}_anchors.tx" -channelID $CHANNEL_NAME -asOrg $org
        done

        print_success "Artefacts du channel $CHANNEL_NAME générés"
    else
        print_warning "configtxgen non trouvé"
    fi
}

# Démarrer le réseau
network_up() {
    print_header "Démarrage du réseau Traffic Core"
    
    check_docker
    
    cd "$DOCKER_DIR"
    
    # Générer les certificats si nécessaires
    if [ ! -d "$NETWORK_DIR/organizations/peerOrganizations" ]; then
        generate_crypto
        generate_channel_artifacts
    fi
    
    print_info "Démarrage des containers Docker..."
    
    docker compose -f "$NETWORK_DIR/docker/docker-compose.yaml" up -d
    
    # Attendre que les containers soient prêts
    echo ""
    print_info "Attente du démarrage des services..."
    sleep 10
    
    # Vérifier le statut
    network_status
    
    # Créer le channel et joindre les peers automatiquement
    print_info "Configuration du channel..."
    sleep 3
    create_channel
    sleep 2
    join_channel
    
    print_success "Réseau démarré avec succès!"
    echo ""
    echo "Prochaine étape:"
    echo "  Déployer les chaincodes:  ./scripts/network.sh deployCC"
}

# Arrêter le réseau
network_down() {
    print_header "Arrêt du réseau Traffic Core"
    
    cd "$DOCKER_DIR"
    
    print_info "Arrêt des containers..."
    docker compose -f "$NETWORK_DIR/docker/docker-compose.yaml" down --volumes --remove-orphans 2>/dev/null || true
    
    # Supprimer les containers orphelins
    docker rm -f $(docker ps -aq --filter "label=service=hyperledger-fabric") 2>/dev/null || true
    
    print_success "Réseau arrêté"
}

# Redémarrer le réseau
network_restart() {
    network_down
    sleep 2
    network_up
}

# Créer le channel
create_channel() {
    print_header "Création du channel: $CHANNEL_NAME"

    # Vérifier si le channel existe déjà
    if docker exec cli peer channel getinfo -c $CHANNEL_NAME 2>/dev/null; then
        print_warning "Le channel $CHANNEL_NAME existe déjà"
        return 0
    fi

    # Créer le channel
    print_info "Création du channel $CHANNEL_NAME..."
    docker exec cli peer channel create \
        -o orderer1.traffic-network.com:7050 \
        -c $CHANNEL_NAME \
        -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.tx \
        --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block \
        --tls \
        --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/traffic-network.com/orderers/orderer1.traffic-network.com/msp/tlscacerts/tlsca.traffic-network.com-cert.pem

    print_success "Channel créé: $CHANNEL_NAME"
}

# Joindre les peers au channel
join_channel() {
    print_header "Jonction des peers au channel: $CHANNEL_NAME"
    
    local ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/traffic-network.com/orderers/orderer1.traffic-network.com/msp/tlscacerts/tlsca.traffic-network.com-cert.pem"
    local CHANNEL_BLOCK="/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block"
    
    # Org1 peers
    for peer_num in 0 1; do
        local port=$((7051 + peer_num * 10))
        print_info "Jonction de peer${peer_num}.org1.traffic-network.com..."
        docker exec -e CORE_PEER_LOCALMSPID="Org1MSP" \
            -e CORE_PEER_ADDRESS="peer${peer_num}.org1.traffic-network.com:${port}" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.traffic-network.com/peers/peer${peer_num}.org1.traffic-network.com/tls/ca.crt" \
            -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.traffic-network.com/users/Admin@org1.traffic-network.com/msp" \
            cli peer channel join -b "$CHANNEL_BLOCK" 2>&1 || print_warning "peer${peer_num}.org1 déjà membre ou erreur"
    done
    
    # Org2 peers
    for peer_num in 0 1; do
        local port=$((8051 + peer_num * 10))
        print_info "Jonction de peer${peer_num}.org2.traffic-network.com..."
        docker exec -e CORE_PEER_LOCALMSPID="Org2MSP" \
            -e CORE_PEER_ADDRESS="peer${peer_num}.org2.traffic-network.com:${port}" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.traffic-network.com/peers/peer${peer_num}.org2.traffic-network.com/tls/ca.crt" \
            -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.traffic-network.com/users/Admin@org2.traffic-network.com/msp" \
            cli peer channel join -b "$CHANNEL_BLOCK" 2>&1 || print_warning "peer${peer_num}.org2 déjà membre ou erreur"
    done
    
    # Org3 peers
    for peer_num in 0 1; do
        local port=$((9051 + peer_num * 10))
        print_info "Jonction de peer${peer_num}.org3.traffic-network.com..."
        docker exec -e CORE_PEER_LOCALMSPID="Org3MSP" \
            -e CORE_PEER_ADDRESS="peer${peer_num}.org3.traffic-network.com:${port}" \
            -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.traffic-network.com/peers/peer${peer_num}.org3.traffic-network.com/tls/ca.crt" \
            -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org3.traffic-network.com/users/Admin@org3.traffic-network.com/msp" \
            cli peer channel join -b "$CHANNEL_BLOCK" 2>&1 || print_warning "peer${peer_num}.org3 déjà membre ou erreur"
    done
    
    print_success "Tous les peers ont rejoint le channel $CHANNEL_NAME"
}

# Déployer les chaincodes (CCaaS mode)
deploy_chaincode() {
    print_header "Déploiement des chaincodes (CCaaS)"

    # Configuration
    local CHAINCODES=("road-manager" "sensor-data" "traffic-registry")
    local CHAINCODE_PORTS=("9999" "9998" "9997")
    local CCAAS_PACKAGES_DIR="$PROJECT_DIR/ccaas-packages"
    local ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/traffic-network.com/orderers/orderer1.traffic-network.com/msp/tlscacerts/tlsca.traffic-network.com-cert.pem"

    # Étape 1: Construire les images Docker des chaincodes
    print_info "Étape 1/6: Construction des images Docker..."
    for cc in "${CHAINCODES[@]}"; do
        print_info "  Construction de $cc-ccaas:latest..."
        docker build -t "$cc-ccaas:latest" "$CHAINCODE_DIR/$cc/" || {
            print_error "Échec de la construction de $cc"
            exit 1
        }
    done
    print_success "Images Docker construites"

    # Étape 2: Créer les packages CCaaS
    print_info "Étape 2/6: Création des packages CCaaS..."
    mkdir -p "$CCAAS_PACKAGES_DIR"
    
    for i in "${!CHAINCODES[@]}"; do
        cc="${CHAINCODES[$i]}"
        port="${CHAINCODE_PORTS[$i]}"
        
        TEMP_DIR=$(mktemp -d)
        
        # connection.json
        cat > "$TEMP_DIR/connection.json" << EOF
{"address":"${cc}-ccaas:${port}","dial_timeout":"10s","tls_required":false}
EOF
        
        # metadata.json
        cat > "$TEMP_DIR/metadata.json" << EOF
{"type":"ccaas","label":"${cc}_1.0"}
EOF
        
        # Créer le package
        tar -czf "$TEMP_DIR/code.tar.gz" -C "$TEMP_DIR" connection.json
        tar -czf "$CCAAS_PACKAGES_DIR/${cc}_1.0.tar.gz" -C "$TEMP_DIR" code.tar.gz metadata.json
        rm -rf "$TEMP_DIR"
    done
    print_success "Packages CCaaS créés dans $CCAAS_PACKAGES_DIR"

    # Étape 3: Copier les packages dans le CLI
    print_info "Étape 3/6: Copie des packages dans le conteneur CLI..."
    docker exec cli mkdir -p /opt/gopath/src/github.com/hyperledger/fabric/peer/ccaas-packages
    for cc in "${CHAINCODES[@]}"; do
        docker cp "$CCAAS_PACKAGES_DIR/${cc}_1.0.tar.gz" cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/ccaas-packages/
    done
    print_success "Packages copiés"

    # Étape 4: Installer les chaincodes sur tous les peers
    print_info "Étape 4/6: Installation des chaincodes sur tous les peers..."
    
    declare -A PACKAGE_IDS
    
    for cc in "${CHAINCODES[@]}"; do
        print_info "  Installation de $cc..."
        
        # Installer sur peer0 de chaque org
        for org in 1 2 3; do
            case $org in
                1) port=7051; msp="Org1MSP" ;;
                2) port=8051; msp="Org2MSP" ;;
                3) port=9051; msp="Org3MSP" ;;
            esac
            
            docker exec -e CORE_PEER_LOCALMSPID="$msp" \
                -e CORE_PEER_ADDRESS="peer0.org${org}.traffic-network.com:${port}" \
                -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org${org}.traffic-network.com/peers/peer0.org${org}.traffic-network.com/tls/ca.crt" \
                -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org${org}.traffic-network.com/users/Admin@org${org}.traffic-network.com/msp" \
                cli peer lifecycle chaincode install "/opt/gopath/src/github.com/hyperledger/fabric/peer/ccaas-packages/${cc}_1.0.tar.gz" 2>&1 || true
        done
        
        # Récupérer le Package ID
        PACKAGE_IDS[$cc]=$(docker exec cli peer lifecycle chaincode queryinstalled 2>&1 | grep "${cc}_1.0" | sed -n 's/^Package ID: \(.*\), Label:.*$/\1/p' | head -1)
        print_info "  Package ID de $cc: ${PACKAGE_IDS[$cc]}"
    done
    print_success "Chaincodes installés"

    # Étape 5: Approuver et commiter les chaincodes
    print_info "Étape 5/6: Approbation et commit des chaincodes..."
    
    for cc in "${CHAINCODES[@]}"; do
        local pkg_id="${PACKAGE_IDS[$cc]}"
        print_info "  Approbation de $cc..."
        
        # Approuver pour chaque org
        for org in 1 2 3; do
            case $org in
                1) port=7051; msp="Org1MSP" ;;
                2) port=8051; msp="Org2MSP" ;;
                3) port=9051; msp="Org3MSP" ;;
            esac
            
            docker exec -e CORE_PEER_LOCALMSPID="$msp" \
                -e CORE_PEER_ADDRESS="peer0.org${org}.traffic-network.com:${port}" \
                -e CORE_PEER_TLS_ROOTCERT_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org${org}.traffic-network.com/peers/peer0.org${org}.traffic-network.com/tls/ca.crt" \
                -e CORE_PEER_MSPCONFIGPATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org${org}.traffic-network.com/users/Admin@org${org}.traffic-network.com/msp" \
                cli peer lifecycle chaincode approveformyorg \
                    -o orderer1.traffic-network.com:7050 --tls \
                    --cafile "$ORDERER_CA" \
                    --channelID "$CHANNEL_NAME" \
                    --name "$cc" --version 1.0 \
                    --package-id "$pkg_id" --sequence 1 \
                    --signature-policy "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')" 2>&1 || true
        done
        
        # Commiter le chaincode
        print_info "  Commit de $cc..."
        docker exec cli peer lifecycle chaincode commit \
            -o orderer1.traffic-network.com:7050 --tls \
            --cafile "$ORDERER_CA" \
            --channelID "$CHANNEL_NAME" \
            --name "$cc" --version 1.0 --sequence 1 \
            --signature-policy "OR('Org1MSP.member','Org2MSP.member','Org3MSP.member')" \
            --peerAddresses peer0.org1.traffic-network.com:7051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.traffic-network.com/peers/peer0.org1.traffic-network.com/tls/ca.crt \
            --peerAddresses peer0.org2.traffic-network.com:8051 \
            --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.traffic-network.com/peers/peer0.org2.traffic-network.com/tls/ca.crt 2>&1 || true
    done
    print_success "Chaincodes approuvés et committés"

    # Étape 6: Démarrer les conteneurs CCaaS
    print_info "Étape 6/6: Démarrage des conteneurs CCaaS..."
    
    # Arrêter les anciens conteneurs s'ils existent
    for cc in "${CHAINCODES[@]}"; do
        docker stop "${cc}-ccaas" 2>/dev/null || true
        docker rm "${cc}-ccaas" 2>/dev/null || true
    done
    
    # Déterminer le réseau Docker
    local DOCKER_NETWORK=$(docker network ls --format '{{.Name}}' | grep -E "docker_default|traffic" | head -1)
    [ -z "$DOCKER_NETWORK" ] && DOCKER_NETWORK="docker_default"
    
    for i in "${!CHAINCODES[@]}"; do
        cc="${CHAINCODES[$i]}"
        port="${CHAINCODE_PORTS[$i]}"
        pkg_id="${PACKAGE_IDS[$cc]}"
        
        print_info "  Démarrage de ${cc}-ccaas sur le port $port..."
        docker run -d --name "${cc}-ccaas" \
            --network "$DOCKER_NETWORK" \
            -p "${port}:${port}" \
            -e CHAINCODE_SERVER_ADDRESS="0.0.0.0:${port}" \
            -e CHAINCODE_ID="$pkg_id" \
            "${cc}-ccaas:latest"
    done
    
    sleep 3
    print_success "Conteneurs CCaaS démarrés"

    # Vérification finale
    print_header "Vérification du déploiement"
    docker exec cli peer lifecycle chaincode querycommitted --channelID "$CHANNEL_NAME" 2>&1 || true
    
    echo ""
    print_success "Déploiement CCaaS terminé avec succès!"
    echo ""
    echo "Conteneurs CCaaS:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep ccaas || echo "Aucun"
    echo ""
    echo "Pour tester:"
    echo "  docker exec cli peer chaincode invoke -o orderer1.traffic-network.com:7050 --tls --cafile \$ORDERER_CA -C $CHANNEL_NAME -n road-manager --peerAddresses peer0.org1.traffic-network.com:7051 --tlsRootCertFiles /opt/.../ca.crt -c '{\"function\":\"InitLedger\",\"Args\":[]}'"
}

# Afficher le statut
network_status() {
    print_header "Statut du réseau Traffic Core"
    
    echo "Containers en cours d'exécution:"
    echo "--------------------------------"
    
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "traffic|peer|orderer|couchdb|ca" || echo "Aucun container trouvé"
    
    echo ""
    echo "Réseau Docker:"
    echo "--------------"
    docker network ls | grep traffic || echo "Réseau non trouvé"
    
    echo ""
    echo "Volumes Docker:"
    echo "---------------"
    docker volume ls | grep traffic | head -10 || echo "Aucun volume trouvé"
}

# Afficher les logs
show_logs() {
    local container=$1
    
    if [ -z "$container" ]; then
        print_info "Logs de tous les containers..."
        cd "$DOCKER_DIR"
        docker compose -f "$NETWORK_DIR/docker/docker-compose.yaml" logs -f --tail=100
    else
        print_info "Logs de $container..."
        docker logs -f --tail=100 "$container"
    fi
}

# Nettoyer tout
clean_all() {
    print_header "Nettoyage complet"
    
    print_warning "Cette action va supprimer tous les artefacts du réseau!"
    read -p "Êtes-vous sûr? (y/n) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Annulé"
        return
    fi
    
    # Arrêter le réseau
    network_down
    
    # Supprimer les artefacts
    print_info "Suppression des artefacts..."
    rm -rf "$NETWORK_DIR/organizations/peerOrganizations"
    rm -rf "$NETWORK_DIR/organizations/ordererOrganizations"
    rm -rf "$NETWORK_DIR/channel-artifacts"/*.block
    rm -rf "$NETWORK_DIR/channel-artifacts"/*.tx
    
    # Supprimer les images chaincode
    print_info "Suppression des images chaincode..."
    docker rmi $(docker images -q 'dev-*') 2>/dev/null || true
    
    # Supprimer les volumes
    print_info "Suppression des volumes..."
    docker volume rm $(docker volume ls -q | grep traffic) 2>/dev/null || true
    
    # Supprimer le réseau
    docker network rm traffic-core_traffic-network 2>/dev/null || true
    
    print_success "Nettoyage terminé"
}

# Parser les arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -c|--channel)
                CHANNEL_NAME="$2"
                shift 2
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            *)
                COMMAND="$1"
                shift
                ;;
        esac
    done
}

# Fonction principale
main() {
    parse_args "$@"
    
    case "${COMMAND:-help}" in
        up)
            network_up
            ;;
        down)
            network_down
            ;;
        restart)
            network_restart
            ;;
        generate)
            generate_crypto
            generate_channel_artifacts
            ;;
        createChannel)
            create_channel
            ;;
        joinChannel)
            join_channel
            ;;
        deployCC)
            deploy_chaincode
            ;;
        status)
            network_status
            ;;
        logs)
            show_logs "$2"
            ;;
        clean)
            clean_all
            ;;
        help|*)
            show_help
            ;;
    esac
}

# Exécution
main "$@"
