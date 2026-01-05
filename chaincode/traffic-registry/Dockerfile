FROM golang:1.21 AS builder
WORKDIR /chaincode
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o traffic-registry

FROM alpine:3.18
WORKDIR /chaincode
COPY --from=builder /chaincode/traffic-registry .
EXPOSE 9999
ENTRYPOINT ["/chaincode/traffic-registry"]
