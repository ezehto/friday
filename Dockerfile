FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS base

# Pre-create the mount point so the empty named volume inherits node ownership on first mount.
FROM base AS dev
RUN mkdir -p /app/frontend/node_modules && chown -R node:node /app
USER node
WORKDIR /app/frontend

FROM base AS spa-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY schema /app/schema
COPY frontend ./
RUN npm run build

# Native config loading avoids a write to node_modules/.vite-temp, which a read-only root refuses.
FROM base AS preview
COPY --from=spa-build --chown=node:node /app/frontend /app/frontend
USER node
WORKDIR /app/frontend
EXPOSE 8742
CMD ["./node_modules/.bin/vite", "preview", "--configLoader", "native"]
