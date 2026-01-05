// ============================================================================
// Sensor Contract - Contrat intelligent pour la gestion des capteurs
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SensorDataContract implémente le contrat de gestion des capteurs
type SensorDataContract struct {
	contractapi.Contract
}

// InitLedger initialise le ledger avec des capteurs de test
func (c *SensorDataContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	sensors := []Sensor{
		{
			DocType:         "sensor",
			ID:              "SENSOR001",
			Name:            "Capteur Trafic Avenue Mohammed V",
			Type:            SensorTypeTraffic,
			Status:          SensorStatusActive,
			Location:        GeoPoint{Latitude: 33.5731, Longitude: -7.5898},
			RoadID:          "ROAD001",
			Manufacturer:    "TrafficSense",
			Model:           "TS-500",
			FirmwareVersion: "2.1.0",
			InstallDate:     time.Now().AddDate(-1, 0, 0),
			LastMaintenance: time.Now().AddDate(0, -3, 0),
			LastReading:     time.Now(),
			BatteryLevel:    85.5,
			SignalStrength:  92.0,
			ReadingInterval: 60,
			CreatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
			Organization:    "SensorNetwork",
		},
		{
			DocType:         "sensor",
			ID:              "SENSOR002",
			Name:            "Radar Vitesse Boulevard Zerktouni",
			Type:            SensorTypeSpeed,
			Status:          SensorStatusActive,
			Location:        GeoPoint{Latitude: 33.5850, Longitude: -7.6200},
			RoadID:          "ROAD002",
			Manufacturer:    "SpeedWatch",
			Model:           "SW-300",
			FirmwareVersion: "1.5.2",
			InstallDate:     time.Now().AddDate(-2, 0, 0),
			LastMaintenance: time.Now().AddDate(0, -1, 0),
			LastReading:     time.Now(),
			BatteryLevel:    78.0,
			SignalStrength:  88.5,
			ReadingInterval: 30,
			CreatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
			Organization:    "SensorNetwork",
		},
		{
			DocType:         "sensor",
			ID:              "SENSOR003",
			Name:            "Station Météo Autoroute A7",
			Type:            SensorTypeWeather,
			Status:          SensorStatusActive,
			Location:        GeoPoint{Latitude: 33.6000, Longitude: -7.5000},
			RoadID:          "ROAD003",
			Manufacturer:    "WeatherPro",
			Model:           "WP-100",
			FirmwareVersion: "3.0.1",
			InstallDate:     time.Now().AddDate(0, -6, 0),
			LastMaintenance: time.Now().AddDate(0, -2, 0),
			LastReading:     time.Now(),
			BatteryLevel:    95.0,
			SignalStrength:  96.0,
			ReadingInterval: 300,
			CreatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
			Organization:    "SensorNetwork",
		},
		{
			DocType:         "sensor",
			ID:              "SENSOR004",
			Name:            "Capteur Qualité Air Centre-Ville",
			Type:            SensorTypeAirQuality,
			Status:          SensorStatusActive,
			Location:        GeoPoint{Latitude: 33.5750, Longitude: -7.5900},
			RoadID:          "ROAD001",
			Manufacturer:    "AirMonitor",
			Model:           "AM-200",
			FirmwareVersion: "2.3.0",
			InstallDate:     time.Now().AddDate(0, -8, 0),
			LastMaintenance: time.Now().AddDate(0, -1, 0),
			LastReading:     time.Now(),
			BatteryLevel:    70.0,
			SignalStrength:  85.0,
			ReadingInterval: 120,
			CreatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
			Organization:    "SensorNetwork",
		},
	}

	for _, sensor := range sensors {
		sensorJSON, err := json.Marshal(sensor)
		if err != nil {
			return fmt.Errorf("erreur de sérialisation du capteur: %v", err)
		}
		err = ctx.GetStub().PutState(sensor.ID, sensorJSON)
		if err != nil {
			return fmt.Errorf("erreur d'écriture dans le ledger: %v", err)
		}
	}

	return nil
}

// RegisterSensor enregistre un nouveau capteur
func (c *SensorDataContract) RegisterSensor(ctx contractapi.TransactionContextInterface,
	id, name string, sensorType string, latitude, longitude float64,
	roadID, manufacturer, model, firmwareVersion string, readingInterval int) error {

	// Vérifier si le capteur existe déjà
	exists, err := c.SensorExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("le capteur %s existe déjà", id)
	}

	// Obtenir l'identité du créateur
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "UNKNOWN"
	}

	// Obtenir l'organisation
	mspID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		mspID = "UNKNOWN"
	}

	sensor := Sensor{
		DocType:         "sensor",
		ID:              id,
		Name:            name,
		Type:            SensorType(sensorType),
		Status:          SensorStatusActive,
		Location:        GeoPoint{Latitude: latitude, Longitude: longitude},
		RoadID:          roadID,
		Manufacturer:    manufacturer,
		Model:           model,
		FirmwareVersion: firmwareVersion,
		InstallDate:     time.Now(),
		LastMaintenance: time.Now(),
		LastReading:     time.Now(),
		BatteryLevel:    100.0,
		SignalStrength:  100.0,
		ReadingInterval: readingInterval,
		CreatedAt:       time.Now(),
		CreatedBy:       clientID,
		Organization:    mspID,
	}

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"sensorId":"%s","type":"%s","roadId":"%s"}`, id, sensorType, roadID)
	ctx.GetStub().SetEvent("SensorRegistered", []byte(eventPayload))

	return ctx.GetStub().PutState(id, sensorJSON)
}

// GetSensor récupère un capteur par son ID
func (c *SensorDataContract) GetSensor(ctx contractapi.TransactionContextInterface, id string) (*Sensor, error) {
	sensorJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if sensorJSON == nil {
		return nil, fmt.Errorf("le capteur %s n'existe pas", id)
	}

	var sensor Sensor
	err = json.Unmarshal(sensorJSON, &sensor)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &sensor, nil
}

// SensorExists vérifie si un capteur existe
func (c *SensorDataContract) SensorExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	sensorJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	return sensorJSON != nil, nil
}

// UpdateSensorStatus met à jour le statut d'un capteur
func (c *SensorDataContract) UpdateSensorStatus(ctx contractapi.TransactionContextInterface,
	id string, newStatus string) error {

	sensor, err := c.GetSensor(ctx, id)
	if err != nil {
		return err
	}

	oldStatus := sensor.Status
	sensor.Status = SensorStatus(newStatus)

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement si le capteur devient inactif ou défaillant
	if newStatus == string(SensorStatusFaulty) || newStatus == string(SensorStatusOffline) {
		eventPayload := fmt.Sprintf(`{"sensorId":"%s","oldStatus":"%s","newStatus":"%s"}`,
			id, oldStatus, newStatus)
		ctx.GetStub().SetEvent("SensorStatusAlert", []byte(eventPayload))
	}

	return ctx.GetStub().PutState(id, sensorJSON)
}

// UpdateSensorHealth met à jour les indicateurs de santé du capteur
func (c *SensorDataContract) UpdateSensorHealth(ctx contractapi.TransactionContextInterface,
	id string, batteryLevel, signalStrength float64) error {

	sensor, err := c.GetSensor(ctx, id)
	if err != nil {
		return err
	}

	sensor.BatteryLevel = batteryLevel
	sensor.SignalStrength = signalStrength

	// Alerte si batterie faible
	if batteryLevel < 20.0 {
		alertPayload := fmt.Sprintf(`{"sensorId":"%s","alertType":"LOW_BATTERY","level":%.2f}`,
			id, batteryLevel)
		ctx.GetStub().SetEvent("SensorHealthAlert", []byte(alertPayload))
	}

	// Alerte si signal faible
	if signalStrength < 30.0 {
		alertPayload := fmt.Sprintf(`{"sensorId":"%s","alertType":"WEAK_SIGNAL","strength":%.2f}`,
			id, signalStrength)
		ctx.GetStub().SetEvent("SensorHealthAlert", []byte(alertPayload))
	}

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, sensorJSON)
}

// UpdateFirmware met à jour le firmware d'un capteur
func (c *SensorDataContract) UpdateFirmware(ctx contractapi.TransactionContextInterface,
	id string, newVersion string) error {

	sensor, err := c.GetSensor(ctx, id)
	if err != nil {
		return err
	}

	oldVersion := sensor.FirmwareVersion
	sensor.FirmwareVersion = newVersion

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"sensorId":"%s","oldVersion":"%s","newVersion":"%s"}`,
		id, oldVersion, newVersion)
	ctx.GetStub().SetEvent("FirmwareUpdated", []byte(eventPayload))

	return ctx.GetStub().PutState(id, sensorJSON)
}

// ScheduleMaintenance planifie une maintenance pour un capteur
func (c *SensorDataContract) ScheduleMaintenance(ctx contractapi.TransactionContextInterface,
	id string) error {

	sensor, err := c.GetSensor(ctx, id)
	if err != nil {
		return err
	}

	sensor.Status = SensorStatusMaintenance

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, sensorJSON)
}

// CompleteMaintenance complète une maintenance
func (c *SensorDataContract) CompleteMaintenance(ctx contractapi.TransactionContextInterface,
	id string) error {

	sensor, err := c.GetSensor(ctx, id)
	if err != nil {
		return err
	}

	sensor.Status = SensorStatusActive
	sensor.LastMaintenance = time.Now()
	sensor.BatteryLevel = 100.0 // Batterie rechargée

	sensorJSON, err := json.Marshal(sensor)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"sensorId":"%s","maintenanceCompleted":true}`, id)
	ctx.GetStub().SetEvent("MaintenanceCompleted", []byte(eventPayload))

	return ctx.GetStub().PutState(id, sensorJSON)
}

// GetSensorsByRoad récupère tous les capteurs d'une route
func (c *SensorDataContract) GetSensorsByRoad(ctx contractapi.TransactionContextInterface,
	roadID string) ([]*Sensor, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensor","roadId":"%s"}}`, roadID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// GetSensorsByType récupère tous les capteurs d'un type donné
func (c *SensorDataContract) GetSensorsByType(ctx contractapi.TransactionContextInterface,
	sensorType string) ([]*Sensor, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensor","type":"%s"}}`, sensorType)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// GetSensorsByStatus récupère les capteurs par statut
func (c *SensorDataContract) GetSensorsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*Sensor, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensor","status":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// GetAllSensors récupère tous les capteurs
func (c *SensorDataContract) GetAllSensors(ctx contractapi.TransactionContextInterface) ([]*Sensor, error) {
	queryString := `{"selector":{"docType":"sensor"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// GetFaultySensors récupère les capteurs défaillants ou hors ligne
func (c *SensorDataContract) GetFaultySensors(ctx contractapi.TransactionContextInterface) ([]*Sensor, error) {
	queryString := `{"selector":{"docType":"sensor","$or":[{"status":"FAULTY"},{"status":"OFFLINE"}]}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// GetLowBatterySensors récupère les capteurs avec batterie faible
func (c *SensorDataContract) GetLowBatterySensors(ctx contractapi.TransactionContextInterface,
	threshold float64) ([]*Sensor, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensor","batteryLevel":{"$lt":%f}}}`, threshold)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var sensors []*Sensor
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var sensor Sensor
		err = json.Unmarshal(queryResult.Value, &sensor)
		if err != nil {
			return nil, err
		}
		sensors = append(sensors, &sensor)
	}

	return sensors, nil
}

// DeleteSensor supprime un capteur
func (c *SensorDataContract) DeleteSensor(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := c.SensorExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("le capteur %s n'existe pas", id)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"sensorId":"%s","deleted":true}`, id)
	ctx.GetStub().SetEvent("SensorDeleted", []byte(eventPayload))

	return ctx.GetStub().DelState(id)
}

// GetSensorHistory récupère l'historique d'un capteur
func (c *SensorDataContract) GetSensorHistory(ctx contractapi.TransactionContextInterface,
	id string) ([]map[string]interface{}, error) {

	historyIterator, err := ctx.GetStub().GetHistoryForKey(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de récupération de l'historique: %v", err)
	}
	defer historyIterator.Close()

	var history []map[string]interface{}
	for historyIterator.HasNext() {
		modification, err := historyIterator.Next()
		if err != nil {
			return nil, err
		}

		record := map[string]interface{}{
			"txId":      modification.TxId,
			"timestamp": time.Unix(modification.Timestamp.Seconds, int64(modification.Timestamp.Nanos)),
			"isDelete":  modification.IsDelete,
		}

		if !modification.IsDelete {
			var sensor Sensor
			err = json.Unmarshal(modification.Value, &sensor)
			if err == nil {
				record["value"] = sensor
			}
		}

		history = append(history, record)
	}

	return history, nil
}
