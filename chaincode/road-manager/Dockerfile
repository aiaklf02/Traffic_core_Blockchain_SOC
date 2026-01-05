FROM golang:1.21 AS builder
WORKDIR /chaincode
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -mod=vendor -o road-manager

FROM alpine:3.18
WORKDIR /chaincode
COPY --from=builder /chaincode/road-manager .
EXPOSE 9999
ENTRYPOINT ["/chaincode/road-manager"]
