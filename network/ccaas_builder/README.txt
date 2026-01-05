This directory is for the Fabric external builder (ccaas) scripts.
See https://github.com/hyperledger/fabric-samples/tree/main/chaincode_external_builder for official scripts.

You must copy the following files here:
- detect
- build
- release
- run

All must be executable (chmod +x).

Mount this directory into each peer at /opt/hyperledger/ccaas_builder in docker-compose.yaml.
