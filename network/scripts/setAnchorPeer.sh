#!/bin/bash

# ============================================================================
# setAnchorPeer.sh - Script de configuration des Anchor Peers
# Smart City Traffic Management System
# ============================================================================
# Ce script configure les anchor peers pour chaque organisation sur le canal
# Les anchor peers permettent la découverte inter-organisations (gossip)
# ============================================================================

# Charger les variables d'environnement et utilitaires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/envVar.sh"
source "${SCRIPT_DIR}/utils.sh"

# ============================================================================
# Variables par défaut
# ============================================================================

CHANNEL_NAME="traffic-channel"
VERBOSE=false

# ============================================================================
# Fonctions de configuration des Anchor Peers
# ============================================================================

# Créer la transaction de mise à jour de l'anchor peer
createAnchorPeerUpdate() {
    local ORG=$1
    local CHANNEL=$2
    
    infoln "Création de la transaction anchor peer pour ${ORG}..."
    
    # Définir les variables selon l'organisation
    case $ORG in
        1)
            ORG_NAME="Org1MSP"
            HOST="peer0.org1.traffic-network.com"
            PORT=7051
            ;;
        2)
            ORG_NAME="Org2MSP"
            HOST="peer0.org2.traffic-network.com"
            PORT=8051
            ;;
        3)
            ORG_NAME="Org3MSP"
            HOST="peer0.org3.traffic-network.com"
            PORT=9051
            ;;
        *)
            errorln "Organisation inconnue: ${ORG}"
            return 1
            ;;
    esac
    
    # Configurer l'environnement pour l'organisation
    setGlobals $ORG
    
    # Récupérer le bloc de configuration actuel
    infoln "Récupération de la configuration du canal..."
    set -x
    peer channel fetch config "${CHANNEL_NAME}_config_block.pb" \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer1.traffic-network.com \
        -c ${CHANNEL} \
        --tls \
        --cafile "${ORDERER_CA}"
    { set +x; } 2>/dev/null
    
    if [ ! -f "${CHANNEL_NAME}_config_block.pb" ]; then
        errorln "Échec de la récupération du bloc de configuration"
        return 1
    fi
    
    # Décoder le bloc de configuration en JSON
    infoln "Décodage de la configuration..."
    configtxlator proto_decode --input "${CHANNEL_NAME}_config_block.pb" \
        --type common.Block --output "${CHANNEL_NAME}_config_block.json"
    
    # Extraire la configuration
    jq '.data.data[0].payload.data.config' "${CHANNEL_NAME}_config_block.json" > "${CHANNEL_NAME}_config.json"
    
    # Créer la configuration modifiée avec l'anchor peer
    infoln "Ajout de l'anchor peer ${HOST}:${PORT} pour ${ORG_NAME}..."
    jq '.channel_group.groups.Application.groups.'${ORG_NAME}'.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "'${HOST}'","port": '${PORT}'}]},"version": "0"}}' \
        "${CHANNEL_NAME}_config.json" > "${CHANNEL_NAME}_modified_config.json"
    
    # Encoder les configurations originale et modifiée
    configtxlator proto_encode --input "${CHANNEL_NAME}_config.json" \
        --type common.Config --output "${CHANNEL_NAME}_config.pb"
    
    configtxlator proto_encode --input "${CHANNEL_NAME}_modified_config.json" \
        --type common.Config --output "${CHANNEL_NAME}_modified_config.pb"
    
    # Calculer le delta entre les deux configurations
    infoln "Calcul du delta de configuration..."
    configtxlator compute_update --channel_id ${CHANNEL} \
        --original "${CHANNEL_NAME}_config.pb" \
        --updated "${CHANNEL_NAME}_modified_config.pb" \
        --output "${CHANNEL_NAME}_anchor_update.pb"
    
    # Vérifier si une mise à jour est nécessaire
    if [ ! -s "${CHANNEL_NAME}_anchor_update.pb" ]; then
        infoln "L'anchor peer est déjà configuré pour ${ORG_NAME}"
        cleanupTempFiles
        return 0
    fi
    
    # Décoder le delta et créer l'enveloppe de mise à jour
    configtxlator proto_decode --input "${CHANNEL_NAME}_anchor_update.pb" \
        --type common.ConfigUpdate --output "${CHANNEL_NAME}_anchor_update.json"
    
    echo '{"payload":{"header":{"channel_header":{"channel_id":"'${CHANNEL}'","type":2}},"data":{"config_update":'$(cat ${CHANNEL_NAME}_anchor_update.json)'}}}' | \
        jq . > "${CHANNEL_NAME}_anchor_update_envelope.json"
    
    configtxlator proto_encode --input "${CHANNEL_NAME}_anchor_update_envelope.json" \
        --type common.Envelope --output "${CHANNEL_NAME}_anchor_update_envelope.pb"
    
    successln "Transaction anchor peer créée pour ${ORG_NAME}"
    return 0
}

# Soumettre la mise à jour de l'anchor peer
updateAnchorPeer() {
    local ORG=$1
    local CHANNEL=$2
    
    # Configurer l'environnement pour l'organisation
    setGlobals $ORG
    
    # Vérifier que le fichier de mise à jour existe
    if [ ! -f "${CHANNEL_NAME}_anchor_update_envelope.pb" ]; then
        errorln "Fichier de mise à jour anchor peer non trouvé"
        return 1
    fi
    
    infoln "Soumission de la mise à jour anchor peer..."
    
    set -x
    peer channel update \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer1.traffic-network.com \
        -c ${CHANNEL} \
        -f "${CHANNEL_NAME}_anchor_update_envelope.pb" \
        --tls \
        --cafile "${ORDERER_CA}"
    res=$?
    { set +x; } 2>/dev/null
    
    if [ $res -ne 0 ]; then
        errorln "Échec de la mise à jour anchor peer pour Org${ORG}"
        return 1
    fi
    
    successln "Anchor peer mis à jour avec succès pour Org${ORG}"
    
    # Nettoyer les fichiers temporaires
    cleanupTempFiles
    
    return 0
}

# Nettoyer les fichiers temporaires
cleanupTempFiles() {
    rm -f "${CHANNEL_NAME}_config_block.pb"
    rm -f "${CHANNEL_NAME}_config_block.json"
    rm -f "${CHANNEL_NAME}_config.json"
    rm -f "${CHANNEL_NAME}_modified_config.json"
    rm -f "${CHANNEL_NAME}_config.pb"
    rm -f "${CHANNEL_NAME}_modified_config.pb"
    rm -f "${CHANNEL_NAME}_anchor_update.pb"
    rm -f "${CHANNEL_NAME}_anchor_update.json"
    rm -f "${CHANNEL_NAME}_anchor_update_envelope.json"
    rm -f "${CHANNEL_NAME}_anchor_update_envelope.pb"
}

# ============================================================================
# Configuration de l'anchor peer pour une organisation spécifique
# ============================================================================

setAnchorPeerForOrg() {
    local ORG=$1
    local CHANNEL=${2:-$CHANNEL_NAME}
    
    infoln "=========================================="
    infoln "Configuration de l'anchor peer pour Org${ORG}"
    infoln "Canal: ${CHANNEL}"
    infoln "=========================================="
    
    # Créer la transaction de mise à jour
    createAnchorPeerUpdate $ORG $CHANNEL
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Soumettre la mise à jour
    updateAnchorPeer $ORG $CHANNEL
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    return 0
}

# ============================================================================
# Configuration des anchor peers pour toutes les organisations
# ============================================================================

setAllAnchorPeers() {
    local CHANNEL=${1:-$CHANNEL_NAME}
    
    infoln "=============================================="
    infoln "Configuration des anchor peers pour toutes les organisations"
    infoln "Canal: ${CHANNEL}"
    infoln "=============================================="
    
    # TrafficAuthority (Org1)
    infoln ""
    infoln ">>> TrafficAuthority (Org1) <<<"
    setAnchorPeerForOrg 1 $CHANNEL
    if [ $? -ne 0 ]; then
        errorln "Échec de la configuration anchor peer pour TrafficAuthority"
        return 1
    fi
    
    sleep 2
    
    # MobilityServices (Org2)
    infoln ""
    infoln ">>> MobilityServices (Org2) <<<"
    setAnchorPeerForOrg 2 $CHANNEL
    if [ $? -ne 0 ]; then
        errorln "Échec de la configuration anchor peer pour MobilityServices"
        return 1
    fi
    
    sleep 2
    
    # SensorNetwork (Org3)
    infoln ""
    infoln ">>> SensorNetwork (Org3) <<<"
    setAnchorPeerForOrg 3 $CHANNEL
    if [ $? -ne 0 ]; then
        errorln "Échec de la configuration anchor peer pour SensorNetwork"
        return 1
    fi
    
    successln "=============================================="
    successln "Tous les anchor peers ont été configurés!"
    successln "=============================================="
    
    return 0
}

# ============================================================================
# Vérification de la configuration des anchor peers
# ============================================================================

verifyAnchorPeers() {
    local CHANNEL=${1:-$CHANNEL_NAME}
    
    infoln "Vérification de la configuration des anchor peers..."
    
    # Récupérer le bloc de configuration actuel
    setGlobals 1
    
    peer channel fetch config "${CHANNEL}_verify_config.pb" \
        -o localhost:7050 \
        --ordererTLSHostnameOverride orderer1.traffic-network.com \
        -c ${CHANNEL} \
        --tls \
        --cafile "${ORDERER_CA}" 2>/dev/null
    
    if [ ! -f "${CHANNEL}_verify_config.pb" ]; then
        errorln "Impossible de récupérer la configuration du canal"
        return 1
    fi
    
    configtxlator proto_decode --input "${CHANNEL}_verify_config.pb" \
        --type common.Block 2>/dev/null | \
        jq '.data.data[0].payload.data.config.channel_group.groups.Application.groups | 
            to_entries[] | 
            {org: .key, anchor_peers: .value.values.AnchorPeers.value.anchor_peers}' 2>/dev/null
    
    rm -f "${CHANNEL}_verify_config.pb"
    
    return 0
}

# ============================================================================
# Affichage de l'aide
# ============================================================================

printHelp() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -org <num>       Configurer l'anchor peer pour une organisation spécifique (1, 2, ou 3)"
    echo "  -c <channel>     Nom du canal (défaut: traffic-channel)"
    echo "  -all             Configurer les anchor peers pour toutes les organisations"
    echo "  -verify          Vérifier la configuration actuelle des anchor peers"
    echo "  -v, --verbose    Mode verbeux"
    echo "  -h, --help       Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 -org 1                     # Configurer anchor peer pour TrafficAuthority"
    echo "  $0 -org 2 -c mychannel        # Configurer anchor peer pour MobilityServices sur mychannel"
    echo "  $0 -all                       # Configurer tous les anchor peers"
    echo "  $0 -verify                    # Vérifier la configuration actuelle"
    echo ""
    echo "Organisations:"
    echo "  1 - TrafficAuthority  (peer0.org1.traffic-network.com:7051)"
    echo "  2 - MobilityServices  (peer0.org2.traffic-network.com:8051)"
    echo "  3 - SensorNetwork     (peer0.org3.traffic-network.com:9051)"
}

# ============================================================================
# Point d'entrée du script
# ============================================================================

# Variables pour les arguments
ORG_NUM=""
MODE=""

# Analyser les arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -org)
            ORG_NUM="$2"
            MODE="single"
            shift 2
            ;;
        -c)
            CHANNEL_NAME="$2"
            shift 2
            ;;
        -all|--all)
            MODE="all"
            shift
            ;;
        -verify|--verify)
            MODE="verify"
            shift
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
            errorln "Option inconnue: $1"
            printHelp
            exit 1
            ;;
    esac
done

# Exécuter selon le mode
case $MODE in
    single)
        if [[ ! "$ORG_NUM" =~ ^[1-3]$ ]]; then
            errorln "Numéro d'organisation invalide: ${ORG_NUM}. Utilisez 1, 2, ou 3."
            exit 1
        fi
        setAnchorPeerForOrg $ORG_NUM $CHANNEL_NAME
        ;;
    all)
        setAllAnchorPeers $CHANNEL_NAME
        ;;
    verify)
        verifyAnchorPeers $CHANNEL_NAME
        ;;
    *)
        printHelp
        exit 1
        ;;
esac

exit $?
