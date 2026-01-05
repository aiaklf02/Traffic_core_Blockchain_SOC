// ============================================================================
// Intersection Contract - Gestion des carrefours et feux de signalisation
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// CreateIntersection crée un nouveau carrefour
func (c *RoadManagerContract) CreateIntersection(ctx contractapi.TransactionContextInterface,
	id, name string, latitude, longitude float64, intersectionType string, priority int) error {

	// Vérifier si l'intersection existe déjà
	existingJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if existingJSON != nil {
		return fmt.Errorf("l'intersection %s existe déjà", id)
	}

	intersection := Intersection{
		DocType:        "intersection",
		ID:             id,
		Name:           name,
		Location:       GeoPoint{Latitude: latitude, Longitude: longitude},
		ConnectedRoads: []string{},
		TrafficLights:  []TrafficLight{},
		Type:           intersectionType,
		Priority:       priority,
		CreatedAt:      time.Now(),
		LastUpdated:    time.Now(),
	}

	intersectionJSON, err := json.Marshal(intersection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, intersectionJSON)
}

// GetIntersection récupère un carrefour par son ID
func (c *RoadManagerContract) GetIntersection(ctx contractapi.TransactionContextInterface,
	id string) (*Intersection, error) {

	intersectionJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if intersectionJSON == nil {
		return nil, fmt.Errorf("l'intersection %s n'existe pas", id)
	}

	var intersection Intersection
	err = json.Unmarshal(intersectionJSON, &intersection)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &intersection, nil
}

// ConnectRoadToIntersection connecte une route à un carrefour
func (c *RoadManagerContract) ConnectRoadToIntersection(ctx contractapi.TransactionContextInterface,
	intersectionID, roadID string) error {

	intersection, err := c.GetIntersection(ctx, intersectionID)
	if err != nil {
		return err
	}

	// Vérifier que la route existe
	exists, err := c.RoadExists(ctx, roadID)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("la route %s n'existe pas", roadID)
	}

	// Vérifier si la route n'est pas déjà connectée
	for _, connectedRoad := range intersection.ConnectedRoads {
		if connectedRoad == roadID {
			return fmt.Errorf("la route %s est déjà connectée à cette intersection", roadID)
		}
	}

	intersection.ConnectedRoads = append(intersection.ConnectedRoads, roadID)
	intersection.LastUpdated = time.Now()

	intersectionJSON, err := json.Marshal(intersection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(intersectionID, intersectionJSON)
}

// AddTrafficLight ajoute un feu de signalisation à un carrefour
func (c *RoadManagerContract) AddTrafficLight(ctx contractapi.TransactionContextInterface,
	intersectionID, lightID, direction string, greenDuration, redDuration int) error {

	intersection, err := c.GetIntersection(ctx, intersectionID)
	if err != nil {
		return err
	}

	trafficLight := TrafficLight{
		ID:            lightID,
		Direction:     direction,
		State:         TrafficLightRed,
		GreenDuration: greenDuration,
		RedDuration:   redDuration,
		LastChanged:   time.Now(),
	}

	intersection.TrafficLights = append(intersection.TrafficLights, trafficLight)
	intersection.LastUpdated = time.Now()

	intersectionJSON, err := json.Marshal(intersection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(intersectionID, intersectionJSON)
}

// UpdateTrafficLightState met à jour l'état d'un feu de signalisation
func (c *RoadManagerContract) UpdateTrafficLightState(ctx contractapi.TransactionContextInterface,
	intersectionID, lightID string, newState string) error {

	intersection, err := c.GetIntersection(ctx, intersectionID)
	if err != nil {
		return err
	}

	found := false
	for i, light := range intersection.TrafficLights {
		if light.ID == lightID {
			intersection.TrafficLights[i].State = TrafficLightState(newState)
			intersection.TrafficLights[i].LastChanged = time.Now()
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("le feu %s n'existe pas dans l'intersection %s", lightID, intersectionID)
	}

	intersection.LastUpdated = time.Now()

	intersectionJSON, err := json.Marshal(intersection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"intersectionId":"%s","lightId":"%s","newState":"%s"}`,
		intersectionID, lightID, newState)
	ctx.GetStub().SetEvent("TrafficLightChange", []byte(eventPayload))

	return ctx.GetStub().PutState(intersectionID, intersectionJSON)
}

// OptimizeTrafficLights optimise les durées des feux basé sur le trafic
func (c *RoadManagerContract) OptimizeTrafficLights(ctx contractapi.TransactionContextInterface,
	intersectionID string) error {

	intersection, err := c.GetIntersection(ctx, intersectionID)
	if err != nil {
		return err
	}

	// Calculer la congestion moyenne des routes connectées
	totalCongestion := 0.0
	for _, roadID := range intersection.ConnectedRoads {
		road, err := c.GetRoad(ctx, roadID)
		if err != nil {
			continue
		}
		totalCongestion += road.CongestionLevel
	}

	avgCongestion := 0.0
	if len(intersection.ConnectedRoads) > 0 {
		avgCongestion = totalCongestion / float64(len(intersection.ConnectedRoads))
	}

	// Ajuster les durées des feux en fonction de la congestion
	for i := range intersection.TrafficLights {
		if avgCongestion > 0.7 {
			// Augmenter la durée du vert en cas de forte congestion
			intersection.TrafficLights[i].GreenDuration = int(float64(intersection.TrafficLights[i].GreenDuration) * 1.2)
		} else if avgCongestion < 0.3 {
			// Réduire la durée du vert en cas de faible trafic
			intersection.TrafficLights[i].GreenDuration = int(float64(intersection.TrafficLights[i].GreenDuration) * 0.9)
		}
		// Limiter les durées min/max
		if intersection.TrafficLights[i].GreenDuration < 15 {
			intersection.TrafficLights[i].GreenDuration = 15
		}
		if intersection.TrafficLights[i].GreenDuration > 90 {
			intersection.TrafficLights[i].GreenDuration = 90
		}
	}

	intersection.LastUpdated = time.Now()

	intersectionJSON, err := json.Marshal(intersection)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement d'optimisation
	eventPayload := fmt.Sprintf(`{"intersectionId":"%s","avgCongestion":%f,"optimized":true}`,
		intersectionID, avgCongestion)
	ctx.GetStub().SetEvent("TrafficLightOptimized", []byte(eventPayload))

	return ctx.GetStub().PutState(intersectionID, intersectionJSON)
}

// GetAllIntersections récupère tous les carrefours
func (c *RoadManagerContract) GetAllIntersections(ctx contractapi.TransactionContextInterface) ([]*Intersection, error) {
	queryString := `{"selector":{"docType":"intersection"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var intersections []*Intersection
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var intersection Intersection
		err = json.Unmarshal(queryResult.Value, &intersection)
		if err != nil {
			return nil, err
		}
		intersections = append(intersections, &intersection)
	}

	return intersections, nil
}

// DeleteIntersection supprime un carrefour
func (c *RoadManagerContract) DeleteIntersection(ctx contractapi.TransactionContextInterface, id string) error {
	existingJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if existingJSON == nil {
		return fmt.Errorf("l'intersection %s n'existe pas", id)
	}

	return ctx.GetStub().DelState(id)
}
