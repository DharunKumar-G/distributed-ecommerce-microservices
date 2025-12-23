FROM rust:alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk update && apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig cmake make g++ || \
    (sleep 5 && apk update && apk add --no-cache musl-dev openssl-dev openssl-libs-static pkgconfig cmake make g++)

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM alpine:latest

RUN apk update && apk add --no-cache libgcc openssl ca-certificates || \
    (sleep 5 && apk update && apk add --no-cache libgcc openssl ca-certificates) || \
    apk add --no-cache libgcc openssl || \
    echo "Skipping optional packages"

WORKDIR /root/

COPY --from=builder /app/target/release/payment-service .

EXPOSE 8084

CMD ["./payment-service"]
