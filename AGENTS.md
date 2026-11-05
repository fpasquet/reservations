# AGENTS.md

Instructions pour les personnes et les agents qui contribuent à ce dépôt.

- Répondre en français ; code, identifiants et messages de commit en anglais ; commentaires en français, rares, qui
  disent pourquoi.
- Monorepo pnpm + Turborepo :
  - `apps/api` : NestJS, ESM, imports relatifs en `.js`, Postgres via `pg` (requêtes SQL écrites à la main). Les
    dépendances s'injectent avec un `@Inject(...)` explicite (les tests ne lisent pas les métadonnées de types).
  - `apps/web` : Next.js (App Router), React, Tailwind CSS v4. L'interface appelle l'API depuis le navigateur.
- Le schéma de la base évolue par migrations SQL numérotées dans `apps/api/migrations/` (`0002_….sql`, …), appliquées
  par `make db-migrate` ; une migration déjà commitée ne se modifie plus. `make db-seed` recharge le jeu d'exemple.
- Heures et journées s'entendent en heure de Paris (`Europe/Paris`), dans l'API comme dans l'interface ; l'API échange
  des dates ISO 8601 avec fuseau.
- Erreurs de l'API : `{ statusCode, code, message, field? }`, avec un `code` stable en anglais
  (`apps/api/src/shared/domain-error.ts`) ; l'interface le traduit (`apps/web/src/lib/error-messages.ts`) et n'affiche
  jamais `message`.
- Interface : textes en français ; composants de base dans `apps/web/src/components/ui` (bouton, champ, liste
  déroulante, fenêtre modale, onglets, notifications…), couleurs, rayons et espacements uniquement par les jetons du
  thème (`apps/web/src/app/globals.css`). Chaque écran a ses états de chargement, d'erreur et de liste vide, et reste
  utilisable au clavier.
- Tout tourne dans Docker Compose (`docker-compose.yml`) ; seuls Docker et make sont installés sur la machine. Les
  commandes passent par le Makefile (`make help`) : `make install`, `make up`, `make db-migrate`, `make db-seed`,
  `make dev`, `make test`, `make test-db`, `make lint`, `make typecheck`, `make build`, `make check` ; une dépendance
  s'ajoute par `make pnpm args="add …"`.
- Toute règle métier est testée (Vitest, à côté du code : `*.test.ts`) ; les routes de l'API se testent avec supertest
  sur les dépôts en mémoire (`apps/api/src/testing/`). Les requêtes SQL et les migrations se testent contre Postgres
  (`*.int.test.ts`, `make test-db`).
- L'heure courante vient de l'horloge (`CLOCK` dans l'API, `currentTime()` dans l'interface), jamais de `new Date()` :
  `FAKE_NOW` la règle pour les démos et les tests.
- Avant de rendre la main : `make check` (format, lint, types, tests, build), et `make test-db` si le SQL ou une
  migration a changé.
- Commits en [Conventional Commits](https://www.conventionalcommits.org/) (`feat(bookings): …`, `fix(web): …`), une PR
  par ticket, qui cite son numéro (`Closes #3`).
