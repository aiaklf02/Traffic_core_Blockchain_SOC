#!/bin/bash

# ============================================================================
# Script d'installation de Hyperledger Fabric pour Traffic Core
# Version: 2.5.4
# ============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
FABRIC_VERSION="2.5.4"
FABRIC_CA_VERSION="1.5.7"
FABRIC_DIR="$HOME/fabric"

print_header() {
    echo -e "${BLUE}"
    echo "============================================================================"
    echo "  $1"
    echo "============================================================================"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Vérifier les prérequis
check_prerequisites() {
    print_header "Vérification des prérequis"
    
    local missing=0
    
    # Docker
    if command -v docker &> /dev/null; then
        print_success "Docker: $(docker --version)"
    else
        print_error "Docker n'est pas installé"
        missing=1
    fi
    
    # Docker Compose
    if docker compose version &> /dev/null; then
        print_success "Docker Compose: $(docker compose version)"
    else
        print_error "Docker Compose n'est pas installé"
        missing=1
    fi
    
    # Go
    if command -v go &> /dev/null; then
        print_success "Go: $(go version)"
    else
        print_warning "Go n'est pas installé (optionnel pour le développement chaincode)"
    fi
    
    # Vérifier que Docker fonctionne
    if ! docker info &> /dev/null; then
        print_error "Docker n'est pas en cours d'exécution ou vous n'avez pas les permissions"
        print_info "Essayez: sudo systemctl start docker"
        print_info "Ou ajoutez votre utilisateur au groupe docker: sudo usermod -aG docker $USER"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        print_error "Certains prérequis sont manquants. Exécutez d'abord: ./scripts/install-prerequisites.sh"
        exit 1
    fi
    
    print_success "Tous les prérequis sont satisfaits"
}

# Créer le répertoire Fabric
setup_fabric_directory() {
    print_header "Configuration du répertoire Fabric"
    
    mkdir -p "$FABRIC_DIR"
    cd "$FABRIC_DIR"
    
    print_success "Répertoire créé: $FABRIC_DIR"
}

# Télécharger les binaires Fabric
download_fabric_binaries() {
    print_header "Téléchargement des binaires Hyperledger Fabric ${FABRIC_VERSION}"
    
    cd "$FABRIC_DIR"
    
    # Vérifier si les binaires existent déjà
    if [ -f "$FABRIC_DIR/bin/peer" ]; then
        print_warning "Les binaires Fabric existent déjà"
        read -p "Voulez-vous les réinstaller? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    fi
    
    # Télécharger le script d'installation officiel
    curl -sSL https://bit.ly/2ysbOFE | bash -s -- ${FABRIC_VERSION} ${FABRIC_CA_VERSION}

    # Copier les binaires dans /usr/local/bin pour un accès global
    if [ -d "$FABRIC_DIR/bin" ]; then
        print_info "Installation des binaires Fabric dans /usr/local/bin ..."
        sudo cp $FABRIC_DIR/bin/* /usr/local/bin/
        print_success "Binaires copiés dans /usr/local/bin"
    else
        print_warning "Dossier $FABRIC_DIR/bin introuvable, installation globale des binaires ignorée."
    fi

    print_success "Binaires téléchargés"
}

# Configurer les variables d'environnement
setup_environment() {
    print_header "Configuration des variables d'environnement"
    
    # Ajouter au .bashrc
    if ! grep -q "FABRIC_CFG_PATH" ~/.bashrc; then
        echo "" >> ~/.bashrc
        echo "# Hyperledger Fabric configuration" >> ~/.bashrc
        echo "export FABRIC_DIR=$FABRIC_DIR" >> ~/.bashrc
        echo "export PATH=\$PATH:$FABRIC_DIR/bin" >> ~/.bashrc
        echo "export FABRIC_CFG_PATH=$FABRIC_DIR/config" >> ~/.bashrc
    fi
    
    # Exporter pour la session actuelle
    export FABRIC_DIR=$FABRIC_DIR
    export PATH=$PATH:$FABRIC_DIR/bin
    export FABRIC_CFG_PATH=$FABRIC_DIR/config
    
    print_success "Variables d'environnement configurées"
    print_info "N'oubliez pas d'exécuter: source ~/.bashrc"
}

# Télécharger les images Docker
download_docker_images() {
    print_header "Téléchargement des images Docker Hyperledger Fabric"
    
    echo "Cette opération peut prendre plusieurs minutes..."
    echo ""
    
    # Images Fabric
    local images=(
        "hyperledger/fabric-peer:${FABRIC_VERSION}"
        "hyperledger/fabric-orderer:${FABRIC_VERSION}"
        "hyperledger/fabric-ccenv:${FABRIC_VERSION}"
        "hyperledger/fabric-tools:${FABRIC_VERSION}"
        "hyperledger/fabric-baseos:${FABRIC_VERSION}"
        "hyperledger/fabric-ca:${FABRIC_CA_VERSION}"
    )
    
    # Images additionnelles
    local additional_images=(
        "couchdb:3.3.2"
        "busybox:latest"
    )
    
    echo "Téléchargement des images Fabric..."
    for image in "${images[@]}"; do
        echo -n "  Pulling $image... "
        if docker pull "$image" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}ÉCHEC${NC}"
        fi
    done
    
    echo ""
    echo "Téléchargement des images additionnelles..."
    for image in "${additional_images[@]}"; do
        echo -n "  Pulling $image... "
        if docker pull "$image" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}ÉCHEC${NC}"
        fi
    done
    
    print_success "Images Docker téléchargées"
}

# Vérifier l'installation
verify_installation() {
    print_header "Vérification de l'installation"
    
    echo "Binaires Fabric:"
    echo "----------------"
    
    local binaries=("peer" "orderer" "configtxgen" "configtxlator" "cryptogen" "discover" "osnadmin")
    
    for binary in "${binaries[@]}"; do
        if [ -f "$FABRIC_DIR/bin/$binary" ]; then
            echo -e "  $binary: ${GREEN}✓${NC}"
        else
            echo -e "  $binary: ${RED}✗${NC}"
        fi
    done
    
    echo ""
    echo "Images Docker Fabric:"
    echo "---------------------"
    
    docker images | grep -E "hyperledger/fabric|couchdb" | awk '{printf "  %-40s %s\n", $1, $2}'
    
    echo ""
}

# Créer les fichiers de configuration par défaut
create_default_configs() {
    print_header "Création des fichiers de configuration"
    
    mkdir -p "$FABRIC_DIR/config"
    
    # Copier les fichiers de configuration depuis fabric-samples si disponibles
    if [ -d "$FABRIC_DIR/fabric-samples/config" ]; then
        cp -r "$FABRIC_DIR/fabric-samples/config/"* "$FABRIC_DIR/config/" 2>/dev/null || true
        print_success "Fichiers de configuration copiés depuis fabric-samples"
    fi
    
    print_success "Configuration terminée"
}

# Fonction principale
main() {
    print_header "Installation de Hyperledger Fabric ${FABRIC_VERSION}"
    
    check_prerequisites
    setup_fabric_directory
    download_fabric_binaries
    download_docker_images
    setup_environment
    create_default_configs
    verify_installation
    
    echo -e "${GREEN}"
    echo "============================================================================"
    echo "  Hyperledger Fabric ${FABRIC_VERSION} a été installé avec succès!"
    echo "============================================================================"
    echo -e "${NC}"
    echo ""
    echo "Configuration:"
    echo "  - Répertoire Fabric: $FABRIC_DIR"
    echo "  - Binaires:          $FABRIC_DIR/bin"
    echo "  - Configuration:     $FABRIC_DIR/config"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Exécutez: source ~/.bashrc"
    echo "  2. Vérifiez: peer version"
    echo "  3. Lancez le réseau: ./scripts/network.sh up"
    echo ""
}

# Exécution
main "$@"
