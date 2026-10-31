SHELL := /bin/bash
COMPOSE := docker compose
# Les conteneurs tournent avec l'utilisateur de la machine : aucun fichier root dans le dépôt.
export DEV_UID := $(shell id -u)
export DEV_GID := $(shell id -g)
# Outils (tests, lint, types, format, build) dans le conteneur de l'API, sans démarrer la base.
TOOL := $(COMPOSE) run --rm --no-deps api
# Points de montage des volumes de dépendances : créés par l'utilisateur, sinon Docker les crée en root.
MOUNTS := node_modules apps/api/node_modules apps/web/node_modules

.PHONY: help install up down dev logs db-migrate db-seed db-reset test test-db lint typecheck build format check pnpm sh clean mounts
.DEFAULT_GOAL := help

help: ## Liste les commandes
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'

mounts:
	@mkdir -p $(MOUNTS)

install: mounts ## Construit les images, installe les dépendances (volumes Docker) et crée .env s'il manque
	@test -f .env || (cp .env.example .env && echo "Créé .env depuis .env.example")
	$(COMPOSE) build
	$(COMPOSE) run --rm install

up: mounts ## Démarre Postgres, l'API et l'interface en arrière-plan, attend qu'ils soient prêts
	$(COMPOSE) up -d --wait

down: ## Arrête tous les conteneurs (les données restent)
	$(COMPOSE) --profile '*' down --remove-orphans

dev: up ## Comme up, puis suit les journaux de l'API (http://localhost:4030) et de l'interface (http://localhost:3030)
	@echo "Interface : http://localhost:$${WEB_PORT:-3030} · API : http://localhost:$${API_PORT:-4030} · Ctrl+C arrête l'affichage, make down la pile"
	$(COMPOSE) logs -f --tail=20 api web

logs: ## Suit les journaux de tous les conteneurs
	$(COMPOSE) logs -f --tail=50

db-migrate: mounts ## Applique les migrations SQL de apps/api/migrations qui ne l'ont pas encore été
	$(COMPOSE) run --rm migrate

db-seed: mounts ## Remplace les données par le jeu d'exemple (salles, membres, trois mois d'historique, deux semaines à venir)
	$(COMPOSE) run --rm seed

db-reset: mounts ## Vide la base, applique toutes les migrations et charge le jeu d'exemple
	$(COMPOSE) up -d --wait db
	$(COMPOSE) exec -T db psql -q -U reservations -d reservations -c 'set client_min_messages = warning; drop schema public cascade; create schema public;'
	$(COMPOSE) run --rm migrate
	$(COMPOSE) run --rm seed

test: mounts ## Tests unitaires (Vitest), sans base de données
	$(TOOL) pnpm test

test-db: mounts ## Tests d'intégration de l'API (*.int.test.ts) contre une base Postgres jetable
	@status=0; $(COMPOSE) run --rm api-test || status=$$?; \
	  $(COMPOSE) --profile test rm -sf db-test >/dev/null 2>&1; exit $$status

lint: mounts ## Analyse le code (ESLint), sans avertissement toléré
	$(TOOL) pnpm lint

typecheck: mounts ## Vérifie les types
	$(TOOL) pnpm typecheck

build: mounts ## Construit l'API et l'interface
	$(TOOL) pnpm build

format: mounts ## Met en forme le code (Prettier)
	$(TOOL) pnpm format

check: mounts ## Avant de rendre la main : format, lint, types, tests unitaires et build
	$(TOOL) sh -c 'pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build'

pnpm: mounts ## Lance pnpm dans le conteneur : make pnpm args="add -D zod --filter @reservations/api"
	$(TOOL) pnpm $(args)

sh: mounts ## Ouvre un shell dans le conteneur de l'API
	$(TOOL) sh

clean: ## Supprime les conteneurs, les volumes (base, dépendances) et les sorties de build
	$(COMPOSE) --profile '*' down -v --remove-orphans
	rm -rf apps/*/dist apps/*/.next .turbo apps/*/.turbo
