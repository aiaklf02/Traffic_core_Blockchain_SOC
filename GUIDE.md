# 📋 Guide d'Utilisation - Traffic Core

## 🚀 Quick Start (5 minutes)

```bash
# 1. Cloner le projet
git clone https://github.com/your-repo/traffic-core.git
cd traffic-core

# 2. Installer les prérequis (si pas déjà fait)
chmod +x scripts/*.sh
./scripts/install-prerequisites.sh
./scripts/install-fabric.sh

# 3. Démarrer tout le projet
./start-all.sh

# 4. Ouvrir le dashboard
# http://localhost:5176
# Login: admin / admin123
```

---

## 📋 Prérequis

### Configuration Système Requise

| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| **OS** | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| **RAM** | 8 GB | 16 GB (pour LLM) |
| **Disque** | 30 GB libre | 50 GB libre |
| **CPU** | 4 cores | 8 cores |

### Vérifier les Logiciels Installés

```bash
docker --version          # Doit être 24.0+
docker-compose --version  # Doit être 2.0+
go version               # Doit être 1.21+
node --version           # Doit être 18+
```

---

## 📥 Étape 1: Installation des Prérequis

### Option A: Installation Automatique (Recommandée)

```bash
cd traffic-core
chmod +x scripts/*.sh

# Installe Docker, Go, Node.js
./scripts/install-prerequisites.sh

# Installe Hyperledger Fabric
./scripts/install-fabric.sh

# Ajouter Fabric au PATH
echo 'export PATH=$PATH:$HOME/fabric/fabric-samples/bin' >> ~/.bashrc
source ~/.bashrc
```

### Option B: Installation Manuelle

```bash
# Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
newgrp docker

# Go 1.21
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Hyperledger Fabric 2.5.4
mkdir -p ~/fabric && cd ~/fabric
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.4 1.5.7
echo 'export PATH=$PATH:$HOME/fabric/fabric-samples/bin' >> ~/.bashrc
source ~/.bashrc
```

---

## 🔧 Étape 2: Installation des Dépendances Node.js

```bash
cd traffic-core

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Simulator
cd simulator && npm install && cd ..
```

---

## 🚀 Étape 3: Démarrage du Projet

### Option A: Démarrage Complet (Recommandée)

```bash
./start-all.sh
```

Cette commande démarre automatiquement:
- ✅ Réseau Hyperledger Fabric (17 conteneurs)
- ✅ 3 Chaincodes (road-manager, sensor-data, traffic-registry)
- ✅ Backend API (port 3000)
- ✅ Frontend Dashboard (port 5176)
- ✅ Simulateur IoT

### Option B: Démarrage Manuel (Étape par Étape)

```bash
# Terminal 1: Démarrer le réseau blockchain
./scripts/network.sh up
./scripts/network.sh deployCC

# Terminal 2: Démarrer le backend
cd backend && npm run dev

# Terminal 3: Démarrer le frontend
cd frontend && npm run dev

# Terminal 4: Démarrer le simulateur (optionnel)
cd simulator && npm start
```

---

## 🖥️ Étape 4: Accéder au Dashboard

### Connexion

1. Ouvrir votre navigateur
2. Aller à: **http://localhost:5176**
3. Se connecter avec:
   - **Username:** `admin`
   - **Password:** `admin123`

### Pages Disponibles

| Page | URL | Description |
|------|-----|-------------|
| **Dashboard** | `/dashboard` | Vue d'ensemble + Live Violations |
| **Roads** | `/roads` | Routes (10) + Intersections (8) |
| **Sensors** | `/sensors` | Capteurs IoT |
| **Registry** | `/registry` | Véhicules & Conducteurs |
| **Security** | `/security` | SOC avec 4 agents IA |
| **Simulation** | `/simulation` | Contrôle simulation + Logs blockchain |
| **Consensus** | `/consensus` | Tests PBFT vs PoA |

---

## 🔍 Étape 5: Tester les Fonctionnalités

### 5.1 Voir les Violations en Temps Réel

1. Aller sur **Dashboard**
2. Observer le panel "🚨 Live Violations Feed"
3. Les violations apparaissent automatiquement (refresh 3s)
4. Le simulateur génère des violations quand vitesse > limite

### 5.2 Tester le SOC (Security Operations Center)

1. Aller sur **Security**
2. Cliquer sur **"Activate SOC"**
3. Observer les 4 agents qui démarrent:
   - 🔍 **Sensor Agent** - Monitoring système
   - 🧠 **Analyzer Agent** - Analyse avec Mistral LLM
   - 🛡️ **Defender Agent** - Blocage IP
   - 🎮 **Controller Agent** - Orchestration
4. Cliquer sur **"Simulate DDoS"** ou **"Simulate Intrusion"**
5. Observer les logs de détection et réponse

### 5.3 Voir les Routes et Intersections

1. Aller sur **Roads**
2. Voir les 10 routes avec statuts variés:
   - 🟢 Open
   - 🔴 Closed
   - 🟠 Maintenance
   - 🟡 Congested
3. Voir les 8 intersections avec feux de circulation

### 5.4 Tester le Simulateur

1. Aller sur **Simulation**
2. Observer le terminal de logs blockchain
3. Les transactions apparaissent en temps réel:
   ```
   [12:34:56] 📤 TX: sensor-data.RecordReading
   [12:34:57] 🚨 VIOLATION: VEH-SIM-023 - 85km/h in 50km/h zone
   ```

---

## 🔌 API Endpoints (Pour Tests)

### Health Check
```bash
curl http://localhost:3000/api/v1/health
```

### Obtenir les Routes
```bash
curl http://localhost:3000/api/v1/roads
```

### Obtenir les Intersections
```bash
curl http://localhost:3000/api/v1/roads/intersections
```

### Obtenir les Violations
```bash
curl http://localhost:3000/api/v1/registry/violations
```

### Obtenir le Status SOC
```bash
curl http://localhost:3000/api/v1/soc/status
```

### Activer le SOC
```bash
curl -X POST http://localhost:3000/api/v1/soc/start
```

### Simuler une Attaque
```bash
curl -X POST http://localhost:3000/api/v1/soc/simulate-attack \
  -H "Content-Type: application/json" \
  -d '{"attackType": "ddos", "severity": "high"}'
```

---

## 🛑 Arrêter le Projet

### Arrêt Complet
```bash
./stop-all.sh
```

### Arrêt Manuel
```bash
# Arrêter le réseau Fabric
./scripts/network.sh down

# Ou arrêter et nettoyer tout
./scripts/network.sh clean
```

---

## 🐛 Dépannage

### Problème: "No space left on device"

```bash
# Nettoyer Docker
docker system prune -af --volumes
docker builder prune -af

# Vérifier l'espace
df -h
```

### Problème: "Connection refused" sur chaincode

```bash
# Vérifier les conteneurs
docker ps | grep ccaas

# Redémarrer les chaincodes
docker restart road-manager-ccaas sensor-data-ccaas traffic-registry-ccaas
```

### Problème: Frontend ne charge pas

```bash
# Vérifier que le backend tourne
curl http://localhost:3000/api/v1/health

# Redémarrer le frontend
cd frontend && npm run dev
```

### Problème: Pas de violations dans le dashboard

```bash
# Vérifier que le simulateur tourne
ps aux | grep simulator

# Relancer le simulateur
cd simulator && npm start
```

### Problème: SOC ne fonctionne pas

```bash
# Vérifier le status
curl http://localhost:3000/api/v1/soc/status

# Activer manuellement
curl -X POST http://localhost:3000/api/v1/soc/start
```

### Problème: Mistral LLM non disponible

Le système utilise automatiquement un fallback rule-based si Mistral n'est pas disponible.

Pour activer Mistral:
1. Télécharger [LM Studio](https://lmstudio.ai/)
2. Télécharger le modèle `mistral-7b-instruct-v0.2`
3. Démarrer le serveur local sur le port 1234
4. Le SOC détectera automatiquement Mistral

---

## 🌐 Ports Utilisés

| Service | Port | URL |
|---------|------|-----|
| **Frontend** | 5176 | http://localhost:5176 |
| **Backend API** | 3000 | http://localhost:3000 |
| **Peer0 Org1** | 7051 | - |
| **Peer0 Org2** | 8051 | - |
| **Peer0 Org3** | 9051 | - |
| **Orderer1** | 7050 | - |
| **road-manager** | 9999 | - |
| **sensor-data** | 9998 | - |
| **traffic-registry** | 9997 | - |
| **LM Studio** | 1234 | http://localhost:1234 |

---

## ✅ Checklist de Vérification

Après le démarrage, vérifiez:

- [ ] 17 conteneurs Docker en cours d'exécution
- [ ] Dashboard accessible sur http://localhost:5176
- [ ] Login réussi avec admin/admin123
- [ ] Routes affichées (10 routes)
- [ ] Intersections affichées (8 intersections)
- [ ] Live Violations Feed actif (refresh 3s)
- [ ] SOC peut être activé/désactivé
- [ ] Simulation d'attaque fonctionne

```bash
# Vérifier les conteneurs
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ccaas|cli"
```

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Vérifier les logs: `docker logs <container-name>`
2. Vérifier l'espace disque: `df -h`
3. Redémarrer le projet: `./stop-all.sh && ./start-all.sh`

---

*Guide mis à jour le 5 Janvier 2026*
