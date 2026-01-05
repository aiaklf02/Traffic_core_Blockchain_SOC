// ============================================================================
// Violation Contract - Gestion des infractions routières
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// RecordViolation enregistre une nouvelle infraction
func (c *TrafficRegistryContract) RecordViolation(ctx contractapi.TransactionContextInterface,
	violationID, vehicleID, driverID, plateNumber, violationType, description string,
	latitude, longitude float64, roadID string, speedLimit, recordedSpeed int,
	fineAmount float64, pointsDeducted int, detectedBy, evidenceHash string) error {

	// Vérifier si l'infraction existe déjà
	existingJSON, err := ctx.GetStub().GetState(violationID)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if existingJSON != nil {
		return fmt.Errorf("l'infraction %s existe déjà", violationID)
	}

	processedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		processedBy = "SYSTEM"
	}

	violation := TrafficViolation{
		DocType:        "violation",
		ID:             violationID,
		VehicleID:      vehicleID,
		DriverID:       driverID,
		PlateNumber:    plateNumber,
		ViolationType:  violationType,
		Description:    description,
		Location:       GeoPoint{Latitude: latitude, Longitude: longitude},
		RoadID:         roadID,
		SpeedLimit:     speedLimit,
		RecordedSpeed:  recordedSpeed,
		FineAmount:     fineAmount,
		PointsDeducted: pointsDeducted,
		Status:         "pending",
		DetectedBy:     detectedBy,
		EvidenceHash:   evidenceHash,
		Timestamp:      time.Now(),
		DueDate:        time.Now().AddDate(0, 0, 30), // 30 jours pour payer
		CreatedAt:      time.Now(),
		ProcessedBy:    processedBy,
	}

	violationJSON, err := json.Marshal(violation)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Déduire les points du conducteur si identifié
	if driverID != "" {
		driver, err := c.GetDriver(ctx, driverID)
		if err == nil {
			driver.Points -= pointsDeducted
			if driver.Points < 0 {
				driver.Points = 0
			}
			driver.TotalViolations++
			driver.UpdatedAt = time.Now()

			// Suspendre le permis si plus de points
			if driver.Points == 0 {
				driver.LicenseStatus = LicenseStatusSuspended
			}

			driverJSON, _ := json.Marshal(driver)
			ctx.GetStub().PutState(driverID, driverJSON)
		}
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"violationId":"%s","vehicleId":"%s","type":"%s","fine":%.2f,"points":%d}`,
		violationID, vehicleID, violationType, fineAmount, pointsDeducted)
	ctx.GetStub().SetEvent("ViolationRecorded", []byte(eventPayload))

	return ctx.GetStub().PutState(violationID, violationJSON)
}

// RecordSpeedingViolation enregistre une infraction de vitesse (raccourci)
func (c *TrafficRegistryContract) RecordSpeedingViolation(ctx contractapi.TransactionContextInterface,
	violationID, vehicleID, plateNumber string, latitude, longitude float64,
	roadID string, speedLimit, recordedSpeed int, detectedBy string) error {

	// Calculer l'amende et les points selon le dépassement
	excess := recordedSpeed - speedLimit
	var fineAmount float64
	var pointsDeducted int
	var description string

	switch {
	case excess <= 20:
		fineAmount = 150
		pointsDeducted = 1
		description = fmt.Sprintf("Excès de vitesse léger: %d km/h au lieu de %d km/h", recordedSpeed, speedLimit)
	case excess <= 30:
		fineAmount = 300
		pointsDeducted = 2
		description = fmt.Sprintf("Excès de vitesse: %d km/h au lieu de %d km/h", recordedSpeed, speedLimit)
	case excess <= 40:
		fineAmount = 600
		pointsDeducted = 3
		description = fmt.Sprintf("Excès de vitesse important: %d km/h au lieu de %d km/h", recordedSpeed, speedLimit)
	case excess <= 50:
		fineAmount = 1200
		pointsDeducted = 4
		description = fmt.Sprintf("Grand excès de vitesse: %d km/h au lieu de %d km/h", recordedSpeed, speedLimit)
	default:
		fineAmount = 2500
		pointsDeducted = 6
		description = fmt.Sprintf("Excès de vitesse extrême: %d km/h au lieu de %d km/h", recordedSpeed, speedLimit)
	}

	// Trouver le propriétaire du véhicule
	driverID := ""
	vehicle, err := c.GetVehicleByPlate(ctx, plateNumber)
	if err == nil && vehicle != nil {
		driverID = vehicle.OwnerID
	}

	return c.RecordViolation(ctx, violationID, vehicleID, driverID, plateNumber,
		"speeding", description, latitude, longitude, roadID,
		speedLimit, recordedSpeed, fineAmount, pointsDeducted, detectedBy, "")
}

// RecordRedLightViolation enregistre un franchissement de feu rouge
func (c *TrafficRegistryContract) RecordRedLightViolation(ctx contractapi.TransactionContextInterface,
	violationID, vehicleID, plateNumber string, latitude, longitude float64,
	intersectionID, detectedBy, evidenceHash string) error {

	driverID := ""
	vehicle, err := c.GetVehicleByPlate(ctx, plateNumber)
	if err == nil && vehicle != nil {
		driverID = vehicle.OwnerID
	}

	return c.RecordViolation(ctx, violationID, vehicleID, driverID, plateNumber,
		"red_light", "Franchissement de feu rouge", latitude, longitude, intersectionID,
		0, 0, 700, 4, detectedBy, evidenceHash)
}

// RecordParkingViolation enregistre une infraction de stationnement
func (c *TrafficRegistryContract) RecordParkingViolation(ctx contractapi.TransactionContextInterface,
	violationID, plateNumber, violationSubtype, description string,
	latitude, longitude float64, detectedBy string) error {

	var fineAmount float64
	switch violationSubtype {
	case "no_parking":
		fineAmount = 150
	case "disabled_spot":
		fineAmount = 500
	case "double_parking":
		fineAmount = 200
	case "expired_meter":
		fineAmount = 100
	case "fire_hydrant":
		fineAmount = 400
	default:
		fineAmount = 150
	}

	driverID := ""
	vehicle, err := c.GetVehicleByPlate(ctx, plateNumber)
	if err == nil && vehicle != nil {
		driverID = vehicle.OwnerID
	}

	return c.RecordViolation(ctx, violationID, "", driverID, plateNumber,
		"parking", description, latitude, longitude, "",
		0, 0, fineAmount, 0, detectedBy, "")
}

// GetViolation récupère une infraction par son ID
func (c *TrafficRegistryContract) GetViolation(ctx contractapi.TransactionContextInterface,
	violationID string) (*TrafficViolation, error) {

	violationJSON, err := ctx.GetStub().GetState(violationID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if violationJSON == nil {
		return nil, fmt.Errorf("l'infraction %s n'existe pas", violationID)
	}

	var violation TrafficViolation
	err = json.Unmarshal(violationJSON, &violation)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &violation, nil
}

// PayViolation enregistre le paiement d'une infraction
func (c *TrafficRegistryContract) PayViolation(ctx contractapi.TransactionContextInterface,
	violationID string) error {

	violation, err := c.GetViolation(ctx, violationID)
	if err != nil {
		return err
	}

	if violation.Status == "paid" {
		return fmt.Errorf("l'infraction %s est déjà payée", violationID)
	}

	if violation.Status == "cancelled" {
		return fmt.Errorf("l'infraction %s a été annulée", violationID)
	}

	violation.Status = "paid"
	violation.PaidAt = time.Now()

	violationJSON, err := json.Marshal(violation)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"violationId":"%s","amount":%.2f,"paidAt":"%s"}`,
		violationID, violation.FineAmount, violation.PaidAt.Format(time.RFC3339))
	ctx.GetStub().SetEvent("ViolationPaid", []byte(eventPayload))

	return ctx.GetStub().PutState(violationID, violationJSON)
}

// ContestViolation conteste une infraction
func (c *TrafficRegistryContract) ContestViolation(ctx contractapi.TransactionContextInterface,
	violationID, reason string) error {

	violation, err := c.GetViolation(ctx, violationID)
	if err != nil {
		return err
	}

	if violation.Status != "pending" {
		return fmt.Errorf("seules les infractions en attente peuvent être contestées")
	}

	violation.Status = "contested"

	violationJSON, err := json.Marshal(violation)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"violationId":"%s","reason":"%s"}`, violationID, reason)
	ctx.GetStub().SetEvent("ViolationContested", []byte(eventPayload))

	return ctx.GetStub().PutState(violationID, violationJSON)
}

// CancelViolation annule une infraction (après contestation réussie)
func (c *TrafficRegistryContract) CancelViolation(ctx contractapi.TransactionContextInterface,
	violationID, reason string) error {

	violation, err := c.GetViolation(ctx, violationID)
	if err != nil {
		return err
	}

	if violation.Status == "paid" {
		return fmt.Errorf("impossible d'annuler une infraction déjà payée")
	}

	// Restaurer les points si le conducteur existe
	if violation.DriverID != "" && violation.PointsDeducted > 0 {
		c.RestorePoints(ctx, violation.DriverID, violation.PointsDeducted)
	}

	violation.Status = "cancelled"

	violationJSON, err := json.Marshal(violation)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"violationId":"%s","reason":"%s"}`, violationID, reason)
	ctx.GetStub().SetEvent("ViolationCancelled", []byte(eventPayload))

	return ctx.GetStub().PutState(violationID, violationJSON)
}

// GetViolationsByVehicle récupère les infractions d'un véhicule
func (c *TrafficRegistryContract) GetViolationsByVehicle(ctx contractapi.TransactionContextInterface,
	vehicleID string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","vehicleId":"%s"}}`, vehicleID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationsByPlate récupère les infractions par plaque d'immatriculation
func (c *TrafficRegistryContract) GetViolationsByPlate(ctx contractapi.TransactionContextInterface,
	plateNumber string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","plateNumber":"%s"}}`, plateNumber)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationsByDriver récupère les infractions d'un conducteur
func (c *TrafficRegistryContract) GetViolationsByDriver(ctx contractapi.TransactionContextInterface,
	driverID string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","driverId":"%s"}}`, driverID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationsByStatus récupère les infractions par statut
func (c *TrafficRegistryContract) GetViolationsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","status":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationsByType récupère les infractions par type
func (c *TrafficRegistryContract) GetViolationsByType(ctx contractapi.TransactionContextInterface,
	violationType string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","violationType":"%s"}}`, violationType)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationsByRoad récupère les infractions sur une route
func (c *TrafficRegistryContract) GetViolationsByRoad(ctx contractapi.TransactionContextInterface,
	roadID string) ([]*TrafficViolation, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"violation","roadId":"%s"}}`, roadID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetPendingViolations récupère les infractions en attente de paiement
func (c *TrafficRegistryContract) GetPendingViolations(ctx contractapi.TransactionContextInterface) ([]*TrafficViolation, error) {
	return c.GetViolationsByStatus(ctx, "pending")
}

// GetOverdueViolations récupère les infractions en retard de paiement
func (c *TrafficRegistryContract) GetOverdueViolations(ctx contractapi.TransactionContextInterface) ([]*TrafficViolation, error) {
	queryString := `{"selector":{"docType":"violation","status":"pending"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var overdueViolations []*TrafficViolation
	now := time.Now()

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}

		if violation.DueDate.Before(now) {
			overdueViolations = append(overdueViolations, &violation)
		}
	}

	return overdueViolations, nil
}

// GetAllViolations récupère toutes les infractions
func (c *TrafficRegistryContract) GetAllViolations(ctx contractapi.TransactionContextInterface) ([]*TrafficViolation, error) {
	queryString := `{"selector":{"docType":"violation"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var violations []*TrafficViolation
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var violation TrafficViolation
		err = json.Unmarshal(queryResult.Value, &violation)
		if err != nil {
			return nil, err
		}
		violations = append(violations, &violation)
	}

	return violations, nil
}

// GetViolationStatistics retourne les statistiques des infractions
func (c *TrafficRegistryContract) GetViolationStatistics(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	violations, err := c.GetAllViolations(ctx)
	if err != nil {
		return nil, err
	}

	totalFines := 0.0
	paidFines := 0.0
	pendingCount := 0
	paidCount := 0
	contestedCount := 0
	cancelledCount := 0
	typeCount := make(map[string]int)

	for _, v := range violations {
		totalFines += v.FineAmount
		typeCount[v.ViolationType]++

		switch v.Status {
		case "pending":
			pendingCount++
		case "paid":
			paidCount++
			paidFines += v.FineAmount
		case "contested":
			contestedCount++
		case "cancelled":
			cancelledCount++
		}
	}

	stats := map[string]interface{}{
		"totalViolations":  len(violations),
		"pendingCount":     pendingCount,
		"paidCount":        paidCount,
		"contestedCount":   contestedCount,
		"cancelledCount":   cancelledCount,
		"totalFinesAmount": totalFines,
		"paidFinesAmount":  paidFines,
		"violationsByType": typeCount,
	}

	return stats, nil
}
