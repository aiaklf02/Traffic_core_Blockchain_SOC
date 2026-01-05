// ============================================================================
// Traffic Registry - Modèles de données
// Définition des structures pour la gestion des véhicules et conducteurs
// ============================================================================

package chaincode

import "time"

// VehicleType représente le type de véhicule
type VehicleType string

const (
	VehicleTypeCar        VehicleType = "CAR"
	VehicleTypeMotorcycle VehicleType = "MOTORCYCLE"
	VehicleTypeTruck      VehicleType = "TRUCK"
	VehicleTypeBus        VehicleType = "BUS"
	VehicleTypeTaxi       VehicleType = "TAXI"
	VehicleTypeEmergency  VehicleType = "EMERGENCY"
	VehicleTypeElectric   VehicleType = "ELECTRIC"
	VehicleTypeHybrid     VehicleType = "HYBRID"
)

// VehicleStatus représente l'état d'un véhicule
type VehicleStatus string

const (
	VehicleStatusActive     VehicleStatus = "ACTIVE"
	VehicleStatusInactive   VehicleStatus = "INACTIVE"
	VehicleStatusSuspended  VehicleStatus = "SUSPENDED"
	VehicleStatusStolen     VehicleStatus = "STOLEN"
	VehicleStatusScrapped   VehicleStatus = "SCRAPPED"
	VehicleStatusInTransit  VehicleStatus = "IN_TRANSIT"
)

// LicenseStatus représente l'état d'un permis
type LicenseStatus string

const (
	LicenseStatusValid     LicenseStatus = "VALID"
	LicenseStatusExpired   LicenseStatus = "EXPIRED"
	LicenseStatusSuspended LicenseStatus = "SUSPENDED"
	LicenseStatusRevoked   LicenseStatus = "REVOKED"
)

// LicenseCategory représente la catégorie de permis
type LicenseCategory string

const (
	LicenseCategoryA  LicenseCategory = "A"  // Motocycles
	LicenseCategoryB  LicenseCategory = "B"  // Véhicules légers
	LicenseCategoryC  LicenseCategory = "C"  // Poids lourds
	LicenseCategoryD  LicenseCategory = "D"  // Transport en commun
	LicenseCategoryE  LicenseCategory = "E"  // Remorques
	LicenseCategoryAM LicenseCategory = "AM" // Cyclomoteurs
)

// FuelType représente le type de carburant
type FuelType string

const (
	FuelTypeGasoline FuelType = "GASOLINE"
	FuelTypeDiesel   FuelType = "DIESEL"
	FuelTypeElectric FuelType = "ELECTRIC"
	FuelTypeHybrid   FuelType = "HYBRID"
	FuelTypeLPG      FuelType = "LPG"
	FuelTypeCNG      FuelType = "CNG"
)

// GeoPoint représente un point géographique
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Vehicle représente un véhicule enregistré
type Vehicle struct {
	DocType            string        `json:"docType"`
	ID                 string        `json:"id"`
	PlateNumber        string        `json:"plateNumber"`
	VIN                string        `json:"vin"`                // Vehicle Identification Number
	Type               VehicleType   `json:"type"`
	Status             VehicleStatus `json:"status"`
	Brand              string        `json:"brand"`
	Model              string        `json:"model"`
	Year               int           `json:"year"`
	Color              string        `json:"color"`
	FuelType           FuelType      `json:"fuelType"`
	EngineCapacity     float64       `json:"engineCapacity"`     // en litres
	Power              int           `json:"power"`              // en chevaux
	Seats              int           `json:"seats"`
	Weight             float64       `json:"weight"`             // en kg
	OwnerID            string        `json:"ownerId"`
	InsuranceID        string        `json:"insuranceId"`
	InsuranceExpiry    time.Time     `json:"insuranceExpiry"`
	TechnicalInspection time.Time    `json:"technicalInspection"` // Date dernier contrôle
	NextInspectionDue  time.Time     `json:"nextInspectionDue"`
	RegistrationDate   time.Time     `json:"registrationDate"`
	LastLocation       GeoPoint      `json:"lastLocation"`
	LastSeen           time.Time     `json:"lastSeen"`
	Mileage            int           `json:"mileage"`            // en km
	EmissionClass      string        `json:"emissionClass"`      // Euro 1-6
	IsConnected        bool          `json:"isConnected"`        // Véhicule connecté IoT
	CreatedAt          time.Time     `json:"createdAt"`
	UpdatedAt          time.Time     `json:"updatedAt"`
	CreatedBy          string        `json:"createdBy"`
	City               string        `json:"city"`
	Region             string        `json:"region"`
}

// Driver représente un conducteur
type Driver struct {
	DocType        string          `json:"docType"`
	ID             string          `json:"id"`
	NationalID     string          `json:"nationalId"`
	FirstName      string          `json:"firstName"`
	LastName       string          `json:"lastName"`
	DateOfBirth    time.Time       `json:"dateOfBirth"`
	Address        string          `json:"address"`
	City           string          `json:"city"`
	Phone          string          `json:"phone"`
	Email          string          `json:"email"`
	LicenseNumber  string          `json:"licenseNumber"`
	LicenseStatus  LicenseStatus   `json:"licenseStatus"`
	LicenseCategories []LicenseCategory `json:"licenseCategories"`
	LicenseIssueDate time.Time     `json:"licenseIssueDate"`
	LicenseExpiry  time.Time       `json:"licenseExpiry"`
	Points         int             `json:"points"`             // Points de permis (12 max)
	TotalViolations int            `json:"totalViolations"`
	VehicleIDs     []string        `json:"vehicleIds"`         // Véhicules associés
	CreatedAt      time.Time       `json:"createdAt"`
	UpdatedAt      time.Time       `json:"updatedAt"`
	CreatedBy      string          `json:"createdBy"`
}

// TrafficViolation représente une infraction
type TrafficViolation struct {
	DocType         string    `json:"docType"`
	ID              string    `json:"id"`
	VehicleID       string    `json:"vehicleId"`
	DriverID        string    `json:"driverId"`
	PlateNumber     string    `json:"plateNumber"`
	ViolationType   string    `json:"violationType"`   // speeding, red_light, parking, etc.
	Description     string    `json:"description"`
	Location        GeoPoint  `json:"location"`
	RoadID          string    `json:"roadId"`
	SpeedLimit      int       `json:"speedLimit"`      // Pour excès de vitesse
	RecordedSpeed   int       `json:"recordedSpeed"`   // Vitesse enregistrée
	FineAmount      float64   `json:"fineAmount"`      // Montant de l'amende
	PointsDeducted  int       `json:"pointsDeducted"`
	Status          string    `json:"status"`          // pending, paid, contested, cancelled
	DetectedBy      string    `json:"detectedBy"`      // sensor_id, camera_id, officer_id
	EvidenceHash    string    `json:"evidenceHash"`    // Hash de la preuve (photo/vidéo)
	Timestamp       time.Time `json:"timestamp"`
	DueDate         time.Time `json:"dueDate"`
	PaidAt          time.Time `json:"paidAt"`
	CreatedAt       time.Time `json:"createdAt"`
	ProcessedBy     string    `json:"processedBy"`
}

// Insurance représente une assurance véhicule
type Insurance struct {
	DocType        string    `json:"docType"`
	ID             string    `json:"id"`
	VehicleID      string    `json:"vehicleId"`
	PolicyNumber   string    `json:"policyNumber"`
	Company        string    `json:"company"`
	Type           string    `json:"type"`           // third_party, comprehensive, all_risk
	Coverage       float64   `json:"coverage"`       // Montant couverture
	Premium        float64   `json:"premium"`        // Prime annuelle
	StartDate      time.Time `json:"startDate"`
	EndDate        time.Time `json:"endDate"`
	Status         string    `json:"status"`         // active, expired, cancelled
	HolderName     string    `json:"holderName"`
	HolderID       string    `json:"holderId"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// TechnicalInspection représente un contrôle technique
type TechnicalInspection struct {
	DocType        string    `json:"docType"`
	ID             string    `json:"id"`
	VehicleID      string    `json:"vehicleId"`
	InspectionDate time.Time `json:"inspectionDate"`
	ExpiryDate     time.Time `json:"expiryDate"`
	Center         string    `json:"center"`         // Centre de contrôle
	Inspector      string    `json:"inspector"`
	Result         string    `json:"result"`         // pass, fail, conditional
	Mileage        int       `json:"mileage"`
	Defects        []string  `json:"defects"`        // Liste des défauts
	Recommendations []string `json:"recommendations"`
	CertificateHash string  `json:"certificateHash"` // Hash du certificat
	CreatedAt      time.Time `json:"createdAt"`
}

// VehicleTransfer représente un transfert de propriété
type VehicleTransfer struct {
	DocType       string    `json:"docType"`
	ID            string    `json:"id"`
	VehicleID     string    `json:"vehicleId"`
	FromOwnerID   string    `json:"fromOwnerId"`
	ToOwnerID     string    `json:"toOwnerId"`
	TransferDate  time.Time `json:"transferDate"`
	SalePrice     float64   `json:"salePrice"`
	TransferTax   float64   `json:"transferTax"`
	Status        string    `json:"status"`        // pending, completed, rejected
	DocumentHash  string    `json:"documentHash"`  // Hash du contrat
	ApprovedBy    string    `json:"approvedBy"`
	ApprovedAt    time.Time `json:"approvedAt"`
	CreatedAt     time.Time `json:"createdAt"`
}

// ParkingPermit représente un permis de stationnement
type ParkingPermit struct {
	DocType      string    `json:"docType"`
	ID           string    `json:"id"`
	VehicleID    string    `json:"vehicleId"`
	DriverID     string    `json:"driverId"`
	Zone         string    `json:"zone"`
	Type         string    `json:"type"`          // resident, visitor, disabled, commercial
	ValidFrom    time.Time `json:"validFrom"`
	ValidUntil   time.Time `json:"validUntil"`
	Status       string    `json:"status"`        // active, expired, revoked
	Fee          float64   `json:"fee"`
	IssuedBy     string    `json:"issuedBy"`
	CreatedAt    time.Time `json:"createdAt"`
}

// VehicleLocation représente une position GPS enregistrée
type VehicleLocation struct {
	DocType    string    `json:"docType"`
	ID         string    `json:"id"`
	VehicleID  string    `json:"vehicleId"`
	Location   GeoPoint  `json:"location"`
	Speed      float64   `json:"speed"`
	Heading    float64   `json:"heading"`         // Direction en degrés
	Accuracy   float64   `json:"accuracy"`        // Précision GPS en mètres
	RoadID     string    `json:"roadId"`
	Timestamp  time.Time `json:"timestamp"`
	Source     string    `json:"source"`          // gps, cell, wifi
}

// EmergencyVehicle représente un véhicule d'urgence
type EmergencyVehicle struct {
	DocType        string    `json:"docType"`
	ID             string    `json:"id"`
	VehicleID      string    `json:"vehicleId"`
	ServiceType    string    `json:"serviceType"`    // ambulance, fire, police
	UnitNumber     string    `json:"unitNumber"`
	Station        string    `json:"station"`
	IsOnDuty       bool      `json:"isOnDuty"`
	IsResponding   bool      `json:"isResponding"`   // En intervention
	CurrentMission string    `json:"currentMission"`
	Priority       int       `json:"priority"`       // 1-5
	LastDispatch   time.Time `json:"lastDispatch"`
	CreatedAt      time.Time `json:"createdAt"`
}

// VehicleQueryResult structure pour les résultats de requête
type VehicleQueryResult struct {
	Key    string   `json:"key"`
	Record *Vehicle `json:"record"`
}

// DriverQueryResult structure pour les résultats de requête conducteur
type DriverQueryResult struct {
	Key    string  `json:"key"`
	Record *Driver `json:"record"`
}

// ViolationQueryResult structure pour les résultats de requête violation
type ViolationQueryResult struct {
	Key    string            `json:"key"`
	Record *TrafficViolation `json:"record"`
}
