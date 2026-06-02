# Multi-stage build producing two static binaries: the API and the worker.
FROM golang:1.24 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/api ./cmd/api && \
    CGO_ENABLED=0 go build -o /out/worker ./cmd/worker

# Minimal runtime image. Compose overrides the entrypoint for the worker, and
# sets ADDR=:8000 so the API listens on the same host port as the other backends.
FROM gcr.io/distroless/static-debian12
COPY --from=build /out/api /api
COPY --from=build /out/worker /worker
ENV ADDR=:8000
EXPOSE 8000
ENTRYPOINT ["/api"]
