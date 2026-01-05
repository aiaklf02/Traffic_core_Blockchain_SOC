#!/bin/bash

# ============================================================================
# registerEnroll.sh - Script d'inscription et d'enregistrement des identités
# Smart City Traffic Management System
# ============================================================================
# Ce script gère l'enregistrement et l'inscription des identités via les CAs
# Fabric pour les trois organisations du réseau
# ============================================================================

# Charger les variables d'environnement et utilitaires
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/envVar.sh"
source "${SCRIPT_DIR}/utils.sh"

# ============================================================================
# Configuration des CAs
# ============================================================================

# Ports des CAs pour chaque organisation
CA_TRAFFIC_AUTHORITY_PORT=7054
CA_MOBILITY_SERVICES_PORT=8054
CA_SENSOR_NETWORK_PORT=9054
CA_ORDERER_PORT=10054

# ============================================================================
# Fonctions utilitaires pour les CAs
# ============================================================================

# Attendre qu'une CA soit prête
waitForCA() {
    local CA_NAME=$1
    local CA_PORT=$2
    local MAX_RETRY=10
    local DELAY=3
    
    infoln "Attente de la disponibilité de ${CA_NAME}..."
    
    for i in $(seq 1 $MAX_RETRY); do
        if curl -s -o /dev/null -w "%{http_code}" "http://localhost:${CA_PORT}/cainfo" | grep -q "200"; then
            successln "${CA_NAME} est prête"
            return 0
        fi
        sleep $DELAY
    done
    
    errorln "${CA_NAME} n'est pas disponible après ${MAX_RETRY} tentatives"
    return 1
}

# Créer le répertoire MSP avec la structure appropriée
createMSPDirectory() {
    local MSP_DIR=$1
    
    mkdir -p "${MSP_DIR}/cacerts"
    mkdir -p "${MSP_DIR}/keystore"
    mkdir -p "${MSP_DIR}/signcerts"
    mkdir -p "${MSP_DIR}/tlscacerts"
    mkdir -p "${MSP_DIR}/user"
}

# ============================================================================
# Inscription TrafficAuthority (Org1)
# ============================================================================

function createTrafficAuthority() {
    infoln "=========================================="
    infoln "Inscription des identités TrafficAuthority"
    infoln "=========================================="

    # Définir les chemins
    local CA_DIR="${PWD}/organizations/fabric-ca/trafficAuthority"
    local ORG_DIR="${PWD}/organizations/peerOrganizations/trafficauthority.traffic.com"
    
    # Créer les répertoires nécessaires
    mkdir -p "${ORG_DIR}"
    
    # Exporter les variables pour fabric-ca-client
    export FABRIC_CA_CLIENT_HOME="${ORG_DIR}"
    
    infoln "Enregistrement de l'identité CA admin pour TrafficAuthority..."
    
    set -x
    fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Créer le fichier config.yaml pour NodeOUs
    cat > "${ORG_DIR}/msp/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-${CA_TRAFFIC_AUTHORITY_PORT}-ca-trafficauthority.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-${CA_TRAFFIC_AUTHORITY_PORT}-ca-trafficauthority.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-${CA_TRAFFIC_AUTHORITY_PORT}-ca-trafficauthority.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-${CA_TRAFFIC_AUTHORITY_PORT}-ca-trafficauthority.pem
    OrganizationalUnitIdentifier: orderer
EOF

    # ========================================
    # Enregistrement des peers
    # ========================================
    
    infoln "Enregistrement de peer0.trafficauthority..."
    set -x
    fabric-ca-client register --caname ca-trafficauthority \
        --id.name peer0 \
        --id.secret peer0pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de peer1.trafficauthority..."
    set -x
    fabric-ca-client register --caname ca-trafficauthority \
        --id.name peer1 \
        --id.secret peer1pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # ========================================
    # Enregistrement des utilisateurs
    # ========================================
    
    infoln "Enregistrement de l'utilisateur User1..."
    set -x
    fabric-ca-client register --caname ca-trafficauthority \
        --id.name user1 \
        --id.secret user1pw \
        --id.type client \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de l'admin de l'organisation..."
    set -x
    fabric-ca-client register --caname ca-trafficauthority \
        --id.name trafficauthorityadmin \
        --id.secret trafficauthorityadminpw \
        --id.type admin \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null

    # ========================================
    # Inscription de peer0
    # ========================================
    
    infoln "Inscription de peer0.trafficauthority..."
    local PEER0_DIR="${ORG_DIR}/peers/peer0.trafficauthority.traffic.com"
    mkdir -p "${PEER0_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${PEER0_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER0_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer0
    infoln "Inscription TLS pour peer0.trafficauthority..."
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${PEER0_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer0.trafficauthority.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${PEER0_DIR}/tls/ca.crt"
    cp "${PEER0_DIR}/tls/signcerts/"* "${PEER0_DIR}/tls/server.crt"
    cp "${PEER0_DIR}/tls/keystore/"* "${PEER0_DIR}/tls/server.key"

    # ========================================
    # Inscription de peer1
    # ========================================
    
    infoln "Inscription de peer1.trafficauthority..."
    local PEER1_DIR="${ORG_DIR}/peers/peer1.trafficauthority.traffic.com"
    mkdir -p "${PEER1_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${PEER1_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER1_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer1
    infoln "Inscription TLS pour peer1.trafficauthority..."
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${PEER1_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer1.trafficauthority.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER1_DIR}/tls/tlscacerts/"* "${PEER1_DIR}/tls/ca.crt"
    cp "${PEER1_DIR}/tls/signcerts/"* "${PEER1_DIR}/tls/server.crt"
    cp "${PEER1_DIR}/tls/keystore/"* "${PEER1_DIR}/tls/server.key"

    # ========================================
    # Inscription User1
    # ========================================
    
    infoln "Inscription de User1..."
    local USER_DIR="${ORG_DIR}/users/User1@trafficauthority.traffic.com"
    mkdir -p "${USER_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://user1:user1pw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${USER_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${USER_DIR}/msp/config.yaml"

    # ========================================
    # Inscription Admin
    # ========================================
    
    infoln "Inscription de l'Admin..."
    local ADMIN_DIR="${ORG_DIR}/users/Admin@trafficauthority.traffic.com"
    mkdir -p "${ADMIN_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://trafficauthorityadmin:trafficauthorityadminpw@localhost:${CA_TRAFFIC_AUTHORITY_PORT} \
        --caname ca-trafficauthority \
        -M "${ADMIN_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ADMIN_DIR}/msp/config.yaml"

    # Copier le certificat CA dans le MSP de l'organisation
    mkdir -p "${ORG_DIR}/msp/tlscacerts"
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${ORG_DIR}/msp/tlscacerts/ca.crt"

    successln "Identités TrafficAuthority créées avec succès!"
}

# ============================================================================
# Inscription MobilityServices (Org2)
# ============================================================================

function createMobilityServices() {
    infoln "=========================================="
    infoln "Inscription des identités MobilityServices"
    infoln "=========================================="

    # Définir les chemins
    local CA_DIR="${PWD}/organizations/fabric-ca/mobilityServices"
    local ORG_DIR="${PWD}/organizations/peerOrganizations/mobilityservices.traffic.com"
    
    # Créer les répertoires nécessaires
    mkdir -p "${ORG_DIR}"
    
    # Exporter les variables pour fabric-ca-client
    export FABRIC_CA_CLIENT_HOME="${ORG_DIR}"
    
    infoln "Enregistrement de l'identité CA admin pour MobilityServices..."
    
    set -x
    fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Créer le fichier config.yaml pour NodeOUs
    cat > "${ORG_DIR}/msp/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-${CA_MOBILITY_SERVICES_PORT}-ca-mobilityservices.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-${CA_MOBILITY_SERVICES_PORT}-ca-mobilityservices.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-${CA_MOBILITY_SERVICES_PORT}-ca-mobilityservices.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-${CA_MOBILITY_SERVICES_PORT}-ca-mobilityservices.pem
    OrganizationalUnitIdentifier: orderer
EOF

    # ========================================
    # Enregistrement des peers
    # ========================================
    
    infoln "Enregistrement de peer0.mobilityservices..."
    set -x
    fabric-ca-client register --caname ca-mobilityservices \
        --id.name peer0 \
        --id.secret peer0pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de peer1.mobilityservices..."
    set -x
    fabric-ca-client register --caname ca-mobilityservices \
        --id.name peer1 \
        --id.secret peer1pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # ========================================
    # Enregistrement des utilisateurs
    # ========================================
    
    infoln "Enregistrement de l'utilisateur User1..."
    set -x
    fabric-ca-client register --caname ca-mobilityservices \
        --id.name user1 \
        --id.secret user1pw \
        --id.type client \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de l'admin de l'organisation..."
    set -x
    fabric-ca-client register --caname ca-mobilityservices \
        --id.name mobilityservicesadmin \
        --id.secret mobilityservicesadminpw \
        --id.type admin \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null

    # ========================================
    # Inscription de peer0
    # ========================================
    
    infoln "Inscription de peer0.mobilityservices..."
    local PEER0_DIR="${ORG_DIR}/peers/peer0.mobilityservices.traffic.com"
    mkdir -p "${PEER0_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${PEER0_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER0_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer0
    infoln "Inscription TLS pour peer0.mobilityservices..."
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${PEER0_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer0.mobilityservices.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${PEER0_DIR}/tls/ca.crt"
    cp "${PEER0_DIR}/tls/signcerts/"* "${PEER0_DIR}/tls/server.crt"
    cp "${PEER0_DIR}/tls/keystore/"* "${PEER0_DIR}/tls/server.key"

    # ========================================
    # Inscription de peer1
    # ========================================
    
    infoln "Inscription de peer1.mobilityservices..."
    local PEER1_DIR="${ORG_DIR}/peers/peer1.mobilityservices.traffic.com"
    mkdir -p "${PEER1_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${PEER1_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER1_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer1
    infoln "Inscription TLS pour peer1.mobilityservices..."
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${PEER1_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer1.mobilityservices.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER1_DIR}/tls/tlscacerts/"* "${PEER1_DIR}/tls/ca.crt"
    cp "${PEER1_DIR}/tls/signcerts/"* "${PEER1_DIR}/tls/server.crt"
    cp "${PEER1_DIR}/tls/keystore/"* "${PEER1_DIR}/tls/server.key"

    # ========================================
    # Inscription User1
    # ========================================
    
    infoln "Inscription de User1..."
    local USER_DIR="${ORG_DIR}/users/User1@mobilityservices.traffic.com"
    mkdir -p "${USER_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://user1:user1pw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${USER_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${USER_DIR}/msp/config.yaml"

    # ========================================
    # Inscription Admin
    # ========================================
    
    infoln "Inscription de l'Admin..."
    local ADMIN_DIR="${ORG_DIR}/users/Admin@mobilityservices.traffic.com"
    mkdir -p "${ADMIN_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://mobilityservicesadmin:mobilityservicesadminpw@localhost:${CA_MOBILITY_SERVICES_PORT} \
        --caname ca-mobilityservices \
        -M "${ADMIN_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ADMIN_DIR}/msp/config.yaml"

    # Copier le certificat CA dans le MSP de l'organisation
    mkdir -p "${ORG_DIR}/msp/tlscacerts"
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${ORG_DIR}/msp/tlscacerts/ca.crt"

    successln "Identités MobilityServices créées avec succès!"
}

# ============================================================================
# Inscription SensorNetwork (Org3)
# ============================================================================

function createSensorNetwork() {
    infoln "=========================================="
    infoln "Inscription des identités SensorNetwork"
    infoln "=========================================="

    # Définir les chemins
    local CA_DIR="${PWD}/organizations/fabric-ca/sensorNetwork"
    local ORG_DIR="${PWD}/organizations/peerOrganizations/sensornetwork.traffic.com"
    
    # Créer les répertoires nécessaires
    mkdir -p "${ORG_DIR}"
    
    # Exporter les variables pour fabric-ca-client
    export FABRIC_CA_CLIENT_HOME="${ORG_DIR}"
    
    infoln "Enregistrement de l'identité CA admin pour SensorNetwork..."
    
    set -x
    fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Créer le fichier config.yaml pour NodeOUs
    cat > "${ORG_DIR}/msp/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-${CA_SENSOR_NETWORK_PORT}-ca-sensornetwork.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-${CA_SENSOR_NETWORK_PORT}-ca-sensornetwork.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-${CA_SENSOR_NETWORK_PORT}-ca-sensornetwork.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-${CA_SENSOR_NETWORK_PORT}-ca-sensornetwork.pem
    OrganizationalUnitIdentifier: orderer
EOF

    # ========================================
    # Enregistrement des peers
    # ========================================
    
    infoln "Enregistrement de peer0.sensornetwork..."
    set -x
    fabric-ca-client register --caname ca-sensornetwork \
        --id.name peer0 \
        --id.secret peer0pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de peer1.sensornetwork..."
    set -x
    fabric-ca-client register --caname ca-sensornetwork \
        --id.name peer1 \
        --id.secret peer1pw \
        --id.type peer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # ========================================
    # Enregistrement des utilisateurs
    # ========================================
    
    infoln "Enregistrement de l'utilisateur User1..."
    set -x
    fabric-ca-client register --caname ca-sensornetwork \
        --id.name user1 \
        --id.secret user1pw \
        --id.type client \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de l'admin de l'organisation..."
    set -x
    fabric-ca-client register --caname ca-sensornetwork \
        --id.name sensornetworkadmin \
        --id.secret sensornetworkadminpw \
        --id.type admin \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null

    # ========================================
    # Inscription de peer0
    # ========================================
    
    infoln "Inscription de peer0.sensornetwork..."
    local PEER0_DIR="${ORG_DIR}/peers/peer0.sensornetwork.traffic.com"
    mkdir -p "${PEER0_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${PEER0_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER0_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer0
    infoln "Inscription TLS pour peer0.sensornetwork..."
    set -x
    fabric-ca-client enroll -u https://peer0:peer0pw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${PEER0_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer0.sensornetwork.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${PEER0_DIR}/tls/ca.crt"
    cp "${PEER0_DIR}/tls/signcerts/"* "${PEER0_DIR}/tls/server.crt"
    cp "${PEER0_DIR}/tls/keystore/"* "${PEER0_DIR}/tls/server.key"

    # ========================================
    # Inscription de peer1
    # ========================================
    
    infoln "Inscription de peer1.sensornetwork..."
    local PEER1_DIR="${ORG_DIR}/peers/peer1.sensornetwork.traffic.com"
    mkdir -p "${PEER1_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${PEER1_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${PEER1_DIR}/msp/config.yaml"
    
    # Inscription TLS pour peer1
    infoln "Inscription TLS pour peer1.sensornetwork..."
    set -x
    fabric-ca-client enroll -u https://peer1:peer1pw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${PEER1_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts peer1.sensornetwork.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${PEER1_DIR}/tls/tlscacerts/"* "${PEER1_DIR}/tls/ca.crt"
    cp "${PEER1_DIR}/tls/signcerts/"* "${PEER1_DIR}/tls/server.crt"
    cp "${PEER1_DIR}/tls/keystore/"* "${PEER1_DIR}/tls/server.key"

    # ========================================
    # Inscription User1
    # ========================================
    
    infoln "Inscription de User1..."
    local USER_DIR="${ORG_DIR}/users/User1@sensornetwork.traffic.com"
    mkdir -p "${USER_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://user1:user1pw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${USER_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${USER_DIR}/msp/config.yaml"

    # ========================================
    # Inscription Admin
    # ========================================
    
    infoln "Inscription de l'Admin..."
    local ADMIN_DIR="${ORG_DIR}/users/Admin@sensornetwork.traffic.com"
    mkdir -p "${ADMIN_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://sensornetworkadmin:sensornetworkadminpw@localhost:${CA_SENSOR_NETWORK_PORT} \
        --caname ca-sensornetwork \
        -M "${ADMIN_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ADMIN_DIR}/msp/config.yaml"

    # Copier le certificat CA dans le MSP de l'organisation
    mkdir -p "${ORG_DIR}/msp/tlscacerts"
    cp "${PEER0_DIR}/tls/tlscacerts/"* "${ORG_DIR}/msp/tlscacerts/ca.crt"

    successln "Identités SensorNetwork créées avec succès!"
}

# ============================================================================
# Inscription des Orderers
# ============================================================================

function createOrderers() {
    infoln "=========================================="
    infoln "Inscription des identités Orderer"
    infoln "=========================================="

    # Définir les chemins
    local CA_DIR="${PWD}/organizations/fabric-ca/ordererOrg"
    local ORG_DIR="${PWD}/organizations/ordererOrganizations/traffic.com"
    
    # Créer les répertoires nécessaires
    mkdir -p "${ORG_DIR}"
    
    # Exporter les variables pour fabric-ca-client
    export FABRIC_CA_CLIENT_HOME="${ORG_DIR}"
    
    infoln "Enregistrement de l'identité CA admin pour Orderer..."
    
    set -x
    fabric-ca-client enroll -u https://admin:adminpw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Créer le fichier config.yaml pour NodeOUs
    cat > "${ORG_DIR}/msp/config.yaml" <<EOF
NodeOUs:
  Enable: true
  ClientOUIdentifier:
    Certificate: cacerts/localhost-${CA_ORDERER_PORT}-ca-orderer.pem
    OrganizationalUnitIdentifier: client
  PeerOUIdentifier:
    Certificate: cacerts/localhost-${CA_ORDERER_PORT}-ca-orderer.pem
    OrganizationalUnitIdentifier: peer
  AdminOUIdentifier:
    Certificate: cacerts/localhost-${CA_ORDERER_PORT}-ca-orderer.pem
    OrganizationalUnitIdentifier: admin
  OrdererOUIdentifier:
    Certificate: cacerts/localhost-${CA_ORDERER_PORT}-ca-orderer.pem
    OrganizationalUnitIdentifier: orderer
EOF

    # ========================================
    # Enregistrement des orderers
    # ========================================
    
    infoln "Enregistrement de orderer1..."
    set -x
    fabric-ca-client register --caname ca-orderer \
        --id.name orderer1 \
        --id.secret orderer1pw \
        --id.type orderer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de orderer2..."
    set -x
    fabric-ca-client register --caname ca-orderer \
        --id.name orderer2 \
        --id.secret orderer2pw \
        --id.type orderer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de orderer3..."
    set -x
    fabric-ca-client register --caname ca-orderer \
        --id.name orderer3 \
        --id.secret orderer3pw \
        --id.type orderer \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    infoln "Enregistrement de l'admin orderer..."
    set -x
    fabric-ca-client register --caname ca-orderer \
        --id.name ordererAdmin \
        --id.secret ordererAdminpw \
        --id.type admin \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null

    # ========================================
    # Inscription de orderer1
    # ========================================
    
    infoln "Inscription de orderer1..."
    local ORDERER1_DIR="${ORG_DIR}/orderers/orderer1.traffic.com"
    mkdir -p "${ORDERER1_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://orderer1:orderer1pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER1_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ORDERER1_DIR}/msp/config.yaml"
    
    # Inscription TLS pour orderer1
    infoln "Inscription TLS pour orderer1..."
    set -x
    fabric-ca-client enroll -u https://orderer1:orderer1pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER1_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts orderer1.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${ORDERER1_DIR}/tls/tlscacerts/"* "${ORDERER1_DIR}/tls/ca.crt"
    cp "${ORDERER1_DIR}/tls/signcerts/"* "${ORDERER1_DIR}/tls/server.crt"
    cp "${ORDERER1_DIR}/tls/keystore/"* "${ORDERER1_DIR}/tls/server.key"

    # ========================================
    # Inscription de orderer2
    # ========================================
    
    infoln "Inscription de orderer2..."
    local ORDERER2_DIR="${ORG_DIR}/orderers/orderer2.traffic.com"
    mkdir -p "${ORDERER2_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://orderer2:orderer2pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER2_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ORDERER2_DIR}/msp/config.yaml"
    
    # Inscription TLS pour orderer2
    infoln "Inscription TLS pour orderer2..."
    set -x
    fabric-ca-client enroll -u https://orderer2:orderer2pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER2_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts orderer2.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${ORDERER2_DIR}/tls/tlscacerts/"* "${ORDERER2_DIR}/tls/ca.crt"
    cp "${ORDERER2_DIR}/tls/signcerts/"* "${ORDERER2_DIR}/tls/server.crt"
    cp "${ORDERER2_DIR}/tls/keystore/"* "${ORDERER2_DIR}/tls/server.key"

    # ========================================
    # Inscription de orderer3
    # ========================================
    
    infoln "Inscription de orderer3..."
    local ORDERER3_DIR="${ORG_DIR}/orderers/orderer3.traffic.com"
    mkdir -p "${ORDERER3_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://orderer3:orderer3pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER3_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ORDERER3_DIR}/msp/config.yaml"
    
    # Inscription TLS pour orderer3
    infoln "Inscription TLS pour orderer3..."
    set -x
    fabric-ca-client enroll -u https://orderer3:orderer3pw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ORDERER3_DIR}/tls" \
        --enrollment.profile tls \
        --csr.hosts orderer3.traffic.com \
        --csr.hosts localhost \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    # Copier les certificats TLS
    cp "${ORDERER3_DIR}/tls/tlscacerts/"* "${ORDERER3_DIR}/tls/ca.crt"
    cp "${ORDERER3_DIR}/tls/signcerts/"* "${ORDERER3_DIR}/tls/server.crt"
    cp "${ORDERER3_DIR}/tls/keystore/"* "${ORDERER3_DIR}/tls/server.key"

    # ========================================
    # Inscription Admin Orderer
    # ========================================
    
    infoln "Inscription de l'Admin Orderer..."
    local ADMIN_DIR="${ORG_DIR}/users/Admin@traffic.com"
    mkdir -p "${ADMIN_DIR}"
    
    set -x
    fabric-ca-client enroll -u https://ordererAdmin:ordererAdminpw@localhost:${CA_ORDERER_PORT} \
        --caname ca-orderer \
        -M "${ADMIN_DIR}/msp" \
        --tls.certfiles "${CA_DIR}/ca-cert.pem"
    { set +x; } 2>/dev/null
    
    cp "${ORG_DIR}/msp/config.yaml" "${ADMIN_DIR}/msp/config.yaml"

    # Copier le certificat CA dans le MSP de l'organisation
    mkdir -p "${ORG_DIR}/msp/tlscacerts"
    cp "${ORDERER1_DIR}/tls/tlscacerts/"* "${ORG_DIR}/msp/tlscacerts/tlsca.traffic.com-cert.pem"

    successln "Identités Orderer créées avec succès!"
}

# ============================================================================
# Fonction principale pour créer toutes les identités
# ============================================================================

function createAllIdentities() {
    infoln "=============================================="
    infoln "Création de toutes les identités du réseau"
    infoln "=============================================="
    
    # Attendre que toutes les CAs soient prêtes
    waitForCA "CA-TrafficAuthority" ${CA_TRAFFIC_AUTHORITY_PORT}
    waitForCA "CA-MobilityServices" ${CA_MOBILITY_SERVICES_PORT}
    waitForCA "CA-SensorNetwork" ${CA_SENSOR_NETWORK_PORT}
    waitForCA "CA-Orderer" ${CA_ORDERER_PORT}
    
    # Créer les identités pour chaque organisation
    createTrafficAuthority
    createMobilityServices
    createSensorNetwork
    createOrderers
    
    successln "=============================================="
    successln "Toutes les identités ont été créées avec succès!"
    successln "=============================================="
}

# ============================================================================
# Point d'entrée du script
# ============================================================================

# Analyser les arguments
MODE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -org1|--traffic-authority)
            MODE="org1"
            shift
            ;;
        -org2|--mobility-services)
            MODE="org2"
            shift
            ;;
        -org3|--sensor-network)
            MODE="org3"
            shift
            ;;
        -orderer|--orderers)
            MODE="orderer"
            shift
            ;;
        -all|--all)
            MODE="all"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -org1, --traffic-authority  Créer les identités TrafficAuthority"
            echo "  -org2, --mobility-services  Créer les identités MobilityServices"
            echo "  -org3, --sensor-network     Créer les identités SensorNetwork"
            echo "  -orderer, --orderers        Créer les identités Orderer"
            echo "  -all, --all                 Créer toutes les identités"
            echo "  -h, --help                  Afficher cette aide"
            exit 0
            ;;
        *)
            errorln "Option inconnue: $1"
            exit 1
            ;;
    esac
done

# Exécuter selon le mode
case $MODE in
    org1)
        createTrafficAuthority
        ;;
    org2)
        createMobilityServices
        ;;
    org3)
        createSensorNetwork
        ;;
    orderer)
        createOrderers
        ;;
    all)
        createAllIdentities
        ;;
    *)
        echo "Usage: $0 [-org1|-org2|-org3|-orderer|-all]"
        echo "Utilisez -h pour plus d'informations"
        exit 1
        ;;
esac
