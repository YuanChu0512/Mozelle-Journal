# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS web-build
WORKDIR /app
ENV npm_config_audit=false \
    npm_config_fund=false
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY . .
# The VPS build does not use Sites D1/R2 bindings, but the shared Vite config
# imports the Sites manifest at build time. Supply a non-secret empty manifest
# only when the package does not include one.
RUN mkdir -p .openai \
    && if [ ! -f .openai/hosting.json ]; then printf '{}\n' > .openai/hosting.json; fi \
    && chmod +x scripts/*.sh \
    && NODE_ENV=production npm run build

FROM node:22-bookworm-slim AS web
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=web-build --chown=node:node /app/dist/standalone ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

FROM node:22-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production \
    API_PORT=8788 \
    npm_config_audit=false \
    npm_config_fund=false
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /data/uploads && chown -R node:node /data
COPY --chown=node:node server ./server
USER node
EXPOSE 8788
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8788/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.mjs"]
