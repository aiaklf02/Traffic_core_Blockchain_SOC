// ============================================================================
// Road Manager Contract - Contrat intelligent pour la gestion des routes
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// getTxTimestamp retourne le timestamp de la transaction (déterministe pour tous les endorsers)
func getTxTimestamp(ctx contractapi.TransactionContextInterface) time.Time {
	txTimestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return time.Now()
	}
	return time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos))
}

// RoadManagerContract implémente le contrat de gestion des routes
type RoadManagerContract struct {
	contractapi.Contract
}

// InitLedger initialise le ledger avec des données de test
func (c *RoadManagerContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	roads := []Road{
		{
			DocType:         "road",
			ID:              "ROAD001",
			Name:            "Avenue Mohammed V",
			Type:            RoadTypeBoulevard,
			Status:          RoadStatusOpen,
			StartPoint:      GeoPoint{Latitude: 33.5731, Longitude: -7.5898},
			EndPoint:        GeoPoint{Latitude: 33.5831, Longitude: -7.5798},
			Length:          2500,
			Lanes:           4,
			SpeedLimit:      50,
			CurrentSpeed:    35,
			VehicleCount:    150,
			CongestionLevel: 0.4,
			District:        "Centre-Ville",
			City:            "Casablanca",
			CreatedAt:       getTxTimestamp(ctx),
			LastUpdated:     getTxTimestamp(ctx),
			CreatedBy:       "SYSTEM",
		},
		{
			DocType:         "road",
			ID:              "ROAD002",
			Name:            "Boulevard Zerktouni",
			Type:            RoadTypePrimary,
			Status:          RoadStatusOpen,
			StartPoint:      GeoPoint{Latitude: 33.5850, Longitude: -7.6200},
			EndPoint:        GeoPoint{Latitude: 33.5950, Longitude: -7.6100},
			Length:          3200,
			Lanes:           6,
			SpeedLimit:      60,
			CurrentSpeed:    45,
			VehicleCount:    200,
			CongestionLevel: 0.5,
			District:        "Maarif",
			City:            "Casablanca",
			CreatedAt:       getTxTimestamp(ctx),
			LastUpdated:     getTxTimestamp(ctx),
			CreatedBy:       "SYSTEM",
		},
		{
			DocType:         "road",
			ID:              "ROAD003",
			Name:            "Autoroute A7",
			Type:            RoadTypeHighway,
			Status:          RoadStatusOpen,
			StartPoint:      GeoPoint{Latitude: 33.6000, Longitude: -7.5000},
			EndPoint:        GeoPoint{Latitude: 33.7000, Longitude: -7.4000},
			Length:          15000,
			Lanes:           6,
			SpeedLimit:      120,
			CurrentSpeed:    110,
			VehicleCount:    500,
			CongestionLevel: 0.3,
			District:        "Périphérie",
			City:            "Casablanca",
			CreatedAt:       getTxTimestamp(ctx),
			LastUpdated:     getTxTimestamp(ctx),
			CreatedBy:       "SYSTEM",
		},
	}

	for _, road := range roads {
		roadJSON, err := json.Marshal(road)
		if err != nil {
			return fmt.Errorf("erreur de sérialisation de la route: %v", err)
		}
		err = ctx.GetStub().PutState(road.ID, roadJSON)
		if err != nil {
			return fmt.Errorf("erreur d'écriture dans le ledger: %v", err)
		}
	}

	return nil
}

// CreateRoad crée une nouvelle route
func (c *RoadManagerContract) CreateRoad(ctx contractapi.TransactionContextInterface,
	id, name string, roadType string, startLat, startLon, endLat, endLon float64,
	length float64, lanes, speedLimit int, district, city string) error {

	// Vérifier si la route existe déjà
	exists, err := c.RoadExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("la route %s existe déjà", id)
	}

	// Obtenir l'identité du créateur
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "UNKNOWN"
	}

	road := Road{
		DocType:         "road",
		ID:              id,
		Name:            name,
		Type:            RoadType(roadType),
		Status:          RoadStatusOpen,
		StartPoint:      GeoPoint{Latitude: startLat, Longitude: startLon},
		EndPoint:        GeoPoint{Latitude: endLat, Longitude: endLon},
		Length:          length,
		Lanes:           lanes,
		SpeedLimit:      speedLimit,
		CurrentSpeed:    float64(speedLimit),
		VehicleCount:    0,
		CongestionLevel: 0.0,
		District:        district,
		City:            city,
		CreatedAt:       getTxTimestamp(ctx),
		LastUpdated:     getTxTimestamp(ctx),
		CreatedBy:       clientID,
	}

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, roadJSON)
}

// GetRoad récupère une route par son ID
func (c *RoadManagerContract) GetRoad(ctx contractapi.TransactionContextInterface, id string) (*Road, error) {
	roadJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if roadJSON == nil {
		return nil, fmt.Errorf("la route %s n'existe pas", id)
	}

	var road Road
	err = json.Unmarshal(roadJSON, &road)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &road, nil
}

// UpdateRoadStatus met à jour le statut d'une route
func (c *RoadManagerContract) UpdateRoadStatus(ctx contractapi.TransactionContextInterface,
	id string, newStatus string) error {

	road, err := c.GetRoad(ctx, id)
	if err != nil {
		return err
	}

	road.Status = RoadStatus(newStatus)
	road.LastUpdated = getTxTimestamp(ctx)

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(id, roadJSON)
}

// UpdateTrafficData met à jour les données de trafic d'une route
func (c *RoadManagerContract) UpdateTrafficData(ctx contractapi.TransactionContextInterface,
	id string, currentSpeed float64, vehicleCount int, congestionLevel float64) error {

	road, err := c.GetRoad(ctx, id)
	if err != nil {
		return err
	}

	road.CurrentSpeed = currentSpeed
	road.VehicleCount = vehicleCount
	road.CongestionLevel = congestionLevel
	road.LastUpdated = getTxTimestamp(ctx)

	// Mise à jour automatique du statut basé sur la congestion
	if congestionLevel > 0.8 {
		road.Status = RoadStatusCongested
	} else if road.Status == RoadStatusCongested && congestionLevel < 0.5 {
		road.Status = RoadStatusOpen
	}

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement de mise à jour
	eventPayload := fmt.Sprintf(`{"roadId":"%s","congestionLevel":%f,"vehicleCount":%d}`,
		id, congestionLevel, vehicleCount)
	ctx.GetStub().SetEvent("TrafficUpdate", []byte(eventPayload))

	return ctx.GetStub().PutState(id, roadJSON)
}

// CloseRoad ferme une route
func (c *RoadManagerContract) CloseRoad(ctx contractapi.TransactionContextInterface,
	id string, reason string) error {

	road, err := c.GetRoad(ctx, id)
	if err != nil {
		return err
	}

	road.Status = RoadStatusClosed
	road.LastUpdated = getTxTimestamp(ctx)

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement de fermeture
	eventPayload := fmt.Sprintf(`{"roadId":"%s","status":"CLOSED","reason":"%s"}`, id, reason)
	ctx.GetStub().SetEvent("RoadClosed", []byte(eventPayload))

	return ctx.GetStub().PutState(id, roadJSON)
}

// OpenRoad rouvre une route
func (c *RoadManagerContract) OpenRoad(ctx contractapi.TransactionContextInterface, id string) error {
	road, err := c.GetRoad(ctx, id)
	if err != nil {
		return err
	}

	road.Status = RoadStatusOpen
	road.LastUpdated = getTxTimestamp(ctx)

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement de réouverture
	eventPayload := fmt.Sprintf(`{"roadId":"%s","status":"OPEN"}`, id)
	ctx.GetStub().SetEvent("RoadOpened", []byte(eventPayload))

	return ctx.GetStub().PutState(id, roadJSON)
}

// SetMaintenanceMode met une route en mode maintenance
func (c *RoadManagerContract) SetMaintenanceMode(ctx contractapi.TransactionContextInterface,
	id string, description string) error {

	road, err := c.GetRoad(ctx, id)
	if err != nil {
		return err
	}

	road.Status = RoadStatusMaintenance
	road.LastUpdated = getTxTimestamp(ctx)

	roadJSON, err := json.Marshal(road)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement de maintenance
	eventPayload := fmt.Sprintf(`{"roadId":"%s","status":"MAINTENANCE","description":"%s"}`,
		id, description)
	ctx.GetStub().SetEvent("RoadMaintenance", []byte(eventPayload))

	return ctx.GetStub().PutState(id, roadJSON)
}

// RoadExists vérifie si une route existe
func (c *RoadManagerContract) RoadExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	roadJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	return roadJSON != nil, nil
}

// GetAllRoads récupère toutes les routes
func (c *RoadManagerContract) GetAllRoads(ctx contractapi.TransactionContextInterface) ([]*Road, error) {
	queryString := `{"selector":{"docType":"road"}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var roads []*Road
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var road Road
		err = json.Unmarshal(queryResult.Value, &road)
		if err != nil {
			return nil, err
		}
		roads = append(roads, &road)
	}

	return roads, nil
}

// GetRoadsByStatus récupère les routes par statut
func (c *RoadManagerContract) GetRoadsByStatus(ctx contractapi.TransactionContextInterface,
	status string) ([]*Road, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"road","status":"%s"}}`, status)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var roads []*Road
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var road Road
		err = json.Unmarshal(queryResult.Value, &road)
		if err != nil {
			return nil, err
		}
		roads = append(roads, &road)
	}

	return roads, nil
}

// GetRoadsByDistrict récupère les routes par quartier
func (c *RoadManagerContract) GetRoadsByDistrict(ctx contractapi.TransactionContextInterface,
	district string) ([]*Road, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"road","district":"%s"}}`, district)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var roads []*Road
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var road Road
		err = json.Unmarshal(queryResult.Value, &road)
		if err != nil {
			return nil, err
		}
		roads = append(roads, &road)
	}

	return roads, nil
}

// GetCongestedRoads récupère les routes congestionnées
func (c *RoadManagerContract) GetCongestedRoads(ctx contractapi.TransactionContextInterface,
	threshold float64) ([]*Road, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"road","congestionLevel":{"$gte":%f}}}`, threshold)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var roads []*Road
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var road Road
		err = json.Unmarshal(queryResult.Value, &road)
		if err != nil {
			return nil, err
		}
		roads = append(roads, &road)
	}

	return roads, nil
}

// GetRoadHistory récupère l'historique des modifications d'une route
func (c *RoadManagerContract) GetRoadHistory(ctx contractapi.TransactionContextInterface,
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

		record := make(map[string]interface{})
		record["txId"] = modification.TxId
		record["timestamp"] = time.Unix(modification.Timestamp.Seconds, int64(modification.Timestamp.Nanos)).String()
		record["isDelete"] = modification.IsDelete

		if !modification.IsDelete {
			var road Road
			err = json.Unmarshal(modification.Value, &road)
			if err != nil {
				return nil, err
			}
			record["value"] = road
		}

		history = append(history, record)
	}

	return history, nil
}

// DeleteRoad supprime une route (soft delete)
func (c *RoadManagerContract) DeleteRoad(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := c.RoadExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("la route %s n'existe pas", id)
	}

	return ctx.GetStub().DelState(id)
}

// GetTrafficSummary retourne un résumé du trafic pour toutes les routes
func (c *RoadManagerContract) GetTrafficSummary(ctx contractapi.TransactionContextInterface) (map[string]interface{}, error) {
	roads, err := c.GetAllRoads(ctx)
	if err != nil {
		return nil, err
	}

	summary := make(map[string]interface{})
	totalVehicles := 0
	totalCongestion := 0.0
	openRoads := 0
	closedRoads := 0
	congestedRoads := 0

	for _, road := range roads {
		totalVehicles += road.VehicleCount
		totalCongestion += road.CongestionLevel

		switch road.Status {
		case RoadStatusOpen:
			openRoads++
		case RoadStatusClosed:
			closedRoads++
		case RoadStatusCongested:
			congestedRoads++
		}
	}

	avgCongestion := 0.0
	if len(roads) > 0 {
		avgCongestion = totalCongestion / float64(len(roads))
	}

	summary["totalRoads"] = len(roads)
	summary["totalVehicles"] = totalVehicles
	summary["averageCongestion"] = avgCongestion
	summary["openRoads"] = openRoads
	summary["closedRoads"] = closedRoads
	summary["congestedRoads"] = congestedRoads
	summary["timestamp"] = getTxTimestamp(ctx)

	return summary, nil
}
