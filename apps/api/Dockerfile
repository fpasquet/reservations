# syntax=docker/dockerfile:1
# API NestJS. Contexte de build : la racine du dépôt (espace de travail pnpm).
# Étapes : deps → dev (docker-compose.yml : sources montées, rechargement à chaud) | build → run (image de production).
ARG NODE_IMAGE=node:24.15-alpine

FROM ${NODE_IMAGE} AS deps
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH HOME=/tmp
WORKDIR /repo
COPY package.json ./
# pnpm à la version de package.json#packageManager, installé pour tous les utilisateurs : les conteneurs de
# développement tournent avec l'uid de la machine, qui n'a pas de compte dans l'image.
RUN npm install -g "pnpm@$(node -p "require('./package.json').packageManager.split('@')[1]")" && pnpm --version

FROM deps AS dev
# Les dépendances viennent du service install, dans des volumes nommés : chaque point de montage existe et reste
# inscriptible par n'importe quel uid (un volume neuf reprend ces droits).
# Le store de pnpm vit dans le volume des node_modules : même système de fichiers, donc des liens durs, et rien dans le
# dépôt (pnpm crée sinon un .pnpm-store à la racine du projet).
ENV npm_config_store_dir=/repo/node_modules/.pnpm-store
RUN mkdir -p node_modules apps/api/node_modules apps/web/node_modules && chmod -R a+rwX /repo
EXPOSE 4030
CMD ["pnpm", "--filter", "@reservations/api", "dev"]

FROM deps AS build
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --store-dir /pnpm/store \
 && pnpm --filter @reservations/api build \
 && pnpm --filter @reservations/api deploy --legacy --prod /out \
 && cp -r apps/api/dist apps/api/migrations /out/

FROM ${NODE_IMAGE} AS run
ENV NODE_ENV=production PORT=4030 HOME=/tmp
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4030
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -Y off -qO- http://127.0.0.1:4030/api/health >/dev/null || exit 1
# Migrations : node dist/scripts/migrate.js, avec DATABASE_URL.
CMD ["node", "dist/main.js"]
