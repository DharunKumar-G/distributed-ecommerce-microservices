FROM golang:1.23-alpine AS builder

WORKDIR /app

# Set Go proxy for better reliability
ENV GOPROXY=https://goproxy.io,https://goproxy.cn,direct
ENV GOSUMDB=off

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags="-w -s" -o main ./cmd/main.go

# Final stage - use scratch for minimal image
FROM scratch

WORKDIR /root/

COPY --from=builder /app/main .

EXPOSE 8082

ENTRYPOINT ["./main"]
