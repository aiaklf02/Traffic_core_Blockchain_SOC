#!/bin/bash

# ============================================================================
# Script d'installation des prérequis pour Traffic Core
# Hyperledger Fabric Smart City Simulator
# ============================================================================

set -e

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Détecter le système d'exploitation
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
            PKG_MANAGER="apt-get"
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
            PKG_MANAGER="yum"
        else
            OS="linux"
            PKG_MANAGER="apt-get"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        PKG_MANAGER="brew"
    else
        print_error "Système d'exploitation non supporté: $OSTYPE"
        exit 1
    fi
    print_info "Système détecté: $OS"
}

# Mise à jour du système
update_system() {
    print_header "Mise à jour du système"
    
    if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
        sudo apt-get update -y
        sudo apt-get upgrade -y
    elif [ "$OS" == "redhat" ]; then
        sudo yum update -y
    elif [ "$OS" == "macos" ]; then
        brew update
    fi
    
    print_success "Système mis à jour"
}

# Installation des outils de base
install_basic_tools() {
    print_header "Installation des outils de base"
    
    if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
        sudo apt-get install -y \
            curl \
            wget \
            git \
            jq \
            tree \
            unzip \
            build-essential \
            software-properties-common \
            apt-transport-https \
            ca-certificates \
            gnupg \
            lsb-release
    elif [ "$OS" == "macos" ]; then
        brew install curl wget git jq tree
    fi
    
    print_success "Outils de base installés"
}

# Installation de Docker
install_docker() {
    print_header "Installation de Docker"
    
    # Vérifier si Docker est déjà installé
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_warning "Docker est déjà installé: $DOCKER_VERSION"
        return
    fi
    
    if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
        # Supprimer les anciennes versions
        sudo apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
        
        # Ajouter la clé GPG officielle de Docker
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        
        # Ajouter le repository Docker
        echo \
            "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
            $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
            sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Installer Docker
        sudo apt-get update -y
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
    elif [ "$OS" == "macos" ]; then
        print_info "Veuillez installer Docker Desktop depuis https://www.docker.com/products/docker-desktop"
        print_info "Puis relancez ce script."
        exit 1
    fi
    
    # Ajouter l'utilisateur au groupe docker
    sudo usermod -aG docker $USER
    
    # Démarrer Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installé"
    print_warning "Vous devrez peut-être vous déconnecter/reconnecter pour utiliser Docker sans sudo"
}

# Installation de Docker Compose
install_docker_compose() {
    print_header "Installation de Docker Compose"
    
    # Docker Compose v2 est inclus avec docker-compose-plugin
    if docker compose version &> /dev/null; then
        COMPOSE_VERSION=$(docker compose version)
        print_success "Docker Compose est disponible: $COMPOSE_VERSION"
        return
    fi
    
    # Installation standalone si nécessaire
    COMPOSE_VERSION="v2.24.0"
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installé"
}

# Installation de Go
install_go() {
    print_header "Installation de Go"
    
    GO_VERSION="1.21.5"
    
    # Vérifier si Go est déjà installé
    if command -v go &> /dev/null; then
        CURRENT_GO=$(go version)
        print_warning "Go est déjà installé: $CURRENT_GO"
        return
    fi
    
    if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
        # Télécharger Go
        wget -q https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz -O /tmp/go.tar.gz
        
        # Supprimer l'ancienne installation
        sudo rm -rf /usr/local/go
        
        # Extraire
        sudo tar -C /usr/local -xzf /tmp/go.tar.gz
        
        # Nettoyer
        rm /tmp/go.tar.gz
        
    elif [ "$OS" == "macos" ]; then
        brew install go
    fi
    
    # Configurer les variables d'environnement
    if ! grep -q "GOPATH" ~/.bashrc; then
        echo "" >> ~/.bashrc
        echo "# Go configuration" >> ~/.bashrc
        echo "export GOPATH=\$HOME/go" >> ~/.bashrc
        echo "export GOROOT=/usr/local/go" >> ~/.bashrc
        echo "export PATH=\$PATH:\$GOROOT/bin:\$GOPATH/bin" >> ~/.bashrc
    fi
    
    export GOPATH=$HOME/go
    export GOROOT=/usr/local/go
    export PATH=$PATH:$GOROOT/bin:$GOPATH/bin
    
    print_success "Go ${GO_VERSION} installé"
}

# Installation de Node.js
install_nodejs() {
    print_header "Installation de Node.js"
    
    NODE_VERSION="20"
    
    # Vérifier si Node.js est déjà installé
    if command -v node &> /dev/null; then
        CURRENT_NODE=$(node --version)
        print_warning "Node.js est déjà installé: $CURRENT_NODE"
        return
    fi
    
    if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
        # Installer via NodeSource (version LTS)
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
    elif [ "$OS" == "macos" ]; then
        brew install node@${NODE_VERSION}
    fi
    
    # Installer npm globalement
    sudo npm install -g npm@latest
    
    print_success "Node.js installé"
}

# Installation de Python
install_python() {
    print_header "Installation de Python"
    
    # Vérifier si Python est déjà installé
    if command -v python3 &> /dev/null; then
        CURRENT_PYTHON=$(python3 --version)
        print_warning "Python est déjà installé: $CURRENT_PYTHON"
    else
        if [ "$OS" == "debian" ] || [ "$OS" == "linux" ]; then
            sudo apt-get install -y python3 python3-pip python3-venv
        elif [ "$OS" == "macos" ]; then
            brew install python3
        fi
    fi
    
    # Installer pip si nécessaire
    if ! command -v pip3 &> /dev/null; then
        curl https://bootstrap.pypa.io/get-pip.py -o /tmp/get-pip.py
        python3 /tmp/get-pip.py
        rm /tmp/get-pip.py
    fi
    
    print_success "Python installé"
}

# Vérification de l'installation
verify_installation() {
    print_header "Vérification de l'installation"
    
    echo ""
    echo "Versions installées:"
    echo "-------------------"
    
    if command -v docker &> /dev/null; then
        echo -e "Docker:         ${GREEN}$(docker --version)${NC}"
    else
        echo -e "Docker:         ${RED}Non installé${NC}"
    fi
    
    if docker compose version &> /dev/null; then
        echo -e "Docker Compose: ${GREEN}$(docker compose version)${NC}"
    else
        echo -e "Docker Compose: ${RED}Non installé${NC}"
    fi
    
    if command -v go &> /dev/null; then
        echo -e "Go:             ${GREEN}$(go version)${NC}"
    else
        echo -e "Go:             ${RED}Non installé${NC}"
    fi
    
    if command -v node &> /dev/null; then
        echo -e "Node.js:        ${GREEN}$(node --version)${NC}"
    else
        echo -e "Node.js:        ${RED}Non installé${NC}"
    fi
    
    if command -v npm &> /dev/null; then
        echo -e "npm:            ${GREEN}$(npm --version)${NC}"
    else
        echo -e "npm:            ${RED}Non installé${NC}"
    fi
    
    if command -v python3 &> /dev/null; then
        echo -e "Python:         ${GREEN}$(python3 --version)${NC}"
    else
        echo -e "Python:         ${RED}Non installé${NC}"
    fi
    
    if command -v pip3 &> /dev/null; then
        echo -e "pip:            ${GREEN}$(pip3 --version)${NC}"
    else
        echo -e "pip:            ${RED}Non installé${NC}"
    fi
    
    echo ""
}

# Fonction principale
main() {
    print_header "Installation des prérequis pour Traffic Core"
    
    detect_os
    update_system
    install_basic_tools
    install_docker
    install_docker_compose
    install_go
    install_nodejs
    install_python
    verify_installation
    
    print_header "Installation terminée!"
    
    echo -e "${GREEN}"
    echo "============================================================================"
    echo "  Tous les prérequis ont été installés avec succès!"
    echo "============================================================================"
    echo -e "${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "  1. Déconnectez-vous et reconnectez-vous (pour les permissions Docker)"
    echo "  2. Exécutez: ./scripts/install-fabric.sh"
    echo ""
}

# Exécution
main "$@"
