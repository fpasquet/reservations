# syntax=docker/dockerfile:1
# Interface Next.js. Contexte de build : la racine du dépôt (espace de travail pnpm).
# Étapes : deps → dev (docker-compose.yml : sources montées, rechargement à chaud) | build → run (image de production).
ARG NODE_IMAGE=node:24.15-alpine

FROM ${NODE_IMAGE} AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH HOME=/tmp NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo
COPY package.json ./
# pnpm à la version de package.json#packageManager, utilisable par n'importe quel uid (voir apps/api/Dockerfile).
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")" && pnpm --version

FROM deps AS dev
# Dépendances dans les volumes nommés du service install (voir apps/api/Dockerfile).
# Le store de pnpm vit dans le volume des node_modules : même système de fichiers, donc des liens durs, et rien dans le
# dépôt (pnpm crée sinon un .pnpm-store à la racine du projet).
ENV npm_config_store_dir=/repo/node_modules/.pnpm-store
RUN mkdir -p node_modules apps/api/node_modules apps/web/node_modules && chmod -R a+rwX /repo
EXPOSE 3030
CMD ["pnpm", "--filter", "@reservations/web", "dev"]

FROM deps AS build
# Adresse de l'API vue du navigateur : fixée au build (next.config.ts).
ARG API_URL=http://localhost:4030
ENV API_URL=${API_URL}
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store \
 && pnpm --filter @reservations/web build

FROM ${NODE_IMAGE} AS run
ENV NODE_ENV=production PORT=3030 HOSTNAME=0.0.0.0 HOME=/tmp NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# La sortie standalone garde la disposition du monorepo : apps/web/server.js.
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3030
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -Y off -qO- http://127.0.0.1:3030/ >/dev/null || exit 1
CMD ["node", "apps/web/server.js"]
