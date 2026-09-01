# syntax=docker/dockerfile:1.7
FROM node:22.14-alpine AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/core/package.json packages/core/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --include=dev

FROM dependencies AS build
COPY . .
RUN npm run build

FROM build AS tooling
ENTRYPOINT []

FROM node:22.14-alpine AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apk add --no-cache tini && mkdir -p /app/.next/cache && chown -R node:node /app
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini","--"]
CMD ["sh","-c","if [ -f apps/web/server.js ]; then exec node apps/web/server.js; else exec node server.js; fi"]

FROM node:22.14-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini && chown -R node:node /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=node:node /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build --chown=node:node /app/packages/core/package.json ./packages/core/package.json
COPY --from=build --chown=node:node /app/packages/core/dist ./packages/core/dist
USER node
EXPOSE 8081
ENTRYPOINT ["/sbin/tini","--"]
CMD ["node","apps/worker/dist/index.js"]
