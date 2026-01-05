// ============================================================================
// Security Contract - Gestion des incidents de sécurité sur blockchain
// Smart City Traffic Management System - SOC Integration
// ============================================================================

package chaincode

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SecurityIncident représente un incident de sécurité enregistré sur la blockchain
type SecurityIncident struct {
	DocType        string   `json:"docType"`
	ID             string   `json:"id"`
	IncidentType   string   `json:"incidentType"` // ddos, sybil, 51_percent, intrusion, anomaly
	Severity       string   `json:"severity"`     // low, medium, high, critical
	Status         string   `json:"status"`       // detected, investigating, mitigated, resolved
	Description    string   `json:"description"`
	SourceIP       string   `json:"sourceIP"`
	TargetNodes    []string `json:"targetNodes"`
	AffectedAssets []string `json:"affectedAssets"`
	DetectedBy     string   `json:"detectedBy"` // agent name: Sensor, Analyzer, Defender
	DetectedAt     string   `json:"detectedAt"` // ISO timestamp string
	MitigatedAt    string   `json:"mitigatedAt"`
	ResolvedAt     string   `json:"resolvedAt"`
	ResolvedBy     string   `json:"resolvedBy"`
	ThreatScore    float64  `json:"threatScore"` // 0.0 to 1.0
	LLMAnalysis    string   `json:"llmAnalysis"`
	EvidenceHash   string   `json:"evidenceHash"`
	ActionsTaken   []string `json:"actionsTaken"`
	Organization   string   `json:"organization"`
}

// DefenseAction représente une action de défense enregistrée
type DefenseAction struct {
	DocType      string `json:"docType"`
	ID           string `json:"id"`
	IncidentID   string `json:"incidentId"`
	ActionType   string `json:"actionType"` // block_ip, quarantine_node, rate_limit, alert
	Target       string `json:"target"`     // IP address or node ID
	Reason       string `json:"reason"`
	ExecutedBy   string `json:"executedBy"` // agent name
	ExecutedAt   string `json:"executedAt"` // ISO timestamp
	Duration     int    `json:"duration"`   // in seconds, 0 = permanent
	AutoExpires  bool   `json:"autoExpires"`
	ExpiresAt    string `json:"expiresAt"`
	IsActive     bool   `json:"isActive"`
	RevokedAt    string `json:"revokedAt"`
	RevokedBy    string `json:"revokedBy"`
	Organization string `json:"organization"`
}

// ThreatIntelligence données de renseignement sur les menaces
type ThreatIntelligence struct {
	DocType       string  `json:"docType"`
	ID            string  `json:"id"`
	ThreatType    string  `json:"threatType"`
	Indicator     string  `json:"indicator"`     // IP, hash, pattern
	IndicatorType string  `json:"indicatorType"` // ip, domain, hash, pattern
	Confidence    float64 `json:"confidence"`    // 0.0 to 1.0
	Source        string  `json:"source"`        // internal, external, llm
	FirstSeen     string  `json:"firstSeen"`     // ISO timestamp
	LastSeen      string  `json:"lastSeen"`      // ISO timestamp
	Occurrences   int     `json:"occurrences"`
	IsActive      bool    `json:"isActive"`
	Notes         string  `json:"notes"`
	Organization  string  `json:"organization"`
}

// RecordSecurityIncident enregistre un nouvel incident de sécurité
func (c *SensorDataContract) RecordSecurityIncident(ctx contractapi.TransactionContextInterface,
	incidentID, incidentType, severity, description, sourceIP, detectedBy string,
	threatScore float64, llmAnalysis string) error {

	// Vérifier si l'incident existe déjà
	existingJSON, err := ctx.GetStub().GetState(incidentID)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if existingJSON != nil {
		return fmt.Errorf("l'incident %s existe déjà", incidentID)
	}

	// Obtenir l'identité du client
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "SYSTEM"
	}

	incident := SecurityIncident{
		DocType:        "securityIncident",
		ID:             incidentID,
		IncidentType:   incidentType,
		Severity:       severity,
		Status:         "detected",
		Description:    description,
		SourceIP:       sourceIP,
		TargetNodes:    []string{},
		AffectedAssets: []string{},
		DetectedBy:     detectedBy,
		DetectedAt:     time.Now().UTC().Format(time.RFC3339),
		MitigatedAt:    "",
		ResolvedAt:     "",
		ResolvedBy:     "",
		ThreatScore:    threatScore,
		LLMAnalysis:    llmAnalysis,
		EvidenceHash:   "",
		ActionsTaken:   []string{},
		Organization:   clientID,
	}

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement blockchain
	eventPayload := fmt.Sprintf(`{"incidentId":"%s","type":"%s","severity":"%s","threatScore":%.2f}`,
		incidentID, incidentType, severity, threatScore)
	ctx.GetStub().SetEvent("SecurityIncidentRecorded", []byte(eventPayload))

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// GetSecurityIncident récupère un incident par son ID
func (c *SensorDataContract) GetSecurityIncident(ctx contractapi.TransactionContextInterface,
	incidentID string) (*SecurityIncident, error) {

	incidentJSON, err := ctx.GetStub().GetState(incidentID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if incidentJSON == nil {
		return nil, fmt.Errorf("l'incident %s n'existe pas", incidentID)
	}

	var incident SecurityIncident
	err = json.Unmarshal(incidentJSON, &incident)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &incident, nil
}

// UpdateIncidentStatus met à jour le statut d'un incident
func (c *SensorDataContract) UpdateIncidentStatus(ctx contractapi.TransactionContextInterface,
	incidentID, newStatus string) error {

	incident, err := c.GetSecurityIncident(ctx, incidentID)
	if err != nil {
		return err
	}

	now := time.Now().UTC().Format(time.RFC3339)
	incident.Status = newStatus

	switch newStatus {
	case "mitigated":
		incident.MitigatedAt = now
	case "resolved":
		incident.ResolvedAt = now
		resolvedBy, err := ctx.GetClientIdentity().GetID()
		if err == nil {
			incident.ResolvedBy = resolvedBy
		}
	}

	incidentJSON, err := json.Marshal(incident)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"incidentId":"%s","newStatus":"%s"}`, incidentID, newStatus)
	ctx.GetStub().SetEvent("SecurityIncidentUpdated", []byte(eventPayload))

	return ctx.GetStub().PutState(incidentID, incidentJSON)
}

// RecordDefenseAction enregistre une action de défense
func (c *SensorDataContract) RecordDefenseAction(ctx contractapi.TransactionContextInterface,
	actionID, incidentID, actionType, target, reason, executedBy string,
	duration int, autoExpires bool) error {

	// Vérifier si l'action existe déjà
	existingJSON, err := ctx.GetStub().GetState(actionID)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if existingJSON != nil {
		return fmt.Errorf("l'action %s existe déjà", actionID)
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "SYSTEM"
	}

	action := DefenseAction{
		DocType:      "defenseAction",
		ID:           actionID,
		IncidentID:   incidentID,
		ActionType:   actionType,
		Target:       target,
		Reason:       reason,
		ExecutedBy:   executedBy,
		ExecutedAt:   time.Now().UTC().Format(time.RFC3339),
		Duration:     duration,
		AutoExpires:  autoExpires,
		ExpiresAt:    "",
		IsActive:     true,
		RevokedAt:    "",
		RevokedBy:    "",
		Organization: clientID,
	}

	if autoExpires && duration > 0 {
		action.ExpiresAt = time.Now().Add(time.Duration(duration) * time.Second).UTC().Format(time.RFC3339)
	}

	// Mettre à jour l'incident associé avec cette action
	if incidentID != "" {
		incident, err := c.GetSecurityIncident(ctx, incidentID)
		if err == nil {
			incident.ActionsTaken = append(incident.ActionsTaken, actionID)
			incidentJSON, _ := json.Marshal(incident)
			ctx.GetStub().PutState(incidentID, incidentJSON)
		}
	}

	actionJSON, err := json.Marshal(action)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"actionId":"%s","actionType":"%s","target":"%s","incidentId":"%s"}`,
		actionID, actionType, target, incidentID)
	ctx.GetStub().SetEvent("DefenseActionRecorded", []byte(eventPayload))

	return ctx.GetStub().PutState(actionID, actionJSON)
}

// GetDefenseAction récupère une action de défense
func (c *SensorDataContract) GetDefenseAction(ctx contractapi.TransactionContextInterface,
	actionID string) (*DefenseAction, error) {

	actionJSON, err := ctx.GetStub().GetState(actionID)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if actionJSON == nil {
		return nil, fmt.Errorf("l'action %s n'existe pas", actionID)
	}

	var action DefenseAction
	err = json.Unmarshal(actionJSON, &action)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &action, nil
}

// RevokeDefenseAction révoque une action de défense
func (c *SensorDataContract) RevokeDefenseAction(ctx contractapi.TransactionContextInterface,
	actionID string) error {

	action, err := c.GetDefenseAction(ctx, actionID)
	if err != nil {
		return err
	}

	if !action.IsActive {
		return fmt.Errorf("l'action %s est déjà révoquée", actionID)
	}

	revokedBy, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		revokedBy = "UNKNOWN"
	}

	action.IsActive = false
	action.RevokedAt = time.Now().UTC().Format(time.RFC3339)
	action.RevokedBy = revokedBy

	actionJSON, err := json.Marshal(action)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"actionId":"%s","revokedBy":"%s"}`, actionID, revokedBy)
	ctx.GetStub().SetEvent("DefenseActionRevoked", []byte(eventPayload))

	return ctx.GetStub().PutState(actionID, actionJSON)
}

// RecordThreatIntelligence enregistre un indicateur de menace
func (c *SensorDataContract) RecordThreatIntelligence(ctx contractapi.TransactionContextInterface,
	id, threatType, indicator, indicatorType, source string,
	confidence float64, notes string) error {

	// Vérifier si l'indicateur existe déjà
	existingJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("erreur de lecture du ledger: %v", err)
	}

	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		clientID = "SYSTEM"
	}

	now := time.Now().UTC().Format(time.RFC3339)

	if existingJSON != nil {
		// Mettre à jour l'existant
		var existing ThreatIntelligence
		json.Unmarshal(existingJSON, &existing)
		existing.LastSeen = now
		existing.Occurrences++
		if confidence > existing.Confidence {
			existing.Confidence = confidence
		}
		existingJSON, _ = json.Marshal(existing)
		return ctx.GetStub().PutState(id, existingJSON)
	}

	threat := ThreatIntelligence{
		DocType:       "threatIntelligence",
		ID:            id,
		ThreatType:    threatType,
		Indicator:     indicator,
		IndicatorType: indicatorType,
		Confidence:    confidence,
		Source:        source,
		FirstSeen:     now,
		LastSeen:      now,
		Occurrences:   1,
		IsActive:      true,
		Notes:         notes,
		Organization:  clientID,
	}

	threatJSON, err := json.Marshal(threat)
	if err != nil {
		return fmt.Errorf("erreur de sérialisation: %v", err)
	}

	// Émettre un événement
	eventPayload := fmt.Sprintf(`{"id":"%s","threatType":"%s","indicator":"%s","confidence":%.2f}`,
		id, threatType, indicator, confidence)
	ctx.GetStub().SetEvent("ThreatIntelligenceRecorded", []byte(eventPayload))

	return ctx.GetStub().PutState(id, threatJSON)
}

// GetThreatIntelligence récupère un indicateur de menace
func (c *SensorDataContract) GetThreatIntelligence(ctx contractapi.TransactionContextInterface,
	id string) (*ThreatIntelligence, error) {

	threatJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("erreur de lecture du ledger: %v", err)
	}
	if threatJSON == nil {
		return nil, fmt.Errorf("l'indicateur %s n'existe pas", id)
	}

	var threat ThreatIntelligence
	err = json.Unmarshal(threatJSON, &threat)
	if err != nil {
		return nil, fmt.Errorf("erreur de désérialisation: %v", err)
	}

	return &threat, nil
}

// GetIncidentHistory récupère l'historique d'un incident
func (c *SensorDataContract) GetIncidentHistory(ctx contractapi.TransactionContextInterface,
	incidentID string) ([]map[string]interface{}, error) {

	historyIterator, err := ctx.GetStub().GetHistoryForKey(incidentID)
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
			var incident SecurityIncident
			json.Unmarshal(modification.Value, &incident)
			record["value"] = incident
		}

		history = append(history, record)
	}

	return history, nil
}
