// ============================================================================
// Vehicle Contract - Contrat intelligent pour la gestion des véhicules
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// TrafficRegistryContract implémente le contrat de gestion des véhicules
type TrafficRegistryContract struct {
	contractapi.Contract
}

// InitLedger initialise le ledger avec des données de test
func (c *TrafficRegistryContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	vehicles := []Vehicle{
		{
			DocType:         "vehicle",
			ID:              "VEH001",
			PlateNumber:     "12345-A-1",
			VIN:             "WBA3A5C55DF123456",
			Type:            VehicleTypeCar,
			Status:          VehicleStatusActive,
			Brand:           "Dacia",
			Model:           "Logan",
			Year:            2022,
			Color:           "Blanc",
			FuelType:        FuelTypeGasoline,
			EngineCapacity:  1.6,
			Power:           90,
			Seats:           5,
			Weight:          1150,
			OwnerID:         "DRV001",
			InsuranceExpiry: time.Now().AddDate(1, 0, 0),
			RegistrationDate: time.Now().AddDate(-2, 0, 0),
			Mileage:         45000,
			EmissionClass:   "Euro6",
			IsConnected:     true,
			City:            "Casablanca",
			Region:          "Grand Casablanca",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
		},
		{
			DocType:         "vehicle",
			ID:              "VEH002",
			PlateNumber:     "67890-B-2",
			VIN:             "WVWZZZ3CZWE123789",
			Type:            VehicleTypeCar,
			Status:          VehicleStatusActive,
			Brand:           "Renault",
			Model:           "Clio",
			Year:            2023,
			Color:           "Noir",
			FuelType:        FuelTypeDiesel,
			EngineCapacity:  1.5,
			Power:           115,
			Seats:           5,
			Weight:          1200,
			OwnerID:         "DRV002",
			InsuranceExpiry: time.Now().AddDate(0, 8, 0),
			RegistrationDate: time.Now().AddDate(-1, 0, 0),
			Mileage:         22000,
			EmissionClass:   "Euro6",
			IsConnected:     true,
			City:            "Rabat",
			Region:          "Rabat-Salé-Kénitra",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
		},
		{
			DocType:         "vehicle",
			ID:              "VEH003",
			PlateNumber:     "11111-C-3",
			VIN:             "JTDKN3DU5A0123456",
			Type:            VehicleTypeElectric,
			Status:          VehicleStatusActive,
			Brand:           "Tesla",
			Model:           "Model 3",
			Year:            2024,
			Color:           "Bleu",
			FuelType:        FuelTypeElectric,
			EngineCapacity:  0,
			Power:           283,
			Seats:           5,
			Weight:          1830,
			OwnerID:         "DRV003",
			InsuranceExpiry: time.Now().AddDate(1, 6, 0),
			RegistrationDate: time.Now().AddDate(0, -6, 0),
			Mileage:         8000,
			EmissionClass:   "Zero",
			IsConnected:     true,
			City:            "Casablanca",
			Region:          "Grand Casablanca",
			CreatedAt:       time.Now(),
			UpdatedAt:       time.Now(),
			CreatedBy:       "SYSTEM",
		},
	}

	for _, vehicle := range vehicles {
		vehicleJSON, err := json.Marshal(vehicle)
		if err != nil {
			return fmt.Errorf("erreur de sérialisation du véhicule: %v", err)
		}
		err = ctx.GetStub().PutState(vehicle.ID, vehicleJSON)
		if err != nil {
			return fmt.Errorf("erreur d'écriture dans le ledger: %v", err)
		}
	}

	return nil
}

// RegisterVehicle enregistre un nouveau véhicule
func (c *TrafficRegistryContract) RegisterVehicle(ctx contractapi.TransactionContextInterface,
	id, plateNumber, vin string, vehicleType string, brand, model string, year int,
	color string, fuelType string, engineCapacity float64, power, seats int,
	weight float64, ownerID, city, region string) error {

	// Vérifier si le véhicule existe déjà
	exists, err := c.VehicleExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("le véhicule %s existe déjà", id)
	}

	// Vérifier si la plaque n'est pas déjà utilisée
	existingVehicle, _ := c.GetVehicleByPlate(ctx, plateNumber)
	if existingVehicle != nil {
		return fmt.Errorf("la plaque %s est déjà enregistrée", plateNumber)
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "UNKNOWN"
	}

	vehicle := Vehicle{
		DocType:          "vehicle",
		ID:               id,
		PlateNumber:      plateNumber,
		VIN:              vin,
		Type:             VehicleType(vehicleType),
		Status:           VehicleStatusActive,
		Brand:            brand,
		Model:            model,
		Year:             year,
		Color:            color,
		FuelType:         FuelType(fuelType),
		EngineCapacity:   engineCapacity,
		Power:            power,
		Seats:            seats,
		Weight:           weight,
		OwnerID:          ownerID,
		RegistrationDate: time.Now(),
		Mileage:          0,
		IsConnected:      false,
		City:             city,
		Region:           region,
		CreatedAt:        time.Now(),
		UpdatedAt:        time.Now(),
		CreatedBy:        clientID,
	}

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"vehicleId":"%s","plateNumber":"%s","ownerId":"%s"}`,
		id, plateNumber, ownerID)
	ctx.GetStub().SetEvent("VehicleRegistered", []byte(eventPayload))

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// GetVehicle récupère un véhicule par son ID
func (c *TrafficRegistryContract) GetVehicle(ctx contractapi.TransactionContextInterface,
	id string) (*Vehicle, error) {

	vehicleJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if vehicleJSON == nil {
		return nil, fmt.Errorf("le véhicule %s n'existe pas", id)
	}

	var vehicle Vehicle
	err = json.Unmarshal(vehicleJSON, &vehicle)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &vehicle, nil
}

// VehicleExists vérifie si un véhicule existe
func (c *TrafficRegistryContract) VehicleExists(ctx contractapi.TransactionContextInterface,
	id string) (bool, error) {

	vehicleJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	return vehicleJSON != nil, nil
}

// GetVehicleByPlate récupère un véhicule par sa plaque d'immatriculation
func (c *TrafficRegistryContract) GetVehicleByPlate(ctx contractapi.TransactionContextInterface,
	plateNumber string) (*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","plateNumber":"%s"}}`, plateNumber)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		return &vehicle, nil
	}

	return nil, nil
}

// GetVehicleByVIN récupère un véhicule par son VIN
func (c *TrafficRegistryContract) GetVehicleByVIN(ctx contractapi.TransactionContextInterface,
	vin string) (*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","vin":"%s"}}`, vin)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	if resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		return &vehicle, nil
	}

	return nil, nil
}

// UpdateVehicleStatus met à jour le statut d'un véhicule
func (c *TrafficRegistryContract) UpdateVehicleStatus(ctx contractapi.TransactionContextInterface,
	id string, newStatus string) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	oldStatus := vehicle.Status
	vehicle.Status = VehicleStatus(newStatus)
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Alerte si véhicule déclaré volé
	if newStatus == string(VehicleStatusStolen) {
		eventPayload := fmt.Sprintf(`{"vehicleId":"%s","plateNumber":"%s","status":"STOLEN","alert":"PRIORITY"}`,
			id, vehicle.PlateNumber)
		ctx.GetStub().SetEvent("VehicleStolenAlert", []byte(eventPayload))
	}

	// Émettre un événement de changement de statut
	eventPayload := fmt.Sprintf(`{"vehicleId":"%s","oldStatus":"%s","newStatus":"%s"}`,
		id, oldStatus, newStatus)
	ctx.GetStub().SetEvent("VehicleStatusChanged", []byte(eventPayload))

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// UpdateVehicleMileage met à jour le kilométrage
func (c *TrafficRegistryContract) UpdateVehicleMileage(ctx contractapi.TransactionContextInterface,
	id string, mileage int) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	if mileage < vehicle.Mileage {
		return fmt.Errorf("le nouveau kilométrage (%d) ne peut pas être inférieur à l'ancien (%d)",
			mileage, vehicle.Mileage)
	}

	vehicle.Mileage = mileage
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// UpdateVehicleLocation met à jour la position GPS d'un véhicule
func (c *TrafficRegistryContract) UpdateVehicleLocation(ctx contractapi.TransactionContextInterface,
	id string, latitude, longitude float64) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	vehicle.LastLocation = GeoPoint{Latitude: latitude, Longitude: longitude}
	vehicle.LastSeen = time.Now()
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// SetVehicleConnected définit un véhicule comme connecté (IoT)
func (c *TrafficRegistryContract) SetVehicleConnected(ctx contractapi.TransactionContextInterface,
	id string, isConnected bool) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	vehicle.IsConnected = isConnected
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// UpdateInsurance met à jour l'assurance d'un véhicule
func (c *TrafficRegistryContract) UpdateInsurance(ctx contractapi.TransactionContextInterface,
	id, insuranceID string, expiryDate string) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	expiry, err := time.Parse("2006-01-02", expiryDate)
	if err != nil {
		return fmt.Errorf("format de date invalide: %v", err)
	}

	vehicle.InsuranceID = insuranceID
	vehicle.InsuranceExpiry = expiry
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, vehicleJSON)
}

// GetVehiclesByOwner récupère les véhicules d'un propriétaire
func (c *TrafficRegistryContract) GetVehiclesByOwner(ctx contractapi.TransactionContextInterface,
	ownerID string) ([]*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","ownerId":"%s"}}`, ownerID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetVehiclesByType récupère les véhicules par type
func (c *TrafficRegistryContract) GetVehiclesByType(ctx contractapi.TransactionContextInterface,
	vehicleType string) ([]*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","type":"%s"}}`, vehicleType)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetVehiclesByStatus récupère les véhicules par statut
func (c *TrafficRegistryContract) GetVehiclesByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","status":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetVehiclesByCity récupère les véhicules par ville
func (c *TrafficRegistryContract) GetVehiclesByCity(ctx contractapi.TransactionContextInterface,
	city string) ([]*Vehicle, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"vehicle","city":"%s"}}`, city)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetStolenVehicles récupère tous les véhicules déclarés volés
func (c *TrafficRegistryContract) GetStolenVehicles(ctx contractapi.TransactionContextInterface) ([]*Vehicle, error) {
	return c.GetVehiclesByStatus(ctx, string(VehicleStatusStolen))
}

// GetConnectedVehicles récupère les véhicules connectés
func (c *TrafficRegistryContract) GetConnectedVehicles(ctx contractapi.TransactionContextInterface) ([]*Vehicle, error) {
	queryString := `{"selector":{"docType":"vehicle","isConnected":true}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetVehiclesWithExpiredInsurance récupère les véhicules avec assurance expirée
func (c *TrafficRegistryContract) GetVehiclesWithExpiredInsurance(ctx contractapi.TransactionContextInterface) ([]*Vehicle, error) {
	queryString := `{"selector":{"docType":"vehicle","status":"ACTIVE"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var expiredVehicles []*Vehicle
	now := time.Now()

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}

		if vehicle.InsuranceExpiry.Before(now) {
			expiredVehicles = append(expiredVehicles, &vehicle)
		}
	}

	return expiredVehicles, nil
}

// GetAllVehicles récupère tous les véhicules
func (c *TrafficRegistryContract) GetAllVehicles(ctx contractapi.TransactionContextInterface) ([]*Vehicle, error) {
	queryString := `{"selector":{"docType":"vehicle"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var vehicles []*Vehicle
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var vehicle Vehicle
		err = json.Unmarshal(queryResult.Value, &vehicle)
		if err != nil {
			return nil, err
		}
		vehicles = append(vehicles, &vehicle)
	}

	return vehicles, nil
}

// GetVehicleHistory récupère l'historique complet d'un véhicule
func (c *TrafficRegistryContract) GetVehicleHistory(ctx contractapi.TransactionContextInterface,
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
			var vehicle Vehicle
			err = json.Unmarshal(modification.Value, &vehicle)
			if err == nil {
				record["value"] = vehicle
			}
		}

		history = append(history, record)
	}

	return history, nil
}

// DeleteVehicle supprime un véhicule (soft delete - change status to SCRAPPED)
func (c *TrafficRegistryContract) DeleteVehicle(ctx contractapi.TransactionContextInterface,
	id string) error {

	vehicle, err := c.GetVehicle(ctx, id)
	if err != nil {
		return err
	}

	vehicle.Status = VehicleStatusScrapped
	vehicle.UpdatedAt = time.Now()

	vehicleJSON, err := json.Marshal(vehicle)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"vehicleId":"%s","plateNumber":"%s","status":"SCRAPPED"}`,
		id, vehicle.PlateNumber)
	ctx.GetStub().SetEvent("VehicleScrapped", []byte(eventPayload))

	return ctx.GetStub().PutState(id, vehicleJSON)
}
