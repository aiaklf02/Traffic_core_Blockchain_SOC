// ============================================================================
// Driver Contract - Gestion des conducteurs et permis
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// RegisterDriver enregistre un nouveau conducteur
func (c *TrafficRegistryContract) RegisterDriver(ctx contractapi.TransactionContextInterface,
	id, nationalID, firstName, lastName string, dateOfBirth string,
	address, city, phone, email, licenseNumber string,
	licenseCategories string, licenseExpiry string) error {

	// Vérifier si le conducteur existe déjà
	exists, err := c.DriverExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("le conducteur %s existe déjà", id)
	}

	// Parser la date de naissance
	dob, err := time.Parse("2006-01-02", dateOfBirth)
	if err != nil {
		return fmt.Errorf("format de date de naissance invalide: %v", err)
	}

	// Parser la date d'expiration du permis
	expiry, err := time.Parse("2006-01-02", licenseExpiry)
	if err != nil {
		return fmt.Errorf("format de date d'expiration invalide: %v", err)
	}

	// Parser les catégories de permis
	var categories []LicenseCategory
	err = json.Unmarshal([]byte(licenseCategories), &categories)
	if err != nil {
		// Si ce n'est pas du JSON, traiter comme une seule catégorie
		categories = []LicenseCategory{LicenseCategory(licenseCategories)}
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "UNKNOWN"
	}

	driver := Driver{
		DocType:           "driver",
		ID:                id,
		NationalID:        nationalID,
		FirstName:         firstName,
		LastName:          lastName,
		DateOfBirth:       dob,
		Address:           address,
		City:              city,
		Phone:             phone,
		Email:             email,
		LicenseNumber:     licenseNumber,
		LicenseStatus:     LicenseStatusValid,
		LicenseCategories: categories,
		LicenseIssueDate:  time.Now(),
		LicenseExpiry:     expiry,
		Points:            12, // Points initiaux
		TotalViolations:   0,
		VehicleIDs:        []string{},
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
		CreatedBy:         clientID,
	}

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"driverId":"%s","licenseNumber":"%s","name":"%s %s"}`,
		id, licenseNumber, firstName, lastName)
	ctx.GetStub().SetEvent("DriverRegistered", []byte(eventPayload))

	return ctx.GetStub().PutState(id, driverJSON)
}

// GetDriver récupère un conducteur par son ID
func (c *TrafficRegistryContract) GetDriver(ctx contractapi.TransactionContextInterface,
	id string) (*Driver, error) {

	driverJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if driverJSON == nil {
		return nil, fmt.Errorf("le conducteur %s n'existe pas", id)
	}

	var driver Driver
	err = json.Unmarshal(driverJSON, &driver)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &driver, nil
}

// DriverExists vérifie si un conducteur existe
func (c *TrafficRegistryContract) DriverExists(ctx contractapi.TransactionContextInterface,
	id string) (bool, error) {

	driverJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	return driverJSON != nil, nil
}

// GetDriverByLicense récupère un conducteur par son numéro de permis
func (c *TrafficRegistryContract) GetDriverByLicense(ctx contractapi.TransactionContextInterface,
	licenseNumber string) (*Driver, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"driver","licenseNumber":"%s"}}`, licenseNumber)

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

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		return &driver, nil
	}

	return nil, nil
}

// GetDriverByNationalID récupère un conducteur par son numéro de CIN
func (c *TrafficRegistryContract) GetDriverByNationalID(ctx contractapi.TransactionContextInterface,
	nationalID string) (*Driver, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"driver","nationalId":"%s"}}`, nationalID)

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

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		return &driver, nil
	}

	return nil, nil
}

// UpdateLicenseStatus met à jour le statut du permis
func (c *TrafficRegistryContract) UpdateLicenseStatus(ctx contractapi.TransactionContextInterface,
	id string, newStatus string) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	oldStatus := driver.LicenseStatus
	driver.LicenseStatus = LicenseStatus(newStatus)
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement si permis suspendu ou révoqué
	if newStatus == string(LicenseStatusSuspended) || newStatus == string(LicenseStatusRevoked) {
		eventPayload := fmt.Sprintf(`{"driverId":"%s","licenseNumber":"%s","oldStatus":"%s","newStatus":"%s"}`,
			id, driver.LicenseNumber, oldStatus, newStatus)
		ctx.GetStub().SetEvent("LicenseStatusAlert", []byte(eventPayload))
	}

	return ctx.GetStub().PutState(id, driverJSON)
}

// DeductPoints déduit des points du permis
func (c *TrafficRegistryContract) DeductPoints(ctx contractapi.TransactionContextInterface,
	id string, points int, reason string) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	driver.Points -= points
	if driver.Points < 0 {
		driver.Points = 0
	}
	driver.UpdatedAt = time.Now()

	// Si plus de points, suspendre le permis
	if driver.Points == 0 {
		driver.LicenseStatus = LicenseStatusSuspended

		eventPayload := fmt.Sprintf(`{"driverId":"%s","licenseNumber":"%s","reason":"NO_POINTS","alert":"LICENSE_SUSPENDED"}`,
			id, driver.LicenseNumber)
		ctx.GetStub().SetEvent("LicenseSuspended", []byte(eventPayload))
	}

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"driverId":"%s","pointsDeducted":%d,"remainingPoints":%d,"reason":"%s"}`,
		id, points, driver.Points, reason)
	ctx.GetStub().SetEvent("PointsDeducted", []byte(eventPayload))

	return ctx.GetStub().PutState(id, driverJSON)
}

// RestorePoints restaure des points du permis
func (c *TrafficRegistryContract) RestorePoints(ctx contractapi.TransactionContextInterface,
	id string, points int) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	driver.Points += points
	if driver.Points > 12 {
		driver.Points = 12 // Maximum 12 points
	}

	// Si le permis était suspendu pour manque de points, le réactiver
	if driver.LicenseStatus == LicenseStatusSuspended && driver.Points > 0 {
		driver.LicenseStatus = LicenseStatusValid
	}

	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, driverJSON)
}

// RenewLicense renouvelle un permis de conduire
func (c *TrafficRegistryContract) RenewLicense(ctx contractapi.TransactionContextInterface,
	id string, newExpiryDate string) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	expiry, err := time.Parse("2006-01-02", newExpiryDate)
	if err != nil {
		return fmt.Errorf("format de date invalide: %v", err)
	}

	driver.LicenseExpiry = expiry
	driver.LicenseStatus = LicenseStatusValid
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"driverId":"%s","licenseNumber":"%s","newExpiry":"%s"}`,
		id, driver.LicenseNumber, newExpiryDate)
	ctx.GetStub().SetEvent("LicenseRenewed", []byte(eventPayload))

	return ctx.GetStub().PutState(id, driverJSON)
}

// AddLicenseCategory ajoute une catégorie au permis
func (c *TrafficRegistryContract) AddLicenseCategory(ctx contractapi.TransactionContextInterface,
	id string, category string) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	// Vérifier si la catégorie n'existe pas déjà
	for _, cat := range driver.LicenseCategories {
		if string(cat) == category {
			return fmt.Errorf("la catégorie %s existe déjà", category)
		}
	}

	driver.LicenseCategories = append(driver.LicenseCategories, LicenseCategory(category))
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, driverJSON)
}

// AssociateVehicle associe un véhicule à un conducteur
func (c *TrafficRegistryContract) AssociateVehicle(ctx contractapi.TransactionContextInterface,
	driverID, vehicleID string) error {

	driver, err := c.GetDriver(ctx, driverID)
	if err != nil {
		return err
	}

	// Vérifier que le véhicule existe
	exists, err := c.VehicleExists(ctx, vehicleID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("le véhicule %s n'existe pas", vehicleID)
	}

	// Vérifier si le véhicule n'est pas déjà associé
	for _, vid := range driver.VehicleIDs {
		if vid == vehicleID {
			return fmt.Errorf("le véhicule %s est déjà associé à ce conducteur", vehicleID)
		}
	}

	driver.VehicleIDs = append(driver.VehicleIDs, vehicleID)
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(driverID, driverJSON)
}

// DisassociateVehicle dissocie un véhicule d'un conducteur
func (c *TrafficRegistryContract) DisassociateVehicle(ctx contractapi.TransactionContextInterface,
	driverID, vehicleID string) error {

	driver, err := c.GetDriver(ctx, driverID)
	if err != nil {
		return err
	}

	// Trouver et supprimer le véhicule
	found := false
	newVehicleIDs := []string{}
	for _, vid := range driver.VehicleIDs {
		if vid == vehicleID {
			found = true
		} else {
			newVehicleIDs = append(newVehicleIDs, vid)
		}
	}

	if !found {
		return fmt.Errorf("le véhicule %s n'est pas associé à ce conducteur", vehicleID)
	}

	driver.VehicleIDs = newVehicleIDs
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(driverID, driverJSON)
}

// UpdateDriverContact met à jour les informations de contact
func (c *TrafficRegistryContract) UpdateDriverContact(ctx contractapi.TransactionContextInterface,
	id, address, city, phone, email string) error {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return err
	}

	if address != "" {
		driver.Address = address
	}
	if city != "" {
		driver.City = city
	}
	if phone != "" {
		driver.Phone = phone
	}
	if email != "" {
		driver.Email = email
	}
	driver.UpdatedAt = time.Now()

	driverJSON, err := json.Marshal(driver)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, driverJSON)
}

// GetDriversByCity récupère les conducteurs par ville
func (c *TrafficRegistryContract) GetDriversByCity(ctx contractapi.TransactionContextInterface,
	city string) ([]*Driver, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"driver","city":"%s"}}`, city)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var drivers []*Driver
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	return drivers, nil
}

// GetDriversByLicenseStatus récupère les conducteurs par statut de permis
func (c *TrafficRegistryContract) GetDriversByLicenseStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*Driver, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"driver","licenseStatus":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var drivers []*Driver
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	return drivers, nil
}

// GetDriversWithLowPoints récupère les conducteurs avec peu de points
func (c *TrafficRegistryContract) GetDriversWithLowPoints(ctx contractapi.TransactionContextInterface,
	threshold int) ([]*Driver, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"driver","points":{"$lte":%d}}}`, threshold)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var drivers []*Driver
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	return drivers, nil
}

// GetDriversWithExpiredLicense récupère les conducteurs avec permis expiré
func (c *TrafficRegistryContract) GetDriversWithExpiredLicense(ctx contractapi.TransactionContextInterface) ([]*Driver, error) {
	queryString := `{"selector":{"docType":"driver"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var expiredDrivers []*Driver
	now := time.Now()

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}

		if driver.LicenseExpiry.Before(now) {
			expiredDrivers = append(expiredDrivers, &driver)
		}
	}

	return expiredDrivers, nil
}

// GetAllDrivers récupère tous les conducteurs
func (c *TrafficRegistryContract) GetAllDrivers(ctx contractapi.TransactionContextInterface) ([]*Driver, error) {
	queryString := `{"selector":{"docType":"driver"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var drivers []*Driver
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var driver Driver
		err = json.Unmarshal(queryResult.Value, &driver)
		if err != nil {
			return nil, err
		}
		drivers = append(drivers, &driver)
	}

	return drivers, nil
}

// GetDriverHistory récupère l'historique complet d'un conducteur
func (c *TrafficRegistryContract) GetDriverHistory(ctx contractapi.TransactionContextInterface,
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
			var driver Driver
			err = json.Unmarshal(modification.Value, &driver)
			if err == nil {
				record["value"] = driver
			}
		}

		history = append(history, record)
	}

	return history, nil
}

// GetDriverStatistics retourne les statistiques d'un conducteur
func (c *TrafficRegistryContract) GetDriverStatistics(ctx contractapi.TransactionContextInterface,
	id string) (map[string]interface{}, error) {

	driver, err := c.GetDriver(ctx, id)
	if err != nil {
		return nil, err
	}

	stats := map[string]interface{}{
		"driverId":        id,
		"name":            driver.FirstName + " " + driver.LastName,
		"licenseNumber":   driver.LicenseNumber,
		"licenseStatus":   driver.LicenseStatus,
		"points":          driver.Points,
		"totalViolations": driver.TotalViolations,
		"vehicleCount":    len(driver.VehicleIDs),
		"licenseExpiry":   driver.LicenseExpiry,
		"categories":      driver.LicenseCategories,
	}

	return stats, nil
}
