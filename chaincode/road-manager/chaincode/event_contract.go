// ============================================================================
// Road Event Contract - Gestion des événements routiers
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ReportRoadEvent signale un événement sur une route
func (c *RoadManagerContract) ReportRoadEvent(ctx contractapi.TransactionContextInterface,
	eventID, roadID, eventType, severity, description string,
	latitude, longitude float64) error {

	// Vérifier que la route existe
	exists, err := c.RoadExists(ctx, roadID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("la route %s n'existe pas", roadID)
	}

	// Obtenir l'identité du rapporteur
	reportedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		reportedBy = "ANONYMOUS"
	}

	event := RoadEvent{
		DocType:     "roadEvent",
		ID:          eventID,
		RoadID:      roadID,
		EventType:   eventType,
		Severity:    severity,
		Description: description,
		Location:    GeoPoint{Latitude: latitude, Longitude: longitude},
		StartTime:   time.Now(),
		IsActive:    true,
		ReportedBy:  reportedBy,
		CreatedAt:   time.Now(),
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Si c'est un accident ou événement critique, mettre à jour le statut de la route
	if eventType == "accident" || severity == "critical" {
		road, err := c.GetRoad(ctx, roadID)
		if err == nil {
			road.Status = RoadStatusAccident
			road.LastUpdated = time.Now()
			roadJSON, _ := json.Marshal(road)
			ctx.GetStub().PutState(roadID, roadJSON)
		}
	}

	// Émettre un événement blockchain
	eventPayload := fmt.Sprintf(`{"eventId":"%s","roadId":"%s","eventType":"%s","severity":"%s"}`,
		eventID, roadID, eventType, severity)
	ctx.GetStub().SetEvent("RoadEventReported", []byte(eventPayload))

	return ctx.GetStub().PutState(eventID, eventJSON)
}

// GetRoadEvent récupère un événement par son ID
func (c *RoadManagerContract) GetRoadEvent(ctx contractapi.TransactionContextInterface,
	eventID string) (*RoadEvent, error) {

	eventJSON, err := ctx.GetStub().GetState(eventID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if eventJSON == nil {
		return nil, fmt.Errorf("l'événement %s n'existe pas", eventID)
	}

	var event RoadEvent
	err = json.Unmarshal(eventJSON, &event)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &event, nil
}

// ResolveRoadEvent résout/clôture un événement
func (c *RoadManagerContract) ResolveRoadEvent(ctx contractapi.TransactionContextInterface,
	eventID string) error {

	event, err := c.GetRoadEvent(ctx, eventID)
	if err != nil {
		return err
	}

	event.IsActive = false
	event.EndTime = time.Now()

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Si la route était en statut accident, la remettre en OPEN
	road, err := c.GetRoad(ctx, event.RoadID)
	if err == nil && road.Status == RoadStatusAccident {
		road.Status = RoadStatusOpen
		road.LastUpdated = time.Now()
		roadJSON, _ := json.Marshal(road)
		ctx.GetStub().PutState(event.RoadID, roadJSON)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"eventId":"%s","roadId":"%s","resolved":true}`,
		eventID, event.RoadID)
	ctx.GetStub().SetEvent("RoadEventResolved", []byte(eventPayload))

	return ctx.GetStub().PutState(eventID, eventJSON)
}

// GetActiveEventsForRoad récupère les événements actifs pour une route
func (c *RoadManagerContract) GetActiveEventsForRoad(ctx contractapi.TransactionContextInterface,
	roadID string) ([]*RoadEvent, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"roadEvent","roadId":"%s","isActive":true}}`, roadID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var events []*RoadEvent
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var event RoadEvent
		err = json.Unmarshal(queryResult.Value, &event)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetAllActiveEvents récupère tous les événements actifs
func (c *RoadManagerContract) GetAllActiveEvents(ctx contractapi.TransactionContextInterface) ([]*RoadEvent, error) {
	queryString := `{"selector":{"docType":"roadEvent","isActive":true}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var events []*RoadEvent
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var event RoadEvent
		err = json.Unmarshal(queryResult.Value, &event)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// GetEventsBySeverity récupère les événements par niveau de gravité
func (c *RoadManagerContract) GetEventsBySeverity(ctx contractapi.TransactionContextInterface,
	severity string) ([]*RoadEvent, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"roadEvent","severity":"%s","isActive":true}}`, severity)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var events []*RoadEvent
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var event RoadEvent
		err = json.Unmarshal(queryResult.Value, &event)
		if err != nil {
			return nil, err
		}
		events = append(events, &event)
	}

	return events, nil
}

// ScheduleMaintenance planifie une maintenance sur une route
func (c *RoadManagerContract) ScheduleMaintenance(ctx contractapi.TransactionContextInterface,
	scheduleID, roadID, maintenanceType, description, contractor string,
	startTime, endTime time.Time, estimatedCost float64) error {

	// Vérifier que la route existe
	exists, err := c.RoadExists(ctx, roadID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("la route %s n'existe pas", roadID)
	}

	// Obtenir l'identité du créateur
	createdBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		createdBy = "UNKNOWN"
	}

	schedule := RoadMaintenanceSchedule{
		DocType:        "maintenanceSchedule",
		ID:             scheduleID,
		RoadID:         roadID,
		Type:           maintenanceType,
		Description:    description,
		ScheduledStart: startTime,
		ScheduledEnd:   endTime,
		Status:         "planned",
		Contractor:     contractor,
		EstimatedCost:  estimatedCost,
		CreatedBy:      createdBy,
		CreatedAt:      time.Now(),
	}

	scheduleJSON, err := json.Marshal(schedule)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"scheduleId":"%s","roadId":"%s","type":"%s"}`,
		scheduleID, roadID, maintenanceType)
	ctx.GetStub().SetEvent("MaintenanceScheduled", []byte(eventPayload))

	return ctx.GetStub().PutState(scheduleID, scheduleJSON)
}

// GetMaintenanceScheduleForRoad récupère les maintenances planifiées pour une route
func (c *RoadManagerContract) GetMaintenanceScheduleForRoad(ctx contractapi.TransactionContextInterface,
	roadID string) ([]*RoadMaintenanceSchedule, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"maintenanceSchedule","roadId":"%s"}}`, roadID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var schedules []*RoadMaintenanceSchedule
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var schedule RoadMaintenanceSchedule
		err = json.Unmarshal(queryResult.Value, &schedule)
		if err != nil {
			return nil, err
		}
		schedules = append(schedules, &schedule)
	}

	return schedules, nil
}

// UpdateMaintenanceStatus met à jour le statut d'une maintenance
func (c *RoadManagerContract) UpdateMaintenanceStatus(ctx contractapi.TransactionContextInterface,
	scheduleID, newStatus string) error {

	scheduleJSON, err := ctx.GetStub().GetState(scheduleID)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if scheduleJSON == nil {
		return fmt.Errorf("la planification %s n'existe pas", scheduleID)
	}

	var schedule RoadMaintenanceSchedule
	err = json.Unmarshal(scheduleJSON, &schedule)
	if err != nil {
		return fmt.Errorf("erreur de désérialisation: %v", err)
	}

	schedule.Status = newStatus

	// Si la maintenance commence, mettre la route en maintenance
	if newStatus == "in_progress" {
		road, err := c.GetRoad(ctx, schedule.RoadID)
		if err == nil {
			road.Status = RoadStatusMaintenance
			road.LastUpdated = time.Now()
			roadJSON, _ := json.Marshal(road)
			ctx.GetStub().PutState(schedule.RoadID, roadJSON)
		}
	}

	// Si la maintenance est terminée, rouvrir la route
	if newStatus == "completed" {
		road, err := c.GetRoad(ctx, schedule.RoadID)
		if err == nil {
			road.Status = RoadStatusOpen
			road.LastUpdated = time.Now()
			roadJSON, _ := json.Marshal(road)
			ctx.GetStub().PutState(schedule.RoadID, roadJSON)
		}
	}

	updatedScheduleJSON, err := json.Marshal(schedule)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(scheduleID, updatedScheduleJSON)
}
