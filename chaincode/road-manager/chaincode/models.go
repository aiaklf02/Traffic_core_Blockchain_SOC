// ============================================================================
// Road Manager - Modèles de données
// Définition des structures pour la gestion des routes
// ============================================================================

package chaincode

import "time"

// RoadStatus représente l'état d'une route
type RoadStatus string

const (
	RoadStatusOpen       RoadStatus = "OPEN"
	RoadStatusClosed     RoadStatus = "CLOSED"
	RoadStatusMaintenance RoadStatus = "MAINTENANCE"
	RoadStatusCongested  RoadStatus = "CONGESTED"
	RoadStatusAccident   RoadStatus = "ACCIDENT"
)

// RoadType représente le type de route
type RoadType string

const (
	RoadTypeHighway    RoadType = "HIGHWAY"
	RoadTypePrimary    RoadType = "PRIMARY"
	RoadTypeSecondary  RoadType = "SECONDARY"
	RoadTypeResidential RoadType = "RESIDENTIAL"
	RoadTypeBoulevard  RoadType = "BOULEVARD"
)

// TrafficLightState représente l'état d'un feu de signalisation
type TrafficLightState string

const (
	TrafficLightRed    TrafficLightState = "RED"
	TrafficLightYellow TrafficLightState = "YELLOW"
	TrafficLightGreen  TrafficLightState = "GREEN"
	TrafficLightOff    TrafficLightState = "OFF"
)

// GeoPoint représente un point géographique
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Road représente une route dans le système
type Road struct {
	DocType        string     `json:"docType"`
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Type           RoadType   `json:"type"`
	Status         RoadStatus `json:"status"`
	StartPoint     GeoPoint   `json:"startPoint"`
	EndPoint       GeoPoint   `json:"endPoint"`
	Length         float64    `json:"length"`         // en mètres
	Lanes          int        `json:"lanes"`          // nombre de voies
	SpeedLimit     int        `json:"speedLimit"`     // en km/h
	CurrentSpeed   float64    `json:"currentSpeed"`   // vitesse moyenne actuelle
	VehicleCount   int        `json:"vehicleCount"`   // nombre de véhicules
	CongestionLevel float64   `json:"congestionLevel"` // 0.0 à 1.0
	LastUpdated    time.Time  `json:"lastUpdated"`
	CreatedAt      time.Time  `json:"createdAt"`
	CreatedBy      string     `json:"createdBy"`
	District       string     `json:"district"`       // quartier/zone
	City           string     `json:"city"`
}

// Intersection représente un carrefour
type Intersection struct {
	DocType       string            `json:"docType"`
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Location      GeoPoint          `json:"location"`
	ConnectedRoads []string         `json:"connectedRoads"` // IDs des routes connectées
	TrafficLights []TrafficLight    `json:"trafficLights"`
	Type          string            `json:"type"`           // roundabout, signal, stop
	Priority      int               `json:"priority"`       // priorité pour l'optimisation
	LastUpdated   time.Time         `json:"lastUpdated"`
	CreatedAt     time.Time         `json:"createdAt"`
}

// TrafficLight représente un feu de signalisation
type TrafficLight struct {
	ID            string            `json:"id"`
	Direction     string            `json:"direction"`      // N, S, E, W, NE, etc.
	State         TrafficLightState `json:"state"`
	GreenDuration int               `json:"greenDuration"`  // en secondes
	RedDuration   int               `json:"redDuration"`    // en secondes
	LastChanged   time.Time         `json:"lastChanged"`
}

// RoadEvent représente un événement sur une route
type RoadEvent struct {
	DocType     string    `json:"docType"`
	ID          string    `json:"id"`
	RoadID      string    `json:"roadId"`
	EventType   string    `json:"eventType"`   // accident, travaux, manifestation
	Severity    string    `json:"severity"`    // low, medium, high, critical
	Description string    `json:"description"`
	Location    GeoPoint  `json:"location"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	IsActive    bool      `json:"isActive"`
	ReportedBy  string    `json:"reportedBy"`
	CreatedAt   time.Time `json:"createdAt"`
}

// TrafficUpdate représente une mise à jour du trafic
type TrafficUpdate struct {
	DocType        string    `json:"docType"`
	ID             string    `json:"id"`
	RoadID         string    `json:"roadId"`
	Timestamp      time.Time `json:"timestamp"`
	AverageSpeed   float64   `json:"averageSpeed"`
	VehicleCount   int       `json:"vehicleCount"`
	CongestionLevel float64  `json:"congestionLevel"`
	Source         string    `json:"source"` // sensor, camera, gps
}

// RoadMaintenanceSchedule représente un planning de maintenance
type RoadMaintenanceSchedule struct {
	DocType       string    `json:"docType"`
	ID            string    `json:"id"`
	RoadID        string    `json:"roadId"`
	Type          string    `json:"type"`          // repair, cleaning, painting
	Description   string    `json:"description"`
	ScheduledStart time.Time `json:"scheduledStart"`
	ScheduledEnd  time.Time `json:"scheduledEnd"`
	Status        string    `json:"status"`        // planned, in_progress, completed, cancelled
	Contractor    string    `json:"contractor"`
	EstimatedCost float64   `json:"estimatedCost"`
	CreatedBy     string    `json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
}

// QueryResult structure pour les résultats de requête
type QueryResult struct {
	Key    string `json:"key"`
	Record *Road  `json:"record"`
}

// PaginatedQueryResult pour la pagination
type PaginatedQueryResult struct {
	Records             []*Road `json:"records"`
	FetchedRecordsCount int     `json:"fetchedRecordsCount"`
	Bookmark            string  `json:"bookmark"`
}
