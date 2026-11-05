# Réservations

L'outil de réservation des salles de **La Verrière**, espace de coworking : les membres consultent le planning du jour,
trouvent une salle selon sa capacité et ses équipements, réservent un créneau et gèrent leurs réservations.

- **Planning** : une journée, une ligne par salle, de 8h00 à 20h00 ; un clic sur un créneau libre ouvre la
  réservation, déjà remplie.
- **Salles** : les neuf salles de l'espace, filtrables par capacité et par équipement, et le planning du jour de
  chacune.
- **Mes réservations** : les réservations à venir et passées du membre connecté, et l'annulation.

Règles de réservation : de 8h00 à 20h00 (heure de Paris), au quart d'heure, 4 heures au plus, pas de chevauchement dans
une même salle (une réservation peut commencer à l'heure où la précédente finit), pas plus de participants que de
places, pas de créneau passé. Une réservation s'annule par la personne qui l'a faite, avant son début.

Les règles de la maison (horaires, formules, tarifs, réservations) sont écrites dans le
[règlement intérieur](docs/reglement.md).

Il n'y a pas encore d'authentification : on choisit son nom dans l'en-tête (« Connecté en tant que »), et ce choix est
gardé dans le navigateur.

## Prérequis

Docker avec Compose, et make. Rien d'autre à installer : Node, pnpm et Postgres tournent dans les conteneurs de
`docker-compose.yml`, avec l'utilisateur de la machine, et les dépendances restent dans des volumes Docker.

## Démarrer

```bash
make install     # images, dépendances, et .env depuis .env.example
make db-migrate  # démarre Postgres et crée les tables
make db-seed     # salles, membres, trois mois d'historique et les réservations de cette semaine et de la suivante
make dev         # Postgres, API et interface, rechargés à chaud ; make up les démarre en arrière-plan
```

| Service   | Adresse               |
| --------- | --------------------- |
| Interface | http://localhost:3030 |
| API       | http://localhost:4030 |
| Postgres  | localhost:5435        |

Les ports se changent dans `.env` (`WEB_PORT`, `API_PORT`, `POSTGRES_PORT`).

## Structure

```
docs/reglement.md         règlement intérieur de La Verrière
docker-compose.yml        environnement de développement : db, api, web, install, migrate, seed, db-test, api-test
apps/
  api/                    API NestJS (Dockerfile : étapes dev et run)
    migrations/           migrations SQL, appliquées dans l'ordre par make db-migrate
    src/
      rooms/              salles : GET /api/rooms?capacity=&equipment=, GET /api/rooms/:id
      members/            membres : GET /api/members
      bookings/           réservations : règles, GET /api/bookings?date= ou ?memberId=, POST, DELETE /:id
      shared/             heure de Paris, erreurs de l'API, horloge
      scripts/            migrate.ts, seed.ts
      testing/            dépôts en mémoire, application de test, préparation de la base de test
  web/                    interface Next.js (Dockerfile : étapes dev et run)
    src/
      app/                pages : planning (/), salles (/rooms, /rooms/:id), mes réservations (/my-bookings)
      components/ui/      composants de base (Button, Badge, Card, Dialog, Input, Select, Tabs, Toast…)
      components/         planning, salles, réservations, en-tête
      lib/                appels à l'API, horloge, calcul des créneaux, dates, messages d'erreur
```

L'API répond en JSON ; une erreur a la forme `{ statusCode, code, message, field? }`. Les routes qui modifient une
réservation identifient le membre par l'en-tête `X-Member-Id`.

## Commandes

Toutes les commandes passent par le Makefile, qui lance `docker compose`.

| Commande            | Effet                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `make help`         | liste les commandes                                                                             |
| `make install`      | construit les images, installe les dépendances, crée `.env`                                     |
| `make up`           | démarre Postgres, l'API et l'interface en arrière-plan                                          |
| `make dev`          | comme `make up`, puis suit les journaux de l'API et de l'interface                              |
| `make down`         | arrête les conteneurs (les données restent)                                                     |
| `make logs`         | suit les journaux de tous les conteneurs                                                        |
| `make db-migrate`   | applique les migrations en attente                                                              |
| `make db-seed`      | remplace les données par le jeu d'exemple                                                       |
| `make db-reset`     | vide la base, applique toutes les migrations et charge le jeu d'exemple                         |
| `make test`         | tests unitaires (Vitest), sans base de données                                                  |
| `make test-db`      | tests d'intégration de l'API (`*.int.test.ts`) contre une base Postgres jetable                 |
| `make lint`         | analyse le code (ESLint), sans avertissement toléré                                             |
| `make typecheck`    | vérifie les types                                                                               |
| `make build`        | construit l'API et l'interface                                                                  |
| `make format`       | met en forme le code (Prettier)                                                                 |
| `make check`        | format, lint, types, tests unitaires et build : à lancer avant de rendre la main                |
| `make pnpm args=""` | lance pnpm dans le conteneur, par exemple `make pnpm args="add zod --filter @reservations/api"` |
| `make sh`           | ouvre un shell dans le conteneur                                                                |
| `make clean`        | supprime les conteneurs, les volumes (base, dépendances) et les sorties de build                |

## Tests

- `make test` : règles métier et routes de l'API sur des dépôts en mémoire (`apps/api/src/testing/`), fonctions de
  l'interface. Aucune base de données.
- `make test-db` : les dépôts Postgres (`*.int.test.ts`, `apps/api/vitest.int.config.ts`) contre `reservations_test`,
  une base jetable (service `db-test`, en mémoire) : elle repart d'un schéma vide, reçoit toutes les migrations, puis
  disparaît après les tests.

## Horloge réglable

`FAKE_NOW`, dans `.env`, règle l'heure de l'API, du seed et de l'interface : une date ISO 8601 avec fuseau, par exemple
`FAKE_NOW=2026-11-05T19:30:00+01:00`. L'horloge part de cet instant au démarrage des conteneurs, puis avance
normalement : une réservation « en cours » finit par se terminer. Après un changement : `make down`, `make db-seed`,
`make up`. Vide, l'heure réelle.
