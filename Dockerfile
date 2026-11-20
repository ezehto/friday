FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS base

# Pre-create the mount point so the empty named volume inherits node ownership on first mount.
FROM base AS dev
RUN mkdir -p /app/frontend/node_modules && chown -R node:node /app
USER node
WORKDIR /app/frontend
