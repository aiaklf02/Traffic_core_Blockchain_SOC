// ============================================================================
// Transfer Contract - Gestion des transferts, inspections et assurances
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ============================================================================
// Vehicle Transfer Functions
// ============================================================================

// InitiateTransfer initie un transfert de propriété de véhicule
func (c *TrafficRegistryContract) InitiateTransfer(ctx contractapi.TransactionContextInterface,
	transferID, vehicleID, fromOwnerID, toOwnerID string, salePrice, transferTax float64) error {

	// Vérifier que le véhicule existe
	vehicle, err := c.GetVehicle(ctx, vehicleID)
	if err != nil {
		return err
	}

	// Vérifier que le propriétaire actuel correspond
	if vehicle.OwnerID != fromOwnerID {
		return fmt.Errorf("le véhicule %s n'appartient pas à %s", vehicleID, fromOwnerID)
	}

	// Vérifier que le véhicule peut être transféré
	if vehicle.Status == VehicleStatusStolen || vehicle.Status == VehicleStatusScrapped {
		return fmt.Errorf("le véhicule %s ne peut pas être transféré (statut: %s)", vehicleID, vehicle.Status)
	}

	transfer := VehicleTransfer{
		DocType:      "transfer",
		ID:           transferID,
		VehicleID:    vehicleID,
		FromOwnerID:  fromOwnerID,
		ToOwnerID:    toOwnerID,
		TransferDate: time.Now(),
		SalePrice:    salePrice,
		TransferTax:  transferTax,
		Status:       "pending",
		CreatedAt:    time.Now(),
	}

	transferJSON, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Mettre le véhicule en statut "en transit"
	vehicle.Status = VehicleStatusInTransit
	vehicle.UpdatedAt = time.Now()
	vehicleJSON, _ := json.Marshal(vehicle)
	ctx.GetStub().PutState(vehicleID, vehicleJSON)

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"transferId":"%s","vehicleId":"%s","from":"%s","to":"%s"}`,
		transferID, vehicleID, fromOwnerID, toOwnerID)
	ctx.GetStub().SetEvent("TransferInitiated", []byte(eventPayload))

	return ctx.GetStub().PutState(transferID, transferJSON)
}

// GetTransfer récupère un transfert par son ID
func (c *TrafficRegistryContract) GetTransfer(ctx contractapi.TransactionContextInterface,
	transferID string) (*VehicleTransfer, error) {

	transferJSON, err := ctx.GetStub().GetState(transferID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if transferJSON == nil {
		return nil, fmt.Errorf("le transfert %s n'existe pas", transferID)
	}

	var transfer VehicleTransfer
	err = json.Unmarshal(transferJSON, &transfer)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &transfer, nil
}

// ApproveTransfer approuve un transfert de propriété
func (c *TrafficRegistryContract) ApproveTransfer(ctx contractapi.TransactionContextInterface,
	transferID, documentHash string) error {

	transfer, err := c.GetTransfer(ctx, transferID)
	if err != nil {
		return err
	}

	if transfer.Status != "pending" {
		return fmt.Errorf("le transfert %s n'est pas en attente", transferID)
	}

	approvedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		approvedBy = "SYSTEM"
	}

	transfer.Status = "completed"
	transfer.DocumentHash = documentHash
	transfer.ApprovedBy = approvedBy
	transfer.ApprovedAt = time.Now()

	transferJSON, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Mettre à jour le propriétaire du véhicule
	vehicle, err := c.GetVehicle(ctx, transfer.VehicleID)
	if err == nil {
		vehicle.OwnerID = transfer.ToOwnerID
		vehicle.Status = VehicleStatusActive
		vehicle.UpdatedAt = time.Now()
		vehicleJSON, _ := json.Marshal(vehicle)
		ctx.GetStub().PutState(transfer.VehicleID, vehicleJSON)

		// Mettre à jour les associations conducteur
		// Retirer le véhicule de l'ancien propriétaire
		c.DisassociateVehicle(ctx, transfer.FromOwnerID, transfer.VehicleID)
		// Ajouter au nouveau propriétaire
		c.AssociateVehicle(ctx, transfer.ToOwnerID, transfer.VehicleID)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"transferId":"%s","vehicleId":"%s","newOwner":"%s"}`,
		transferID, transfer.VehicleID, transfer.ToOwnerID)
	ctx.GetStub().SetEvent("TransferCompleted", []byte(eventPayload))

	return ctx.GetStub().PutState(transferID, transferJSON)
}

// RejectTransfer rejette un transfert de propriété
func (c *TrafficRegistryContract) RejectTransfer(ctx contractapi.TransactionContextInterface,
	transferID, reason string) error {

	transfer, err := c.GetTransfer(ctx, transferID)
	if err != nil {
		return err
	}

	if transfer.Status != "pending" {
		return fmt.Errorf("le transfert %s n'est pas en attente", transferID)
	}

	transfer.Status = "rejected"

	transferJSON, err := json.Marshal(transfer)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Remettre le véhicule en statut actif
	vehicle, err := c.GetVehicle(ctx, transfer.VehicleID)
	if err == nil {
		vehicle.Status = VehicleStatusActive
		vehicle.UpdatedAt = time.Now()
		vehicleJSON, _ := json.Marshal(vehicle)
		ctx.GetStub().PutState(transfer.VehicleID, vehicleJSON)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"transferId":"%s","reason":"%s"}`, transferID, reason)
	ctx.GetStub().SetEvent("TransferRejected", []byte(eventPayload))

	return ctx.GetStub().PutState(transferID, transferJSON)
}

// GetTransfersByVehicle récupère l'historique des transferts d'un véhicule
func (c *TrafficRegistryContract) GetTransfersByVehicle(ctx contractapi.TransactionContextInterface,
	vehicleID string) ([]*VehicleTransfer, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"transfer","vehicleId":"%s"}}`, vehicleID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var transfers []*VehicleTransfer
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var transfer VehicleTransfer
		err = json.Unmarshal(queryResult.Value, &transfer)
		if err != nil {
			return nil, err
		}
		transfers = append(transfers, &transfer)
	}

	return transfers, nil
}

// ============================================================================
// Technical Inspection Functions
// ============================================================================

// RecordInspection enregistre un contrôle technique
func (c *TrafficRegistryContract) RecordInspection(ctx contractapi.TransactionContextInterface,
	inspectionID, vehicleID string, center, inspector, result string,
	mileage int, defectsJSON, recommendationsJSON, certificateHash string) error {

	// Vérifier que le véhicule existe
	vehicle, err := c.GetVehicle(ctx, vehicleID)
	if err != nil {
		return err
	}

	// Parser les défauts
	var defects []string
	if defectsJSON != "" {
		json.Unmarshal([]byte(defectsJSON), &defects)
	}

	// Parser les recommandations
	var recommendations []string
	if recommendationsJSON != "" {
		json.Unmarshal([]byte(recommendationsJSON), &recommendations)
	}

	inspection := TechnicalInspection{
		DocType:         "inspection",
		ID:              inspectionID,
		VehicleID:       vehicleID,
		InspectionDate:  time.Now(),
		ExpiryDate:      time.Now().AddDate(1, 0, 0), // Valide 1 an
		Center:          center,
		Inspector:       inspector,
		Result:          result,
		Mileage:         mileage,
		Defects:         defects,
		Recommendations: recommendations,
		CertificateHash: certificateHash,
		CreatedAt:       time.Now(),
	}

	// Si échec, réduire la validité
	if result == "fail" {
		inspection.ExpiryDate = time.Now().AddDate(0, 0, 15) // 15 jours pour refaire
	} else if result == "conditional" {
		inspection.ExpiryDate = time.Now().AddDate(0, 2, 0) // 2 mois
	}

	inspectionJSON, err := json.Marshal(inspection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Mettre à jour le véhicule
	vehicle.TechnicalInspection = inspection.InspectionDate
	vehicle.NextInspectionDue = inspection.ExpiryDate
	vehicle.Mileage = mileage
	vehicle.UpdatedAt = time.Now()
	vehicleJSON, _ := json.Marshal(vehicle)
	ctx.GetStub().PutState(vehicleID, vehicleJSON)

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"inspectionId":"%s","vehicleId":"%s","result":"%s"}`,
		inspectionID, vehicleID, result)
	ctx.GetStub().SetEvent("InspectionRecorded", []byte(eventPayload))

	return ctx.GetStub().PutState(inspectionID, inspectionJSON)
}

// GetInspection récupère un contrôle technique par son ID
func (c *TrafficRegistryContract) GetInspection(ctx contractapi.TransactionContextInterface,
	inspectionID string) (*TechnicalInspection, error) {

	inspectionJSON, err := ctx.GetStub().GetState(inspectionID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if inspectionJSON == nil {
		return nil, fmt.Errorf("l'inspection %s n'existe pas", inspectionID)
	}

	var inspection TechnicalInspection
	err = json.Unmarshal(inspectionJSON, &inspection)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &inspection, nil
}

// GetInspectionsByVehicle récupère l'historique des contrôles d'un véhicule
func (c *TrafficRegistryContract) GetInspectionsByVehicle(ctx contractapi.TransactionContextInterface,
	vehicleID string) ([]*TechnicalInspection, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"inspection","vehicleId":"%s"}}`, vehicleID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var inspections []*TechnicalInspection
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var inspection TechnicalInspection
		err = json.Unmarshal(queryResult.Value, &inspection)
		if err != nil {
			return nil, err
		}
		inspections = append(inspections, &inspection)
	}

	return inspections, nil
}

// GetVehiclesNeedingInspection récupère les véhicules nécessitant un contrôle
func (c *TrafficRegistryContract) GetVehiclesNeedingInspection(ctx contractapi.TransactionContextInterface,
	daysAhead int) ([]*Vehicle, error) {

	queryString := `{"selector":{"docType":"vehicle","status":"ACTIVE"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var needingInspection []*Vehicle
	deadline := time.Now().AddDate(0, 0, daysAhead)

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

		if vehicle.NextInspectionDue.Before(deadline) {
			needingInspection = append(needingInspection, &vehicle)
		}
	}

	return needingInspection, nil
}

// ============================================================================
// Insurance Functions
// ============================================================================

// CreateInsurance crée une nouvelle police d'assurance
func (c *TrafficRegistryContract) CreateInsurance(ctx contractapi.TransactionContextInterface,
	insuranceID, vehicleID, policyNumber, company, insuranceType string,
	coverage, premium float64, startDate, endDate, holderName, holderID string) error {

	// Vérifier que le véhicule existe
	vehicle, err := c.GetVehicle(ctx, vehicleID)
	if err != nil {
		return err
	}

	start, err := time.Parse("2006-01-02", startDate)
	if err != nil {
		return fmt.Errorf("format de date de début invalide: %v", err)
	}

	end, err := time.Parse("2006-01-02", endDate)
	if err != nil {
		return fmt.Errorf("format de date de fin invalide: %v", err)
	}

	insurance := Insurance{
		DocType:      "insurance",
		ID:           insuranceID,
		VehicleID:    vehicleID,
		PolicyNumber: policyNumber,
		Company:      company,
		Type:         insuranceType,
		Coverage:     coverage,
		Premium:      premium,
		StartDate:    start,
		EndDate:      end,
		Status:       "active",
		HolderName:   holderName,
		HolderID:     holderID,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	insuranceJSON, err := json.Marshal(insurance)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Mettre à jour le véhicule
	vehicle.InsuranceID = insuranceID
	vehicle.InsuranceExpiry = end
	vehicle.UpdatedAt = time.Now()
	vehicleJSON, _ := json.Marshal(vehicle)
	ctx.GetStub().PutState(vehicleID, vehicleJSON)

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"insuranceId":"%s","vehicleId":"%s","company":"%s"}`,
		insuranceID, vehicleID, company)
	ctx.GetStub().SetEvent("InsuranceCreated", []byte(eventPayload))

	return ctx.GetStub().PutState(insuranceID, insuranceJSON)
}

// GetInsurance récupère une assurance par son ID
func (c *TrafficRegistryContract) GetInsurance(ctx contractapi.TransactionContextInterface,
	insuranceID string) (*Insurance, error) {

	insuranceJSON, err := ctx.GetStub().GetState(insuranceID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if insuranceJSON == nil {
		return nil, fmt.Errorf("l'assurance %s n'existe pas", insuranceID)
	}

	var insurance Insurance
	err = json.Unmarshal(insuranceJSON, &insurance)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &insurance, nil
}

// RenewInsurance renouvelle une assurance
func (c *TrafficRegistryContract) RenewInsurance(ctx contractapi.TransactionContextInterface,
	insuranceID, newEndDate string, newPremium float64) error {

	insurance, err := c.GetInsurance(ctx, insuranceID)
	if err != nil {
		return err
	}

	end, err := time.Parse("2006-01-02", newEndDate)
	if err != nil {
		return fmt.Errorf("format de date invalide: %v", err)
	}

	insurance.EndDate = end
	insurance.Premium = newPremium
	insurance.Status = "active"
	insurance.UpdatedAt = time.Now()

	insuranceJSON, err := json.Marshal(insurance)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Mettre à jour le véhicule
	vehicle, err := c.GetVehicle(ctx, insurance.VehicleID)
	if err == nil {
		vehicle.InsuranceExpiry = end
		vehicle.UpdatedAt = time.Now()
		vehicleJSON, _ := json.Marshal(vehicle)
		ctx.GetStub().PutState(insurance.VehicleID, vehicleJSON)
	}

	return ctx.GetStub().PutState(insuranceID, insuranceJSON)
}

// CancelInsurance annule une assurance
func (c *TrafficRegistryContract) CancelInsurance(ctx contractapi.TransactionContextInterface,
	insuranceID string) error {

	insurance, err := c.GetInsurance(ctx, insuranceID)
	if err != nil {
		return err
	}

	insurance.Status = "cancelled"
	insurance.UpdatedAt = time.Now()

	insuranceJSON, err := json.Marshal(insurance)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(insuranceID, insuranceJSON)
}

// GetInsurancesByVehicle récupère les assurances d'un véhicule
func (c *TrafficRegistryContract) GetInsurancesByVehicle(ctx contractapi.TransactionContextInterface,
	vehicleID string) ([]*Insurance, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"insurance","vehicleId":"%s"}}`, vehicleID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var insurances []*Insurance
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var insurance Insurance
		err = json.Unmarshal(queryResult.Value, &insurance)
		if err != nil {
			return nil, err
		}
		insurances = append(insurances, &insurance)
	}

	return insurances, nil
}

// ============================================================================
// Parking Permit Functions
// ============================================================================

// IssueParkingPermit délivre un permis de stationnement
func (c *TrafficRegistryContract) IssueParkingPermit(ctx contractapi.TransactionContextInterface,
	permitID, vehicleID, driverID, zone, permitType string,
	validFrom, validUntil string, fee float64) error {

	// Vérifier que le véhicule existe
	_, err := c.GetVehicle(ctx, vehicleID)
	if err != nil {
		return err
	}

	from, err := time.Parse("2006-01-02", validFrom)
	if err != nil {
		return fmt.Errorf("format de date de début invalide: %v", err)
	}

	until, err := time.Parse("2006-01-02", validUntil)
	if err != nil {
		return fmt.Errorf("format de date de fin invalide: %v", err)
	}

	issuedBy, _ := ctx.GetClientIdentity().GetID()

	permit := ParkingPermit{
		DocType:    "parkingPermit",
		ID:         permitID,
		VehicleID:  vehicleID,
		DriverID:   driverID,
		Zone:       zone,
		Type:       permitType,
		ValidFrom:  from,
		ValidUntil: until,
		Status:     "active",
		Fee:        fee,
		IssuedBy:   issuedBy,
		CreatedAt:  time.Now(),
	}

	permitJSON, err := json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"permitId":"%s","vehicleId":"%s","zone":"%s","type":"%s"}`,
		permitID, vehicleID, zone, permitType)
	ctx.GetStub().SetEvent("ParkingPermitIssued", []byte(eventPayload))

	return ctx.GetStub().PutState(permitID, permitJSON)
}

// GetParkingPermit récupère un permis de stationnement
func (c *TrafficRegistryContract) GetParkingPermit(ctx contractapi.TransactionContextInterface,
	permitID string) (*ParkingPermit, error) {

	permitJSON, err := ctx.GetStub().GetState(permitID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if permitJSON == nil {
		return nil, fmt.Errorf("le permis %s n'existe pas", permitID)
	}

	var permit ParkingPermit
	err = json.Unmarshal(permitJSON, &permit)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &permit, nil
}

// RevokeParkingPermit révoque un permis de stationnement
func (c *TrafficRegistryContract) RevokeParkingPermit(ctx contractapi.TransactionContextInterface,
	permitID, reason string) error {

	permit, err := c.GetParkingPermit(ctx, permitID)
	if err != nil {
		return err
	}

	permit.Status = "revoked"

	permitJSON, err := json.Marshal(permit)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(permitID, permitJSON)
}

// GetParkingPermitsByVehicle récupère les permis d'un véhicule
func (c *TrafficRegistryContract) GetParkingPermitsByVehicle(ctx contractapi.TransactionContextInterface,
	vehicleID string) ([]*ParkingPermit, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"parkingPermit","vehicleId":"%s"}}`, vehicleID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var permits []*ParkingPermit
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var permit ParkingPermit
		err = json.Unmarshal(queryResult.Value, &permit)
		if err != nil {
			return nil, err
		}
		permits = append(permits, &permit)
	}

	return permits, nil
}

// GetActiveParkingPermitsByZone récupère les permis actifs par zone
func (c *TrafficRegistryContract) GetActiveParkingPermitsByZone(ctx contractapi.TransactionContextInterface,
	zone string) ([]*ParkingPermit, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"parkingPermit","zone":"%s","status":"active"}}`, zone)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var permits []*ParkingPermit
	now := time.Now()

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var permit ParkingPermit
		err = json.Unmarshal(queryResult.Value, &permit)
		if err != nil {
			return nil, err
		}

		// Vérifier la validité
		if permit.ValidFrom.Before(now) && permit.ValidUntil.After(now) {
			permits = append(permits, &permit)
		}
	}

	return permits, nil
}

// ValidateParkingPermit vérifie si un véhicule a un permis valide pour une zone
func (c *TrafficRegistryContract) ValidateParkingPermit(ctx contractapi.TransactionContextInterface,
	vehicleID, zone string) (bool, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"parkingPermit","vehicleId":"%s","zone":"%s","status":"active"}}`,
		vehicleID, zone)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return false, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	now := time.Now()

	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return false, err
		}

		var permit ParkingPermit
		err = json.Unmarshal(queryResult.Value, &permit)
		if err != nil {
			return false, err
		}

		if permit.ValidFrom.Before(now) && permit.ValidUntil.After(now) {
			return true, nil
		}
	}

	return false, nil
}
