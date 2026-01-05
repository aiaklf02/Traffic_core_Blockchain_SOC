// ============================================================================
// Sensor Data - Modèles de données
// Définition des structures pour la gestion des capteurs IoT
// ============================================================================

package chaincode

import "time"

// SensorType représente le type de capteur
type SensorType string

const (
	SensorTypeTraffic     SensorType = "TRAFFIC"      // Comptage véhicules
	SensorTypeSpeed       SensorType = "SPEED"        // Radar de vitesse
	SensorTypeCamera      SensorType = "CAMERA"       // Caméra de surveillance
	SensorTypeAirQuality  SensorType = "AIR_QUALITY"  // Qualité de l'air
	SensorTypeNoise       SensorType = "NOISE"        // Niveau sonore
	SensorTypeWeather     SensorType = "WEATHER"      // Station météo
	SensorTypeParking     SensorType = "PARKING"      // Capteur de stationnement
	SensorTypePedestrian  SensorType = "PEDESTRIAN"   // Comptage piétons
)

// SensorStatus représente l'état d'un capteur
type SensorStatus string

const (
	SensorStatusActive      SensorStatus = "ACTIVE"
	SensorStatusInactive    SensorStatus = "INACTIVE"
	SensorStatusMaintenance SensorStatus = "MAINTENANCE"
	SensorStatusFaulty      SensorStatus = "FAULTY"
	SensorStatusOffline     SensorStatus = "OFFLINE"
)

// DataQuality représente la qualité des données
type DataQuality string

const (
	DataQualityHigh   DataQuality = "HIGH"
	DataQualityMedium DataQuality = "MEDIUM"
	DataQualityLow    DataQuality = "LOW"
	DataQualityInvalid DataQuality = "INVALID"
)

// GeoPoint représente un point géographique
type GeoPoint struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Sensor représente un capteur IoT dans le système
type Sensor struct {
	DocType         string       `json:"docType"`
	ID              string       `json:"id"`
	Name            string       `json:"name"`
	Type            SensorType   `json:"type"`
	Status          SensorStatus `json:"status"`
	Location        GeoPoint     `json:"location"`
	RoadID          string       `json:"roadId"`          // Route associée
	IntersectionID  string       `json:"intersectionId"`  // Intersection associée (optionnel)
	Manufacturer    string       `json:"manufacturer"`
	Model           string       `json:"model"`
	FirmwareVersion string       `json:"firmwareVersion"`
	InstallDate     time.Time    `json:"installDate"`
	LastMaintenance time.Time    `json:"lastMaintenance"`
	LastReading     time.Time    `json:"lastReading"`
	BatteryLevel    float64      `json:"batteryLevel"`    // 0.0 à 100.0
	SignalStrength  float64      `json:"signalStrength"`  // 0.0 à 100.0
	ReadingInterval int          `json:"readingInterval"` // en secondes
	CreatedAt       time.Time    `json:"createdAt"`
	CreatedBy       string       `json:"createdBy"`
	Organization    string       `json:"organization"`    // Org propriétaire
}

// SensorReading représente une lecture de capteur
type SensorReading struct {
	DocType     string                 `json:"docType"`
	ID          string                 `json:"id"`
	SensorID    string                 `json:"sensorId"`
	Timestamp   time.Time              `json:"timestamp"`
	Data        map[string]interface{} `json:"data"`        // Données flexibles selon le type
	Quality     DataQuality            `json:"quality"`
	RawValue    string                 `json:"rawValue"`    // Valeur brute
	ProcessedAt time.Time              `json:"processedAt"`
	ValidatedBy string                 `json:"validatedBy"` // Signature ou ID du validateur
}

// TrafficSensorData données spécifiques capteur de trafic
type TrafficSensorData struct {
	VehicleCount    int     `json:"vehicleCount"`
	AverageSpeed    float64 `json:"averageSpeed"`    // km/h
	Occupancy       float64 `json:"occupancy"`       // pourcentage
	Flow            int     `json:"flow"`            // véhicules/heure
	Headway         float64 `json:"headway"`         // temps entre véhicules (s)
	LaneNumber      int     `json:"laneNumber"`
	VehicleTypes    map[string]int `json:"vehicleTypes"` // car, truck, motorcycle, bus
}

// SpeedSensorData données spécifiques radar de vitesse
type SpeedSensorData struct {
	CurrentSpeed    float64 `json:"currentSpeed"`    // km/h
	MaxSpeed        float64 `json:"maxSpeed"`        // vitesse max détectée
	MinSpeed        float64 `json:"minSpeed"`        // vitesse min détectée
	SpeedLimit      int     `json:"speedLimit"`
	ViolationCount  int     `json:"violationCount"`  // nombre d'excès
	AverageSpeed    float64 `json:"averageSpeed"`
}

// AirQualityData données qualité de l'air
type AirQualityData struct {
	PM25        float64 `json:"pm25"`        // µg/m³
	PM10        float64 `json:"pm10"`        // µg/m³
	NO2         float64 `json:"no2"`         // ppb
	CO          float64 `json:"co"`          // ppm
	O3          float64 `json:"o3"`          // ppb
	SO2         float64 `json:"so2"`         // ppb
	AQI         int     `json:"aqi"`         // Indice qualité air
	Temperature float64 `json:"temperature"` // °C
	Humidity    float64 `json:"humidity"`    // %
}

// WeatherData données météorologiques
type WeatherData struct {
	Temperature     float64 `json:"temperature"`     // °C
	Humidity        float64 `json:"humidity"`        // %
	Pressure        float64 `json:"pressure"`        // hPa
	WindSpeed       float64 `json:"windSpeed"`       // km/h
	WindDirection   string  `json:"windDirection"`   // N, NE, E, etc.
	Precipitation   float64 `json:"precipitation"`   // mm
	Visibility      float64 `json:"visibility"`      // km
	RoadCondition   string  `json:"roadCondition"`   // dry, wet, icy, flooded
	UVIndex         int     `json:"uvIndex"`
}

// ParkingSensorData données capteur de stationnement
type ParkingSensorData struct {
	IsOccupied      bool      `json:"isOccupied"`
	OccupiedSince   time.Time `json:"occupiedSince"`
	SpotID          string    `json:"spotId"`
	ZoneID          string    `json:"zoneId"`
	VehicleDetected bool      `json:"vehicleDetected"`
}

// NoiseSensorData données capteur de bruit
type NoiseSensorData struct {
	DecibelLevel    float64 `json:"decibelLevel"`    // dB
	PeakLevel       float64 `json:"peakLevel"`       // dB
	AverageLevel    float64 `json:"averageLevel"`    // dB
	NoiseCategory   string  `json:"noiseCategory"`   // low, moderate, high, extreme
}

// SensorAlert représente une alerte générée par un capteur
type SensorAlert struct {
	DocType     string    `json:"docType"`
	ID          string    `json:"id"`
	SensorID    string    `json:"sensorId"`
	AlertType   string    `json:"alertType"`   // threshold, malfunction, offline
	Severity    string    `json:"severity"`    // info, warning, critical
	Message     string    `json:"message"`
	Threshold   float64   `json:"threshold"`
	ActualValue float64   `json:"actualValue"`
	Timestamp   time.Time `json:"timestamp"`
	IsResolved  bool      `json:"isResolved"`
	ResolvedAt  time.Time `json:"resolvedAt"`
	ResolvedBy  string    `json:"resolvedBy"`
}

// SensorCalibration représente une calibration de capteur
type SensorCalibration struct {
	DocType        string    `json:"docType"`
	ID             string    `json:"id"`
	SensorID       string    `json:"sensorId"`
	CalibratedAt   time.Time `json:"calibratedAt"`
	CalibratedBy   string    `json:"calibratedBy"`
	PreviousOffset float64   `json:"previousOffset"`
	NewOffset      float64   `json:"newOffset"`
	Notes          string    `json:"notes"`
	NextCalibration time.Time `json:"nextCalibration"`
}

// AggregatedData données agrégées pour analyse
type AggregatedData struct {
	DocType       string    `json:"docType"`
	ID            string    `json:"id"`
	SensorID      string    `json:"sensorId"`
	Period        string    `json:"period"`        // hourly, daily, weekly
	StartTime     time.Time `json:"startTime"`
	EndTime       time.Time `json:"endTime"`
	SampleCount   int       `json:"sampleCount"`
	AverageValue  float64   `json:"averageValue"`
	MinValue      float64   `json:"minValue"`
	MaxValue      float64   `json:"maxValue"`
	SumValue      float64   `json:"sumValue"`
	StdDeviation  float64   `json:"stdDeviation"`
}

// SensorQueryResult structure pour les résultats de requête
type SensorQueryResult struct {
	Key    string  `json:"key"`
	Record *Sensor `json:"record"`
}

// ReadingQueryResult structure pour les résultats de requête de lectures
type ReadingQueryResult struct {
	Key    string         `json:"key"`
	Record *SensorReading `json:"record"`
}
