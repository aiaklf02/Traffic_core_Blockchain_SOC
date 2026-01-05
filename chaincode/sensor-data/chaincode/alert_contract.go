// ============================================================================
// Alert Contract - Gestion des alertes de capteurs
// Smart City Traffic Management System
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// CreateAlert crée une nouvelle alerte
func (c *SensorDataContract) CreateAlert(ctx contractapi.TransactionContextInterface,
	alertID, sensorID, alertType, severity, message string,
	threshold, actualValue float64) error {

	// Vérifier que le capteur existe
	_, err := c.GetSensor(ctx, sensorID)
	if err != nil {
		return err
	}

	alert := SensorAlert{
		DocType:     "sensorAlert",
		ID:          alertID,
		SensorID:    sensorID,
		AlertType:   alertType,
		Severity:    severity,
		Message:     message,
		Threshold:   threshold,
		ActualValue: actualValue,
		Timestamp:   time.Now(),
		IsResolved:  false,
	}

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement blockchain
	eventPayload := fmt.Sprintf(`{"alertId":"%s","sensorId":"%s","alertType":"%s","severity":"%s"}`,
		alertID, sensorID, alertType, severity)
	ctx.GetStub().SetEvent("SensorAlertCreated", []byte(eventPayload))

	return ctx.GetStub().PutState(alertID, alertJSON)
}

// GetAlert récupère une alerte par son ID
func (c *SensorDataContract) GetAlert(ctx contractapi.TransactionContextInterface,
	alertID string) (*SensorAlert, error) {

	alertJSON, err := ctx.GetStub().GetState(alertID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if alertJSON == nil {
		return nil, fmt.Errorf("l'alerte %s n'existe pas", alertID)
	}

	var alert SensorAlert
	err = json.Unmarshal(alertJSON, &alert)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &alert, nil
}

// ResolveAlert résout une alerte
func (c *SensorDataContract) ResolveAlert(ctx contractapi.TransactionContextInterface,
	alertID string) error {

	alert, err := c.GetAlert(ctx, alertID)
	if err != nil {
		return err
	}

	if alert.IsResolved {
		return fmt.Errorf("l'alerte %s est déjà résolue", alertID)
	}

	resolvedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		resolvedBy = "UNKNOWN"
	}

	alert.IsResolved = true
	alert.ResolvedAt = time.Now()
	alert.ResolvedBy = resolvedBy

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"alertId":"%s","sensorId":"%s","resolvedBy":"%s"}`,
		alertID, alert.SensorID, resolvedBy)
	ctx.GetStub().SetEvent("SensorAlertResolved", []byte(eventPayload))

	return ctx.GetStub().PutState(alertID, alertJSON)
}

// GetAlertsBySensor récupère les alertes d'un capteur
func (c *SensorDataContract) GetAlertsBySensor(ctx contractapi.TransactionContextInterface,
	sensorID string) ([]*SensorAlert, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensorAlert","sensorId":"%s"}}`, sensorID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []*SensorAlert
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var alert SensorAlert
		err = json.Unmarshal(queryResult.Value, &alert)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, &alert)
	}

	return alerts, nil
}

// GetActiveAlerts récupère toutes les alertes non résolues
func (c *SensorDataContract) GetActiveAlerts(ctx contractapi.TransactionContextInterface) ([]*SensorAlert, error) {
	queryString := `{"selector":{"docType":"sensorAlert","isResolved":false}}`

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []*SensorAlert
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var alert SensorAlert
		err = json.Unmarshal(queryResult.Value, &alert)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, &alert)
	}

	return alerts, nil
}

// GetAlertsBySeverity récupère les alertes par niveau de gravité
func (c *SensorDataContract) GetAlertsBySeverity(ctx contractapi.TransactionContextInterface,
	severity string) ([]*SensorAlert, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensorAlert","severity":"%s","isResolved":false}}`, severity)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []*SensorAlert
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var alert SensorAlert
		err = json.Unmarshal(queryResult.Value, &alert)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, &alert)
	}

	return alerts, nil
}

// GetCriticalAlerts récupère les alertes critiques non résolues
func (c *SensorDataContract) GetCriticalAlerts(ctx contractapi.TransactionContextInterface) ([]*SensorAlert, error) {
	return c.GetAlertsBySeverity(ctx, "critical")
}

// GetAlertsByType récupère les alertes par type
func (c *SensorDataContract) GetAlertsByType(ctx contractapi.TransactionContextInterface,
	alertType string) ([]*SensorAlert, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensorAlert","alertType":"%s","isResolved":false}}`, alertType)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []*SensorAlert
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var alert SensorAlert
		err = json.Unmarshal(queryResult.Value, &alert)
		if err != nil {
			return nil, err
		}
		alerts = append(alerts, &alert)
	}

	return alerts, nil
}

// GetAlertCount compte les alertes actives par capteur
func (c *SensorDataContract) GetAlertCount(ctx contractapi.TransactionContextInterface,
	sensorID string) (int, error) {

	alerts, err := c.GetAlertsBySensor(ctx, sensorID)
	if err != nil {
		return 0, err
	}

	count := 0
	for _, alert := range alerts {
		if !alert.IsResolved {
			count++
		}
	}

	return count, nil
}

// EscalateAlert escalade une alerte vers un niveau supérieur
func (c *SensorDataContract) EscalateAlert(ctx contractapi.TransactionContextInterface,
	alertID string) error {

	alert, err := c.GetAlert(ctx, alertID)
	if err != nil {
		return err
	}

	if alert.IsResolved {
		return fmt.Errorf("impossible d'escalader une alerte résolue")
	}

	// Escalade du niveau de sévérité
	switch alert.Severity {
	case "info":
		alert.Severity = "warning"
	case "warning":
		alert.Severity = "critical"
	case "critical":
		return fmt.Errorf("l'alerte est déjà au niveau critique")
	}

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"alertId":"%s","sensorId":"%s","newSeverity":"%s"}`,
		alertID, alert.SensorID, alert.Severity)
	ctx.GetStub().SetEvent("AlertEscalated", []byte(eventPayload))

	return ctx.GetStub().PutState(alertID, alertJSON)
}

// CreateCalibration enregistre une calibration de capteur
func (c *SensorDataContract) CreateCalibration(ctx contractapi.TransactionContextInterface,
	calibrationID, sensorID string, previousOffset, newOffset float64, notes string) error {

	// Vérifier que le capteur existe
	_, err := c.GetSensor(ctx, sensorID)
	if err != nil {
		return err
	}

	calibratedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		calibratedBy = "UNKNOWN"
	}

	calibration := SensorCalibration{
		DocType:         "sensorCalibration",
		ID:              calibrationID,
		SensorID:        sensorID,
		CalibratedAt:    time.Now(),
		CalibratedBy:    calibratedBy,
		PreviousOffset:  previousOffset,
		NewOffset:       newOffset,
		Notes:           notes,
		NextCalibration: time.Now().AddDate(0, 6, 0), // 6 mois
	}

	calibrationJSON, err := json.Marshal(calibration)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"calibrationId":"%s","sensorId":"%s","calibratedBy":"%s"}`,
		calibrationID, sensorID, calibratedBy)
	ctx.GetStub().SetEvent("SensorCalibrated", []byte(eventPayload))

	return ctx.GetStub().PutState(calibrationID, calibrationJSON)
}

// GetCalibrationHistory récupère l'historique de calibration d'un capteur
func (c *SensorDataContract) GetCalibrationHistory(ctx contractapi.TransactionContextInterface,
	sensorID string) ([]*SensorCalibration, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"sensorCalibration","sensorId":"%s"}}`, sensorID)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var calibrations []*SensorCalibration
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var calibration SensorCalibration
		err = json.Unmarshal(queryResult.Value, &calibration)
		if err != nil {
			return nil, err
		}
		calibrations = append(calibrations, &calibration)
	}

	return calibrations, nil
}

// CreateAggregatedData crée des données agrégées
func (c *SensorDataContract) CreateAggregatedData(ctx contractapi.TransactionContextInterface,
	aggID, sensorID, period string, startTime, endTime string,
	sampleCount int, avgValue, minValue, maxValue, sumValue float64) error {

	startT, err := time.Parse(time.RFC3339, startTime)
	if err != nil {
		return fmt.Errorf("format startTime invalide: %v", err)
	}

	endT, err := time.Parse(time.RFC3339, endTime)
	if err != nil {
		return fmt.Errorf("format endTime invalide: %v", err)
	}

	aggregated := AggregatedData{
		DocType:      "aggregatedData",
		ID:           aggID,
		SensorID:     sensorID,
		Period:       period,
		StartTime:    startT,
		EndTime:      endT,
		SampleCount:  sampleCount,
		AverageValue: avgValue,
		MinValue:     minValue,
		MaxValue:     maxValue,
		SumValue:     sumValue,
	}

	aggregatedJSON, err := json.Marshal(aggregated)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	return ctx.GetStub().PutState(aggID, aggregatedJSON)
}

// GetAggregatedDataBySensor récupère les données agrégées d'un capteur
func (c *SensorDataContract) GetAggregatedDataBySensor(ctx contractapi.TransactionContextInterface,
	sensorID, period string) ([]*AggregatedData, error) {

	queryString := fmt.Sprintf(`{"selector":{"docType":"aggregatedData","sensorId":"%s","period":"%s"}}`,
		sensorID, period)

	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, fmt.Errorf("erreur de requête: %v", err)
	}
	defer resultsIterator.Close()

	var data []*AggregatedData
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var agg AggregatedData
		err = json.Unmarshal(queryResult.Value, &agg)
		if err != nil {
			return nil, err
		}
		data = append(data, &agg)
	}

	return data, nil
}

// GetSensorStatistics retourne des statistiques pour un capteur
func (c *SensorDataContract) GetSensorStatistics(ctx contractapi.TransactionContextInterface,
	sensorID string) (map[string]interface{}, error) {

	sensor, err := c.GetSensor(ctx, sensorID)
	if err != nil {
		return nil, err
	}

	// Compter les alertes actives
	alertCount, _ := c.GetAlertCount(ctx, sensorID)

	// Récupérer les calibrations
	calibrations, _ := c.GetCalibrationHistory(ctx, sensorID)

	stats := map[string]interface{}{
		"sensorId":         sensorID,
		"name":             sensor.Name,
		"type":             sensor.Type,
		"status":           sensor.Status,
		"batteryLevel":     sensor.BatteryLevel,
		"signalStrength":   sensor.SignalStrength,
		"lastReading":      sensor.LastReading,
		"lastMaintenance":  sensor.LastMaintenance,
		"activeAlerts":     alertCount,
		"calibrationCount": len(calibrations),
		"organization":     sensor.Organization,
	}

	return stats, nil
}
