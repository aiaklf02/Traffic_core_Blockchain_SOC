# 🚦 Traffic Core - Smart City Blockchain Traffic Management System

## 📋 Cahier des Charges

### Informations Générales

| Élément | Détail |
|---------|--------|
| **Projet** | Traffic Core - Système de Gestion de Trafic Urbain Blockchain |
| **Version** | 2.0.0 |
| **Date** | Janvier 2026 |
| **Encadrant** | Pr. Ikram BEN ABDEL OUAHAB & Pr. Mohammed BOUHORMA|
| **Formation** | Master IASD - Spécialité Blockchain |
| **Année Universitaire** | 2025/2026 |

---

## 🎯 Objectifs du Projet

### Objectif Principal
Concevoir et implémenter un système de gestion de trafic urbain décentralisé pour une Smart City, utilisant la technologie blockchain Hyperledger Fabric avec un système de sécurité intelligent basé sur l'IA (Mistral LLM).

### Objectifs Spécifiques

| # | Objectif | Description |
|---|----------|-------------|
| 1 | **Décentralisation** | Éliminer les points de défaillance uniques via un réseau distribué |
| 2 | **Transparence** | Assurer la traçabilité des données de trafic sur la blockchain |
| 3 | **Sécurité** | SOC avec 4 agents IA et analyse Mistral LLM pour la détection des menaces |
| 4 | **Automatisation** | Détection automatique des violations de vitesse avec amendes |
| 5 | **Temps Réel** | Dashboard avec mise à jour en temps réel (3s) |
| 6 | **Scalabilité** | Architecture modulaire supportant l'ajout de capteurs IoT |

---

## 🏗️ Architecture du Système

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        TRAFFIC CORE - ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────────────────┐   │
│  │  Frontend   │────▶│   Backend   │────▶│   Hyperledger Fabric Network    │   │
│  │  React/Vite │     │  Express.js │     │   (3 Orgs, 6 Peers, 3 Orderers) │   │
│  │  Port 5176  │     │  Port 3000  │     │                                 │   │
│  └─────────────┘     └──────┬──────┘     └─────────────────────────────────┘   │
│                             │                                                   │
│                    ┌────────┴────────┐                                          │
│                    ▼                 ▼                                          │
│           ┌──────────────┐   ┌──────────────┐                                  │
│           │  Simulator   │   │  SOC Manager │                                  │
│           │  IoT Sensors │   │  4 AI Agents │                                  │
│           │  Violations  │   │  Mistral LLM │                                  │
│           └──────────────┘   └──────────────┘                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Réseau Hyperledger Fabric

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HYPERLEDGER FABRIC NETWORK                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  Orderer 1  │    │  Orderer 2  │    │  Orderer 3  │   ← Consensus Raft  │
│  │   :7050     │    │   :8050     │    │   :9050     │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
│  ┌─────────────────────── traffic-channel ──────────────────────────┐      │
│  │                                                                   │      │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │      │
│  │  │    Org1     │  │    Org2     │  │    Org3     │               │      │
│  │  │ TrafficAuth │  │  Mobility   │  │   Sensor    │               │      │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────┤               │      │
│  │  │ peer0 :7051 │  │ peer0 :8051 │  │ peer0 :9051 │               │      │
│  │  │ peer1 :7061 │  │ peer1 :8061 │  │ peer1 :9061 │               │      │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │      │
│  │                                                                   │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                                                             │
│  ┌────────────────────── CCaaS Chaincodes ───────────────────────────┐     │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐         │     │
│  │  │ road-manager │  │ sensor-data  │  │ traffic-registry │         │     │
│  │  │    :9999     │  │    :9998     │  │      :9997       │         │     │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘         │     │
│  └───────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Structure du Projet

```
traffic-core/
├── README.md                    # Ce fichier
├── start-all.sh                 # Démarrage complet du projet
├── stop-all.sh                  # Arrêt complet
│
├── backend/                     # 🖥️ API Express.js (Port 3000)
│   ├── package.json
│   └── src/
│       ├── app.js               # Configuration Express
│       ├── server.js            # Point d'entrée serveur
│       ├── config/
│       │   └── index.js         # Configuration (Fabric, JWT, LLM)
│       ├── controllers/
│       │   ├── auth.controller.js        # Authentification
│       │   ├── road.controller.js        # Routes et intersections
│       │   ├── sensor.controller.js      # Capteurs IoT
│       │   ├── registry.controller.js    # Véhicules, conducteurs, violations
│       │   ├── soc.controller.js         # Security Operations Center
│       │   ├── simulation.controller.js  # Contrôle simulation
│       │   └── consensus-test.controller.js  # Tests PBFT/PoA
│       ├── middleware/
│       │   ├── auth.middleware.js   # JWT verification
│       │   └── error.middleware.js  # Gestion erreurs
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── road.routes.js
│       │   ├── sensor.routes.js
│       │   ├── registry.routes.js   # POST /violations publique
│       │   ├── soc.routes.js
│       │   └── simulation.routes.js
│       ├── security/
│       │   ├── SOCManager.js           # Coordinateur SOC
│       │   ├── SOCBlockchainService.js # Incidents sur blockchain
│       │   └── agents/
│       │       ├── DefenderAgent.js    # Blocage IP, quarantaine
│       │       ├── SensorAgent.js      # Monitoring système
│       │       ├── AnalyzerAgent.js    # Analyse Mistral LLM
│       │       └── ControllerAgent.js  # Orchestration
│       ├── services/
│       │   └── fabric.service.js   # Client Hyperledger Fabric
│       └── utils/
│           └── logger.js           # Winston logging
│
├── frontend/                    # 🌐 Dashboard React (Port 5176)
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.cjs
│   └── src/
│       ├── App.jsx              # Routes React Router
│       ├── main.jsx             # Point d'entrée
│       ├── index.css            # TailwindCSS
│       ├── components/
│       │   ├── Layout.jsx       # Sidebar navigation
│       │   ├── ProtectedRoute.jsx
│       │   └── ...
│       └── pages/
│           ├── DashboardPage.jsx     # Stats + Live Violations Feed
│           ├── RoadsPage.jsx         # Routes + Intersections (8)
│           ├── SensorsPage.jsx       # Capteurs IoT
│           ├── RegistryPage.jsx      # Véhicules & Conducteurs
│           ├── SecurityPage.jsx      # SOC avec 4 agents
│           ├── SimulationPage.jsx    # Terminal blockchain logs
│           ├── ConsensusTestPage.jsx # Tests PBFT vs PoA
│           └── LoginPage.jsx
│
├── chaincode/                   # 📜 Smart Contracts (Go)
│   ├── road-manager/            # Gestion routes (Port 9999)
│   │   ├── main.go
│   │   ├── Dockerfile
│   │   └── chaincode/
│   │       ├── road_contract.go
│   │       ├── intersection_contract.go
│   │       ├── event_contract.go
│   │       └── models.go
│   │
│   ├── sensor-data/             # Capteurs IoT (Port 9998)
│   │   ├── main.go
│   │   ├── Dockerfile
│   │   └── chaincode/
│   │       ├── sensor_contract.go
│   │       ├── reading_contract.go
│   │       ├── alert_contract.go
│   │       └── models.go
│   │
│   └── traffic-registry/        # Registre (Port 9997)
│       ├── main.go
│       ├── Dockerfile
│       └── chaincode/
│           ├── vehicle_contract.go
│           ├── driver_contract.go
│           ├── violation_contract.go  # Amendes automatiques
│           ├── transfer_contract.go
│           └── models.go
│
├── simulator/                   # 🎮 Simulateur IoT
│   ├── package.json
│   └── src/
│       ├── index.js             # Boucle principale + violations
│       ├── scenario.js          # Scénarios (rush hour, pluie)
│       ├── logger.js            # Log fichier
│       └── utils.js
│
├── network/                     # 🔗 Configuration Fabric
│   ├── docker/
│   │   ├── docker-compose.yaml  # 17 conteneurs
│   │   └── Dockerfile.*
│   ├── configtx/
│   │   └── configtx.yaml        # Channel & policies
│   ├── organizations/
│   │   ├── crypto-config.yaml
│   │   ├── ordererOrganizations/
│   │   └── peerOrganizations/
│   └── scripts/
│       ├── envVar.sh
│       └── ...
│
└── scripts/                     # 🛠️ Scripts d'installation
    ├── install-prerequisites.sh # Docker, Go, Node.js
    ├── install-fabric.sh        # Hyperledger Fabric 2.5.4
    └── network.sh               # up, down, deployCC
```

---

## 📊 Schémas de Données (Chaincodes)

### 1. Road Manager - Routes

```go
type Road struct {
    DocType         string    `json:"docType"`         // "road"
    ID              string    `json:"id"`              // "ROAD-001"
    Name            string    `json:"name"`            // "Avenue Mohammed V"
    Type            RoadType  `json:"type"`            // highway, primary, boulevard
    Status          string    `json:"status"`          // open, closed, maintenance, congested
    StartPoint      GeoPoint  `json:"startPoint"`
    EndPoint        GeoPoint  `json:"endPoint"`
    Length          float64   `json:"length"`          // en mètres
    Lanes           int       `json:"lanes"`           // nombre de voies
    SpeedLimit      int       `json:"speedLimit"`      // km/h
    CurrentSpeed    float64   `json:"currentSpeed"`    // vitesse moyenne actuelle
    VehicleCount    int       `json:"vehicleCount"`    // véhicules sur la route
    CongestionLevel float64   `json:"congestionLevel"` // 0.0 - 1.0
    District        string    `json:"district"`
    City            string    `json:"city"`
    CreatedAt       time.Time `json:"createdAt"`
    LastUpdated     time.Time `json:"lastUpdated"`
}

type Intersection struct {
    DocType             string       `json:"docType"`             // "intersection"
    ID                  string       `json:"id"`                  // "INT-001"
    Name                string       `json:"name"`
    Type                string       `json:"type"`                // signalized, roundabout
    Location            GeoPoint     `json:"location"`
    ConnectedRoads      []string     `json:"connectedRoads"`      // ["ROAD-001", "ROAD-002"]
    TrafficLights       []Light      `json:"trafficLights"`
    PedestrianCrossings int          `json:"pedestrianCrossings"`
    Status              string       `json:"status"`              // active, inactive
}
```

### 2. Sensor Data - Capteurs IoT

```go
type Sensor struct {
    DocType         string    `json:"docType"`         // "sensor"
    ID              string    `json:"id"`              // "SENSOR-001"
    Name            string    `json:"name"`
    Type            string    `json:"type"`            // traffic, speed, weather, air_quality
    Status          string    `json:"status"`          // active, inactive, maintenance
    Location        GeoPoint  `json:"location"`
    RoadID          string    `json:"roadId"`
    Manufacturer    string    `json:"manufacturer"`
    Model           string    `json:"model"`
    FirmwareVersion string    `json:"firmwareVersion"`
    BatteryLevel    float64   `json:"batteryLevel"`    // %
    SignalStrength  float64   `json:"signalStrength"`  // %
    ReadingInterval int       `json:"readingInterval"` // secondes
    LastReading     time.Time `json:"lastReading"`
}

type SensorReading struct {
    DocType   string                 `json:"docType"`   // "reading"
    ID        string                 `json:"id"`
    SensorID  string                 `json:"sensorId"`
    Type      string                 `json:"type"`
    Value     map[string]interface{} `json:"value"`     // données variables
    Timestamp time.Time              `json:"timestamp"`
    Quality   float64                `json:"quality"`   // 0.0 - 1.0
}
```

### 3. Traffic Registry - Véhicules & Violations

```go
type Vehicle struct {
    DocType            string        `json:"docType"`            // "vehicle"
    ID                 string        `json:"id"`                 // "VEH-001"
    PlateNumber        string        `json:"plateNumber"`        // "12345-A-67"
    VIN                string        `json:"vin"`
    Type               VehicleType   `json:"type"`               // CAR, TRUCK, BUS, MOTORCYCLE
    Status             VehicleStatus `json:"status"`             // ACTIVE, SUSPENDED, STOLEN
    Brand              string        `json:"brand"`
    Model              string        `json:"model"`
    Year               int           `json:"year"`
    Color              string        `json:"color"`
    FuelType           FuelType      `json:"fuelType"`           // GASOLINE, DIESEL, ELECTRIC, HYBRID
    OwnerID            string        `json:"ownerId"`
    InsuranceExpiry    time.Time     `json:"insuranceExpiry"`
    NextInspectionDue  time.Time     `json:"nextInspectionDue"`
}

type Driver struct {
    DocType         string          `json:"docType"`         // "driver"
    ID              string          `json:"id"`              // "DRV-001"
    NationalID      string          `json:"nationalId"`
    FirstName       string          `json:"firstName"`
    LastName        string          `json:"lastName"`
    DateOfBirth     time.Time       `json:"dateOfBirth"`
    LicenseNumber   string          `json:"licenseNumber"`
    LicenseCategory LicenseCategory `json:"licenseCategory"` // A, B, C, D
    LicenseExpiry   time.Time       `json:"licenseExpiry"`
    LicenseStatus   LicenseStatus   `json:"licenseStatus"`   // VALID, EXPIRED, SUSPENDED
    Points          int             `json:"points"`          // 12 points (permis à points)
    TotalViolations int             `json:"totalViolations"`
}

type TrafficViolation struct {
    DocType        string    `json:"docType"`        // "violation"
    ID             string    `json:"id"`             // "VIO-1704456789-abc123"
    VehicleID      string    `json:"vehicleId"`
    DriverID       string    `json:"driverId"`
    PlateNumber    string    `json:"plateNumber"`
    ViolationType  string    `json:"violationType"`  // speeding, red_light, parking
    Description    string    `json:"description"`
    Location       GeoPoint  `json:"location"`
    RoadID         string    `json:"roadId"`
    SpeedLimit     int       `json:"speedLimit"`
    RecordedSpeed  int       `json:"recordedSpeed"`
    FineAmount     float64   `json:"fineAmount"`     // en MAD (Dirham)
    PointsDeducted int       `json:"pointsDeducted"`
    Status         string    `json:"status"`         // pending, paid, contested, cancelled
    DetectedBy     string    `json:"detectedBy"`     // SENSOR-001
    EvidenceHash   string    `json:"evidenceHash"`   // hash SHA256
    Timestamp      time.Time `json:"timestamp"`
    DueDate        time.Time `json:"dueDate"`        // +30 jours
}
```

### Barème des Amendes (Loi Marocaine)

| Excès de Vitesse | Amende (MAD) | Points Retirés | Sévérité |
|------------------|--------------|----------------|----------|
| ≤ 20 km/h        | 400          | 2              | low      |
| 21-30 km/h       | 700          | 4              | medium   |
| 31-50 km/h       | 1,500        | 4              | high     |
| > 50 km/h        | 3,000        | 6              | critical |

---

## 🛡️ SOC - Security Operations Center

### Architecture des Agents

```
┌───────────────────────────────────────────────────────────────┐
│                      SOC MANAGER                              │
│              (Coordinateur Central)                           │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   SENSOR    │  │  ANALYZER   │  │  DEFENDER   │           │
│  │   AGENT     │  │   AGENT     │  │   AGENT     │           │
│  │             │  │             │  │             │           │
│  │ • CPU/RAM   │  │ • Mistral   │  │ • Block IP  │           │
│  │ • Network   │  │   LLM       │  │ • Quarantine│           │
│  │ • Anomalies │  │ • Threat    │  │ • Firewall  │           │
│  │             │  │   Analysis  │  │             │           │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │
│         │                │                │                   │
│         └────────────────┼────────────────┘                   │
│                          ▼                                    │
│              ┌─────────────────────┐                          │
│              │   CONTROLLER AGENT  │                          │
│              │   (Orchestration)   │                          │
│              └──────────┬──────────┘                          │
│                         │                                     │
│                         ▼                                     │
│              ┌─────────────────────┐                          │
│              │     BLOCKCHAIN      │                          │
│              │  (sensor-data CC)   │                          │
│              │  Incidents immuables│                          │
│              └─────────────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

### Analyse Mistral LLM

```javascript
// Configuration LLM (backend/src/config/index.js)
llm: {
    endpoint: process.env.LLM_ENDPOINT || 'http://localhost:1234',
    model: process.env.LLM_MODEL || 'mistral-7b-instruct-v0.2',
    timeout: 30000,
    maxTokens: 1000,
    temperature: 0.3
}

// Prompt envoyé à Mistral (AnalyzerAgent.js)
const prompt = `You are a cybersecurity expert analyzing threats 
in a Smart City Traffic Management System.

THREAT DETAILS:
- Type: ${threat.type}
- Severity: ${threat.severity}
- Source: ${threat.source}
- Description: ${threat.description}

ANALYZE AND PROVIDE:
1. Risk Assessment (1-10)
2. Attack Vector
3. Impact Analysis
4. Recommended Actions
5. Blockchain Implications

Respond in JSON format...`;
```

---

## 🚀 Installation Complète

### Prérequis Système

| Composant | Version | Notes |
|-----------|---------|-------|
| Ubuntu | 22.04 LTS | Recommandé |
| RAM | 12 GB min | 16 GB pour LLM |
| Disque | 60 GB libre | +30 GB pour LM Studio |
| Docker | 24.0+ | + Docker Compose |
| Go | 1.21+ | Pour chaincodes |
| Node.js | 18+ | Backend/Frontend |
| Fabric | 2.5.4 | Binaires + Docker |

### Étape 1: Installation des Prérequis

```bash
# Cloner le projet
git clone <repo-url> traffic-core
cd traffic-core

# Rendre les scripts exécutables
chmod +x scripts/*.sh

# Installer Docker, Go, Node.js
./scripts/install-prerequisites.sh

# Installer Hyperledger Fabric
./scripts/install-fabric.sh
```

### Étape 2: Configuration PATH

```bash
# Ajouter Fabric au PATH
export PATH="$PATH:$HOME/fabric/fabric-samples/bin"
echo 'export PATH="$PATH:$HOME/fabric/fabric-samples/bin"' >> ~/.bashrc
source ~/.bashrc

# Vérifier l'installation
peer version
```


### Étape 4: Démarrer le Réseau Fabric

```bash
cd /home/$USER/traffic-core

# Démarrer le réseau (génère certificats, crée channel)
./scripts/network.sh up

# Déployer les chaincodes (CCaaS)
./scripts/network.sh deployCC

# Vérifier les conteneurs (17 attendus)
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "peer|orderer|ccaas"
```

### Étape 5: Installer les Dépendances Node.js

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..

# Simulator
cd simulator && npm install && cd ..
```

### Étape 6: Démarrer les Services

```bash
# Terminal 1: Backend (Port 3000)
cd backend && npm run dev

# Terminal 2: Frontend (Port 5176)
cd frontend && npm run dev

# Terminal 3: Simulator
cd simulator && npm start
```

### Étape 7: (Optionnel) LM Studio pour Mistral

```bash
# Télécharger LM Studio
# https://lmstudio.ai/

# 1. Installer et ouvrir LM Studio
# 2. Télécharger le modèle: mistral-7b-instruct-v0.2
# 3. Démarrer le serveur local (Port 1234)
# 4. Le SOC utilisera automatiquement Mistral pour l'analyse
```

---

## 🖥️ Utilisation

### Accès au Dashboard

1. Ouvrir http://localhost:5176


### Pages Disponibles

| Page | Description |
|------|-------------|
| **Dashboard** | Stats globales + Live Violations Feed (refresh 3s) |
| **Roads** | 10 routes + 8 intersections avec feux |
| **Sensors** | Capteurs IoT (traffic, speed, weather, air_quality) |
| **Registry** | Véhicules & Conducteurs |
| **Security** | SOC avec 4 agents IA |
| **Simulation** | Contrôle + Terminal blockchain logs |
| **Consensus** | Tests PBFT vs PoA |

### API Endpoints Principaux

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Routes (blockchain)
curl http://localhost:3000/api/v1/roads

# Intersections
curl http://localhost:3000/api/v1/roads/intersections

# Violations (temps réel)
curl http://localhost:3000/api/v1/registry/violations

# SOC Status
curl http://localhost:3000/api/v1/soc/status

# Activer SOC
curl -X POST http://localhost:3000/api/v1/soc/start
```

---

## 🔄 Fonctionnalités Implémentées

### ✅ Blockchain Hyperledger Fabric
- [x] 3 organisations (TrafficAuth, Mobility, Sensor)
- [x] 6 peers (2 par org)
- [x] 3 orderers (Raft consensus)
- [x] 3 chaincodes CCaaS (road-manager, sensor-data, traffic-registry)
- [x] Politique d'endorsement OR

### ✅ Gestion du Trafic
- [x] 10 routes avec statuts variés (open, closed, maintenance, congested)
- [x] 8 intersections avec feux de circulation
- [x] Événements de trafic (accident, congestion, roadwork)

### ✅ Détection Automatique des Violations
- [x] Capteurs de vitesse simulés
- [x] Détection excès de vitesse > speedLimit
- [x] Calcul automatique amendes (400-3000 MAD)
- [x] Points permis déduits (2-6 points)
- [x] Enregistrement blockchain

### ✅ Dashboard Temps Réel
- [x] Stats véhicules, routes, capteurs
- [x] Live Violations Feed (refresh 3s)
- [x] Graphiques interactifs (Recharts)
- [x] Terminal logs blockchain

### ✅ SOC - Security Operations Center
- [x] 4 agents IA (Defender, Sensor, Analyzer, Controller)
- [x] Intégration Mistral LLM pour analyse
- [x] Incidents enregistrés sur blockchain
- [x] Simulation d'attaques (DDoS, intrusion)
- [x] Blocage IP automatique

### ✅ Simulateur IoT
- [x] Génération lectures capteurs
- [x] Scénarios (rush hour, rainy)
- [x] Violations automatiques
- [x] Log fichier

---

## 🌐 Ports de Service

| Service | Port | Description |
|---------|------|-------------|
| peer0.org1 | 7051 | Peer TrafficAuthority |
| peer0.org2 | 8051 | Peer MobilityServices |
| peer0.org3 | 9051 | Peer SensorNetwork |
| orderer1 | 7050 | Orderer principal |
| road-manager-ccaas | 9999 | Chaincode routes |
| sensor-data-ccaas | 9998 | Chaincode capteurs |
| traffic-registry-ccaas | 9997 | Chaincode registre |
| **Backend API** | **3000** | Express.js |
| **Frontend** | **5176** | Vite/React |
| LM Studio | 1234 | Mistral LLM (optionnel) |

---

## 📝 Commandes Utiles

### Gestion du Réseau

```bash
# Démarrer tout
./scripts/network.sh up && ./scripts/network.sh deployCC

# Arrêter (conserve données)
./scripts/network.sh down

# Nettoyer tout
./scripts/network.sh clean

# Logs d'un peer
docker logs -f peer0.org1.traffic-network.com
```

### Opérations Chaincode

```bash
# Query une route
docker exec cli peer chaincode query \
  -C traffic-channel -n road-manager \
  -c '{"function":"GetRoad","Args":["ROAD001"]}'

# Lister les chaincodes
docker exec cli peer lifecycle chaincode querycommitted --channelID traffic-channel
```

### Démarrage Rapide

```bash
# Script tout-en-un
./start-all.sh

# Ou manuellement
./scripts/network.sh up
./scripts/network.sh deployCC
cd backend && npm run dev &
cd frontend && npm run dev &
cd simulator && npm start &
```

---

## 🐛 Dépannage


### Erreur "Connection refused" chaincode

```bash
# Vérifier que les conteneurs CCaaS sont up
docker ps | grep ccaas

# Redémarrer si nécessaire
docker restart road-manager-ccaas sensor-data-ccaas traffic-registry-ccaas
```



## 📚 Technologies Utilisées

| Catégorie | Technologies |
|-----------|--------------|
| **Blockchain** | Hyperledger Fabric 2.5.4, Raft Consensus |
| **Backend** | Node.js 18, Express.js, Fabric SDK |
| **Frontend** | React 18, Vite, TailwindCSS, React Query |
| **Chaincodes** | Go 1.21, fabric-contract-api-go |
| **Sécurité** | SOC 4 agents, Mistral 7B LLM |
| **Simulation** | Node.js, Faker.js |
| **Conteneurs** | Docker, Docker Compose |

---



## 📄 Licence

Ce projet est développé dans le cadre académique du Master IASD.

---

*Dernière mise à jour: 5 Janvier 2026*
