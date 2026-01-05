// ============================================================================
// Sensor Data Chaincode - Point d'entrée
// Smart City Traffic Management System
// ============================================================================

package main

import (
	"log"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/traffic-core/chaincode/sensor-data/chaincode"
)

func main() {
	sensorContract := new(chaincode.SensorDataContract)

	cc, err := contractapi.NewChaincode(sensorContract)
	if err != nil {
		log.Panicf("Erreur lors de la création du chaincode Sensor Data: %v", err)
	}

	// CCaaS mode - check for CHAINCODE_SERVER_ADDRESS
	ccServerAddress := os.Getenv("CHAINCODE_SERVER_ADDRESS")
	ccID := os.Getenv("CHAINCODE_ID")

	if ccServerAddress != "" && ccID != "" {
		// Start as CCaaS server
		server := &shim.ChaincodeServer{
			CCID:    ccID,
			Address: ccServerAddress,
			CC:      cc,
			TLSProps: shim.TLSProperties{
				Disabled: true,
			},
		}
		log.Printf("Starting Sensor Data chaincode as CCaaS server on %s with ID %s", ccServerAddress, ccID)
		if err := server.Start(); err != nil {
			log.Panicf("Erreur lors du démarrage du serveur CCaaS: %v", err)
		}
	} else {
		// Start in traditional mode
		if err := cc.Start(); err != nil {
			log.Panicf("Erreur lors du démarrage du chaincode Sensor Data: %v", err)
		}
	}
}
