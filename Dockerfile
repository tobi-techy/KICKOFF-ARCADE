FROM rust:1.86-slim AS rust-builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make

RUN cargo install --locked linera-service@0.15.5 linera-storage-service@0.15.5

FROM node:22-slim

RUN apt-get update && apt-get install -y \
    pkg-config \
    protobuf-compiler \
    clang \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy linera tools from rust builder
COPY --from=rust-builder /usr/local/cargo/bin/linera* /usr/local/bin/

# Copy Rust toolchain for contract builds
COPY --from=rust-builder /usr/local/rustup /usr/local/rustup
COPY --from=rust-builder /usr/local/cargo /usr/local/cargo

ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH=/usr/local/cargo/bin:$PATH

# Add wasm target
RUN rustup target add wasm32-unknown-unknown

WORKDIR /build

HEALTHCHECK --interval=5s --timeout=3s CMD curl -sf http://localhost:5173 || exit 1

ENTRYPOINT ["bash", "/build/run.bash"]
