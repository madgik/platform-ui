## Quick Init for Agents

Use this as a fast orientation to the codebase.

- **Project**: Angular 18 standalone app (`fl-platform`) for creating/running experiments and reviewing results. Entry: `src/main.ts`, root component `src/app/app.component.ts`.
- **Key routes** (`src/app/app.routes.ts`): default `/experiments-dashboard`; `/experiment-studio`; `/account`; `/terms`. Most routes use `AuthGuard` + `TermsGuard` (NDA gating); `/terms` uses `AuthGuard` only.
- **Auth** (`src/app/services/auth.service.ts`): hits `/services/activeUser` for session; login redirect `/services/oauth2/authorization/keycloak?frontend_redirect=...` (stores redirect in localStorage); logout `/services/logout`. Interceptor (`auth.interceptor.ts`) adds `withCredentials` to same-origin calls.
- **Backend endpoints (via `src/proxy.conf.json`)**: `/services` proxied to `http://localhost:8080`. API usage examples:
  - Experiments: `GET/DELETE/PATCH /services/experiments/:id`, `POST /services/experiments` (run), `POST /services/experiments/transient` (quick previews).
  - Algorithms catalog: `GET /services/algorithms`.
  - Data models: `GET /services/data-models`.
  - Active user: `GET /services/activeUser`.
- **Pages**
  - Experiment Studio (`src/app/pages/experiment-studio/...`): variable/dataset selection, filters (QueryBuilder), algorithm selection/config, run & results rendering (ECharts/D3). Core state/service: `experiment-studio.service.ts`.
  - Experiments Dashboard (`src/app/pages/experiments-dashboard/...`): list/search/pagination/share/delete, detail view with results & PDF export, compare view. Data service: `experiments-dashboard.service.ts`.
  - Account page: simple profile and logout.
  - Terms page (`src/app/pages/terms-page/...`): NDA/TOS acceptance gate; loads `assets/tos.md`, posts `/services/activeUser/agreeNDA`, then redirects.
- **State patterns**: heavy use of Angular Signals. `ExperimentStudioService` maintains selections, algorithm configs, filters, running state, and hydration of existing experiments. `ErrorService` exposes a shared error subject.
- **Visualisation utilities**: algorithm → output schema mappings in `src/app/core/algorithm-mappers.ts`; chart builders under `src/app/pages/experiment-studio/visualisations`.
- **UI components**: reusable header/footer/navbar/spinner/accordion under `src/app/pages/shared`.
- **Build/Test commands** (package scripts): `npm start` (dev server with proxy), `npm run build` (Angular), `npm test` (Karma), `npm run watch` (build --watch).
- **Container**: `Dockerfile` builds Angular, serves via nginx; envsubst uses `PORTAL_BACKEND_SERVER`/`PORTAL_BACKEND_CONTEXT` for proxying `/services`.
- **Styling/Assets**: global styles `src/styles.css` (includes QueryBuilder theming); assets under `src/assets/`.
- **Caveats**: many endpoints require authenticated session (Keycloak) and NDA acceptance (`TermsGuard` checks `user.agreeNDA`). Sharing links are built from `/experiments-dashboard?experiment=<id>`. Filters must include datasets selected; algorithms may be disabled when selections don’t match required types.

## Folder Map
- `/src/app`: main app code.
  - `app.component.*`, `app.routes.ts`, `app.config.ts`: shell and routing.
  - `guards/`: `auth.guard.ts` enforces auth; `terms.guard.ts` enforces NDA acceptance.
  - `services/`: auth/session/error helpers (including `terms.service.ts`), experiment CRUD (`experiments-dashboard.service.ts`), experiment studio orchestration (`experiment-studio.service.ts`), label resolver, PDF export, auth interceptor.
  - `models/`: TS interfaces for experiments, algorithms, data-model hierarchy, filters, user, backend DTOs.
  - `core/`: algorithm mappers (backend → UI schema/output schemas).
  - `pages/experiments-dashboard/`: dashboard feature (list/search, detail, compare, mappers).
  - `pages/experiment-studio/`: studio feature (variables panel, filters modal, algorithm panel, visualisations).
    - `variables-panel/`: data model selector, dataset selector, search, distribution/histogram, filter selection/config modal, stats panel.
    - `algorithm-panel/`: selection/config UI, description modal, result renderer.
    - `visualisations/`: chart builder/registry, auto-renderer, histogram, bubble chart utilities.
  - `pages/account-page/`: account/profile.
  - `pages/shared/`: header/footer/navbar/accordion/spinner utilities and form control factory.
- `/src/assets`: logos and user icons.
- `/public`: extra static assets copied to build (globbed in `angular.json`).
- `/src/styles.css`: global styles, including QueryBuilder theming.
- `/src/proxy.conf.json`: dev proxy for `/services` → backend.
- `/Dockerfile` & `nginx.conf.template`: containerized build/serve.

- Build once you make changes to be sure you did not break something


