# Build PROCREARE — one-shot, deploy-ready on Vercel

You are building the first working version of **PROCREARE**, a livestock and farm management platform for cattle ranches (primary market: Paraguay). Build the entire thing in this single repository so that it **works immediately when the GitHub repo is imported into Vercel and a Neon Postgres database is connected** — no manual database setup, no manual SQL, no manual env vars beyond what the Vercel–Neon integration creates automatically.

Read this whole prompt before writing code. When done, run every verification step in the "Acceptance checklist" and fix anything that fails.

---

## 0. Hard requirements (do not violate)

1. **Zero manual setup on deploy.**
   - The build must create and update all tables automatically (`prisma migrate deploy`).
   - The app must not need any env var other than the database URLs the Vercel–Neon integration injects.
   - No seed passwords or secrets committed to the repo.
2. **The build must succeed even if no database is connected yet.** In that case, skip migrations with a clear log message. The app then shows a friendly Spanish page: "Conecta una base de datos para empezar" with 3 short steps (Vercel → Storage → Neon → Connect → Redeploy).
3. **Commit the migration SQL files.** No database is available while you write code. Generate the initial migration with:
   `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_init/migration.sql`
   Also create `prisma/migrations/migration_lock.toml`. If you later change the schema, add a new migration the same way (`--from-migrations` / `--to-schema-datamodel`) — never edit an applied migration.
4. **Single Next.js app at the repo root.** No monorepo tooling, so Vercel auto-detects it with no Root Directory configuration.
5. **Every piece of farm data is isolated by organization and farm.** A user must never see or modify another farm's data, including by guessing IDs.
6. **Authorization is checked on the server** for every protected operation, never only in the UI.
7. All UI text is in **Spanish** (Paraguay). Code, comments, variable names, and docs are in English.

---

## 1. Stack

- **Next.js** (latest stable, App Router, TypeScript strict mode), deployed on Vercel.
- **Prisma** + **PostgreSQL (Neon)**.
  - Pin a current stable Prisma version and follow its official Neon + Vercel setup for that version.
  - If that version uses `prisma.config.ts` or driver adapters, configure them correctly.
  - Prisma code runs only in the Node.js runtime (`export const runtime = "nodejs"` where relevant), never in middleware or the edge runtime.
- **Tailwind CSS** for styling. Build your own small component set (see Design). If you use shadcn/ui primitives, restyle them fully to the design rules; do not ship default looks.
- **zod** for all input validation. Schemas are shared between API routes, server actions, and forms.
- **jose** for JWT (works in edge middleware); **bcryptjs** for password hashing (pure JS, serverless-safe).
- **exceljs** to read `.xlsx`; **papaparse** to read `.csv`.
- **recharts** for charts.
- **@asteasolutions/zod-to-openapi** to generate OpenAPI docs from the zod schemas.
- **vitest** for tests.
- **lucide-react** icons, used sparingly.

### Database env var resolution

The Vercel–Neon integration injects variables such as `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`. Names can vary, so create `scripts/resolve-db-env.mjs`, which:

- sets the pooled URL from the first defined of: `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`
- sets the direct/unpooled URL (for migrations) from the first defined of: `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`, and falls back to the pooled URL
- exports both into the environment of child processes that run Prisma CLI commands

Use the same resolution at runtime in `src/server/db.ts`. Use a singleton Prisma client that is safe for serverless and hot reload.

### Auth secret without manual env vars

- If `AUTH_SECRET` is set, use it.
- Otherwise, on first run generate a cryptographically random 64-byte secret, store it in a `SystemSetting` row (key `auth_secret`), and read it from there, cached in memory.
- Middleware needs the secret for JWT verification. It cannot use Prisma, so it must **not** verify signatures. Instead:
  - middleware only checks that the session cookie exists and redirects to `/ingresar` if it is missing
  - full verification happens in a `requireSession()` helper called by every server component, server action, and route handler

---

## 2. Scripts (`package.json`)

```
dev           next dev
build         node scripts/vercel-build.mjs
start         next start
setup         node scripts/local-setup.mjs     # local: docker compose up, migrate, done
db:migrate    node scripts/resolve-db-env.mjs -- prisma migrate deploy
db:generate   prisma generate
db:reset      (local only, refuses to run if NODE_ENV=production or VERCEL=1) reset + migrate
db:demo       loads demo data into a chosen farm (local convenience)
lint          eslint
typecheck     tsc --noEmit
test          vitest run
check         lint + typecheck + test
postinstall   prisma generate
```

`scripts/vercel-build.mjs` must:

1. Resolve DB env vars.
2. Run `prisma generate`.
3. If a database URL exists, run `prisma migrate deploy`, retrying up to 3 times with backoff because Neon may be waking from idle. If there is no URL, log `No database connected — skipping migrations` and continue.
4. Run `next build`.
5. Exit non-zero only on real failures, never just because the DB is missing.

Also add:
- `docker-compose.yml` with Postgres 16 for local development
- `.env.example` documenting every optional variable (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`)
- `.nvmrc` with the current Node LTS, and matching `"engines"` in `package.json`

---

## 3. First run experience (no seeded accounts)

- If the database is connected and has **no users**, every route redirects to `/configuracion-inicial`.
- That page creates, in one transaction:
  - the Owner account (name, email, password)
  - the Organization
  - the first Farm (name, department/location, timezone defaulting to `America/Asuncion`, currency `PYG`, weight unit `kg`)
- After that, `/configuracion-inicial` is permanently disabled (returns 404).
- In **Ajustes → Datos de ejemplo**, the Owner can press "Cargar datos de ejemplo". This loads about 60 realistic animals into the current farm: mixed breeds common in Paraguay (Nelore, Brahman, Brangus, Hereford, Braford), mixed sexes and categories, parentage links, 3–8 weighings each over 12 months with believable weight gain, and 2 example sales. A "Borrar datos de ejemplo" button removes only rows flagged `isDemo = true`.

---

## 4. Data model (Prisma)

Rules for every table:
- UUID primary keys
- `createdAt`, `updatedAt`
- `createdById` / `updatedById` where users act
- `deletedAt` for soft delete on business data
- `farmId` on every farm-scoped table, with indexes on `(farmId, ...)` for common queries

Models:

- **User**: email (unique, lowercase), name, passwordHash, isActive, lastLoginAt
- **Organization**: name
- **Farm**: organizationId, name, location, timezone, currency, weightUnit, locale (`es-PY`), targetDailyGainKg (nullable)
- **Membership**: userId, farmId, role (`OWNER | MANAGER | OPERATOR | VETERINARIAN | READER`); unique on (userId, farmId)
- **Invitation**: farmId, email, role, tokenHash, expiresAt, acceptedAt, invitedById
- **RefreshToken**: userId, tokenHash, expiresAt, revokedAt, replacedById (rotation), userAgent
- **PasswordResetToken**: userId, tokenHash, expiresAt, usedAt
- **LoginAttempt**: email, ip, success, createdAt (for rate limiting)
- **Animal**:
  - farmId, internalId (unique per farm among non-deleted), registrationNumber, eid (unique per farm when present)
  - species (default `BOVINE`), breed, sex (`MALE | FEMALE`)
  - category (`TERNERO, TERNERA, DESMAMANTE, NOVILLO, VAQUILLA, VACA, TORO, BUEY`)
  - status (`ACTIVE, SOLD, DEAD, TRANSFERRED`)
  - origin (`BORN_ON_FARM, PURCHASED, OTHER`), birthDate, entryDate
  - sireId, damId (self-relations; parent must be in the same farm)
  - photoUrl (nullable; uploads are out of scope for now), notes, isDemo
- **Weighing**: farmId, animalId, date, weightKg (Decimal), type (`INITIAL, ROUTINE, WEANING, SALE, REPRODUCTIVE`), notes, importBatchId (nullable), isDemo
- **Sale**: farmId, date, buyerName, buyerDocument (RUC/CI, optional), priceMode (`PER_HEAD | PER_KG`), currency, totalAmount, notes, importBatchId, isDemo
- **SaleItem**: saleId, animalId, weightKg, unitPrice, lineTotal
- **AnimalEvent**: the history timeline. farmId, animalId, type (`CREATED, UPDATED, WEIGHED, SOLD, STATUS_CHANGED, IMPORTED, NOTE`), date, summary (Spanish, human readable), data (JSON validated by a zod schema per type), refs to weighing/sale. Design this as the start of a canonical event catalog that later reproduction and health events will extend: a typed category plus a per-type validated payload.
- **ImportBatch**: farmId, type (`ANIMALS | WEIGHINGS | SALES`), fileName, fileHash (sha256), status (`PREVIEW, COMMITTED, ROLLED_BACK, FAILED`), totalRows, validRows, errorRows, columnMapping (JSON), createdById, committedAt, rolledBackAt
- **ImportRow**: batchId, rowNumber, raw (JSON), normalized (JSON), status (`VALID, ERROR, SKIPPED, COMMITTED`), errors (JSON array of Spanish messages), matchedAnimalId
- **ColumnMappingPreset**: farmId, importType, name, mapping (JSON), headerSignature
- **IdempotencyKey**: key, userId, farmId, route, requestHash, responseStatus, responseBody, createdAt (expire after 24h)
- **AuditLog**: organizationId, farmId, userId, action, entityType, entityId, before (JSON), after (JSON), ip, createdAt
- **SystemSetting**: key, value

---

## 5. Architecture inside the app

```
src/
  app/                    routes (UI pages + /api/v1 route handlers)
  domain/                 pure functions, no Prisma/Next imports (formulas, rules)
  server/
    db.ts                 Prisma client + env resolution
    auth/                 session, tokens, password hashing, requireSession, requireRole
    authz/                permission matrix + can() helper
    services/             business logic per module: farms, users, animals, weighings, sales, imports, dashboard, audit
    repositories/         farm-scoped data access helpers
  contracts/              zod schemas + OpenAPI registration
  components/             UI components
  lib/                    formatting (es-PY dates, PYG, kg), utils
scripts/
tests/
```

- **UI and the REST API both call the same service layer.** Server components and server actions call services directly. `/api/v1/*` route handlers call the same services. No business logic in components or route handlers.
- **Farm scoping.** Every service function takes a `ctx` (`{ userId, farmId, role, organizationId }`) built by `requireSession()` from the active farm. Every Prisma query in repositories filters by `ctx.farmId` and `deletedAt: null`. Loading an entity by ID that belongs to another farm returns "not found" (404), not "forbidden".
- **Active farm** is stored in a cookie and re-validated against Membership on every request.
- **Audit.** Every create/update/delete/import/commit/rollback writes an AuditLog row inside the same transaction.
- **Idempotency.** All POST endpoints in `/api/v1` accept an `Idempotency-Key` header. Same key + same body returns the stored response; same key + different body returns 409.
- **Formulas** live in `src/domain`, fully unit-tested, with JSDoc stating units, valid ranges, and rounding. Mark each with `@status unvalidated` (awaiting review by a livestock specialist). Implement now:
  - `averageDailyGain(weighings)`: kg/day between the first and last weighing, plus between consecutive weighings. Return null if there are fewer than 2 weighings or 0 days. Round to 3 decimals.
  - `ageInMonths(birthDate, at)`
  - `projectedWeight(lastWeighing, adg, date)`
  - `gainVsTarget(adg, target)`

---

## 6. Roles and permissions

Define the matrix once in `src/server/authz/permissions.ts` and enforce it in services. Also use it to show or hide UI actions.

| Action | Owner | Manager | Operator | Veterinarian | Reader |
|---|:-:|:-:|:-:|:-:|:-:|
| View animals, weighings, sales, dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/edit animals | ✓ | ✓ | ✓ | – | – |
| Delete (soft) animals | ✓ | ✓ | – | – | – |
| Record weighings | ✓ | ✓ | ✓ | ✓ | – |
| Record/edit sales | ✓ | ✓ | – | – | – |
| Import animals / weighings | ✓ | ✓ | ✓ | – | – |
| Import sales | ✓ | ✓ | – | – | – |
| Roll back an import | ✓ | ✓ | – | – | – |
| Invite users, change roles | ✓ | ✓ (not to/from Owner) | – | – | – |
| Farm settings, demo data | ✓ | ✓ | – | – | – |
| Create farms, organization settings | ✓ | – | – | – | – |
| View audit log | ✓ | ✓ | – | – | – |

---

## 7. Auth

- Email + password. Passwords must be at least 10 characters, hashed with bcryptjs cost 12.
- **Access token:** JWT, 15 minutes, in an httpOnly, Secure, SameSite=Lax cookie.
- **Refresh token:** random 32 bytes, stored hashed, 30 days, rotated on every use. Reusing a revoked token revokes the whole token family. Kept in an httpOnly cookie.
- Refreshing the access token is transparent to the user.
- **Login rate limit:** 5 failed attempts per email+IP within 15 minutes → Spanish message to wait.
- **Logout** revokes the refresh token.
- **Password recovery:**
  - If `RESEND_API_KEY` is set, send the reset email via Resend.
  - If not, an Owner/Manager can generate a one-time reset link for a user from Ajustes → Usuarios and copy it.
  - Tokens expire after 1 hour and are single use.
- **Invitations** work the same way: email if configured, otherwise a copyable link. The invite page lets a new user set their name and password, or join with an existing account.
- CSRF: server actions are protected by Next.js. For `/api/v1` mutations called with cookies, check `Origin`/`Host`.

---

## 8. Features and screens (all UI text in Spanish)

Navigation:
- Desktop: a quiet left sidebar with the farm switcher at the top.
- Mobile: a bottom tab bar with 4 items (Inicio, Animales, Importar, Ajustes) and a "Más" menu for the rest.

**Ingresar** (`/ingresar`), **Recuperar contraseña**, **Invitación** (`/invitacion/[token]`), **Configuración inicial**.

**Inicio (dashboard)**
- Summary numbers: total active animals, head count by sex, average weight of the latest weighings, herd average daily gain over the last 90 days, animals sold this year.
- Distribution by category (horizontal bars).
- Herd weight evolution (monthly average line chart).
- A short list: "Animales sin pesar hace más de 90 días".
- Proper empty state for a brand-new farm with two clear actions: "Agregar animal" and "Importar desde Excel".

**Animales**
- Table with search (internal ID, registration number, EID, breed).
- Filters: sex, category, status, breed.
- Sortable columns, pagination, count shown.
- On mobile it turns into a list of rows, not a squeezed table.

**Nuevo / editar animal**
- One clean form in grouped sections (Identificación, Datos, Origen, Genealogía, Notas).
- Inline validation messages in Spanish.
- Sire and dam are selected with a searchable picker that only shows the correct sex from the same farm.

**Ficha del animal**
- Header: internal ID large, with breed · sex · category · age, and a status badge.
- Tabs: Resumen, Pesajes, Historial.
  - **Resumen:** latest weight, ADG overall and last period, gain versus the farm target, parents, notes.
  - **Pesajes:** weight chart over time plus a table, and an "Agregar pesaje" sheet.
  - **Historial:** a vertical timeline of AnimalEvents.

**Pesaje por lote** (`/pesajes/lote`)
- Fast entry for the field: pick date and type, then a keyboard-first flow where the user types an animal ID or EID, presses Enter, types the weight, presses Enter, and the next row starts.
- Shows the running list with previous weight and difference.
- Warns if the weight is unusual (more than ±30% change from the last weighing).
- Saves everything in one idempotent request.

**Ventas**
- List of sales, sale detail, and manual sale creation (select animals, price per head or per kg, buyer).
- Creating a sale:
  - creates a SALE weighing for each animal when a weight is given
  - sets the animals' status to SOLD
  - writes AnimalEvents
- Sold animals are excluded from active counts.

**Importar** (the most important flow after the core; make it excellent)

Wizard steps with a clear step indicator:
1. **Tipo:** Animales, Pesajes, or Ventas. Each type has a "Descargar plantilla" button that generates an `.xlsx` template on the fly, with Spanish headers and one example row.
2. **Archivo:** drag-and-drop or choose a file (`.xlsx`, `.csv`), max 4 MB (Vercel body limit), max 5,000 rows. Read the first sheet (or let the user pick a sheet). Compute a sha256 hash; if the same file was already committed to this farm, warn and require explicit confirmation.
3. **Columnas:** auto-map headers using a Spanish/English synonym dictionary (e.g. `caravana, caravana electrónica, eid, rfid → eid`; `peso, peso kg, kg → weightKg`; `fecha, fecha pesaje → date`; `precio, precio unitario, gs → unitPrice`; `comprador, cliente → buyerName`; `raza → breed`; `sexo, m/h, macho/hembra → sex`). The user can adjust mappings with simple dropdowns and optionally save them as a preset for this farm. A preset is suggested automatically when a file has the same header signature.
4. **Vista previa:** summary "X filas válidas · Y con errores" and a table where error rows are highlighted with their Spanish error message(s). Filter to show only errors. Nothing is saved to business tables at this point; only ImportBatch and ImportRow in PREVIEW status.
5. **Confirmar:** commit the valid rows in a single transaction. Offer "Descargar filas con errores" as an `.xlsx` that keeps the original columns plus an "Error" column.

Parsing and validation rules:
- **Dates:** accept Excel serial dates, `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy-mm-dd`. Interpret them in the farm timezone and never shift the day.
- **Numbers:** accept both `1.234,5` and `1,234.5` formats, detected per column. Strip "kg" and "Gs." suffixes.
- **Sex:** accept M/H, Macho/Hembra, Male/Female.
- **Weights:** must be > 0 and ≤ 1,500 kg. Flag changes of more than ±30% from the last weighing as a warning, not an error.
- **Animal matching,** in this order: EID, internalId, registrationNumber, all within the current farm. Unmatched or ambiguous rows are errors, except for ANIMALS imports, where unmatched means "create new" and matched means an error unless "actualizar existentes" is checked.
- **Duplicates:** the same animal + date + weight already exists → skip as duplicate.
- **Sales:** the animal must be ACTIVE. All rows of one sales file with the same date + buyer become one Sale with multiple SaleItems. Compute totals and check them against any total column provided.
- Every created row gets `importBatchId`. Write AnimalEvents of type IMPORTED.

**Historial de importaciones:** list of batches with type, file, user, date, counts, and status.
- Batch detail page.
- **"Deshacer importación"** (Owner/Manager) soft-deletes or reverts everything the batch created or changed, in one transaction. For sales, animals return to ACTIVE if no other sale references them. It is blocked with a clear explanation if later records depend on the imported data.

**Ajustes**
- **Finca:** name, location, timezone, weight target (ADG).
- **Usuarios:** members, roles, invitations, reset links.
- **Fincas:** Owner can create additional farms.
- **Datos de ejemplo.**
- **Registro de auditoría:** filterable list.

**API docs:** `/api/v1/openapi.json` generated from the zod schemas, plus a simple readable page at `/api/docs`.

REST endpoints under `/api/v1`:
- auth (login, refresh, logout)
- farms
- memberships/invitations
- animals (CRUD + history)
- weighings (single + batch)
- sales
- imports (upload → preview, update mapping, commit, rollback, error file download, template download)
- dashboard

Standard error format: `{ error: { code, message, details } }` with Spanish `message`.

---

## 9. Design — Apple-like, minimal, intuitive, not generic

The goal is something that feels like a well-made native Apple app: calm, precise, obvious. A rancher should understand every screen without instructions.

Do:
- System font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", Roboto, sans-serif`. Clear type hierarchy through size and weight, not color. Large, confident page titles (like iOS large titles).
- Neutral palette: near-white background (`#F5F5F7`-style) with white surfaces, near-black text, gray secondary text. **One** accent color: a deep natural green (e.g. `#1F7A4D`), used only for primary actions, links, and selection. Red only for destructive actions and errors. Amber for warnings.
- Full dark mode following the system setting, built from the same tokens (CSS variables).
- Grouped, inset lists and forms, like iOS Settings: rounded 12px containers, hairline separators, generous padding, 8px spacing grid.
- Subtle depth: hairline borders and very soft shadows only where something floats (sheets, menus).
- Sheets/dialogs for quick actions (add a weighing) instead of navigating away.
- Motion: short and functional (150–200 ms ease-out), and respect `prefers-reduced-motion`.
- Numbers use tabular figures and es-PY formatting: `1.234,5 kg`, `Gs. 12.500.000`, dates `23/09/2026`.
- Every screen designs its empty, loading (skeletons matching the layout), and error states. Empty states say what to do next in one sentence with one clear button.
- Fully usable at 375px width. Touch targets at least 44px. Visible keyboard focus. Proper labels and ARIA; WCAG AA contrast.
- Copy is short, plain Spanish, sentence case, speaking to "vos"/"usted" consistently (use **usted**). Buttons say exactly what they do ("Guardar pesaje", not "Enviar").

Do not:
- No gradients, glow effects, glassmorphism everywhere, or purple/blue "AI" palettes.
- No emoji in the UI, no stock illustrations, no decorative icons next to every label.
- No marketing hero sections or "Welcome to your dashboard!" filler text.
- No cards inside cards. No more than one primary button per view.
- Don't leave shadcn/Tailwind defaults unstyled. Don't use placeholder lorem ipsum anywhere.

---

## 10. Quality

- **Unit tests (vitest), runnable without a database:**
  - all `src/domain` formulas
  - the permission matrix
  - import parsing (dates, number formats, sex values, header auto-mapping, sales grouping, totals)
  - Spanish formatting helpers
- **Integration tests** run only when `TEST_DATABASE_URL` is set, and are skipped otherwise:
  - auth flow and refresh rotation
  - **cross-farm isolation**: user A cannot read/update/delete farm B's animals, weighings, sales, or import batches, by ID or via list endpoints
  - import commit and rollback
  - idempotency
- **GitHub Actions workflow** `.github/workflows/ci.yml`:
  - install, lint, typecheck, unit tests, and `npm run build` with no database (must pass)
  - a second job with a Postgres service container that runs migrations and the integration tests
- **README.md** (English) with:
  - what the app is
  - **Deploy to Vercel in 4 steps**
  - local development (`npm install`, `npm run setup`, `npm run dev`)
  - scripts reference
  - project structure
  - roles table
  - how to add a migration
- **`docs/decisions/`**: short ADRs for:
  - single Next.js app instead of a monorepo
  - migrations run at build time
  - auth design
  - import design

---

## 11. Out of scope for this version (don't build, but don't block)

- Reproduction, health, dairy, inventory, PDF reports, email alerts, background workers/queues.
- Photo uploads.
- The offline mobile app, EID readers, and Bluetooth scales.
- Paraguay government integrations (SENACSA, GTE), market prices, maps, and AI.

Keep the event model, the sync-friendly UUIDs, and idempotency in place so these can be added later without rewriting.

---

## 12. Acceptance checklist (run all of these yourself before finishing)

1. `npm install` works on a clean clone.
2. `npm run lint`, `npm run typecheck`, and `npm test` all pass.
3. With **no** database env vars:
   - `npm run build` succeeds
   - `npm start` serves the "Conecta una base de datos" page
4. With a local Postgres (`docker compose up -d`, then set `DATABASE_URL`):
   - `npm run build` applies migrations automatically
   - `npm start` → `/configuracion-inicial` works
   - you can log in, load demo data, see the dashboard with charts, create an animal, add a weighing, do a batch weighing, and create a sale
   - you can download each import template, fill it, and import it through all 5 steps
   - re-uploading the same file warns about duplicates
   - rolling back the import restores the previous state
5. Create a second farm with a different user, and confirm the first user cannot access its animals by pasting URLs or calling the API.
6. Test at 375px width and in dark mode: no horizontal scrolling, and everything is readable.
7. The migration SQL in `prisma/migrations` matches the schema (`prisma migrate diff` from migrations to schema shows no changes).

If Docker is not available in your environment, still complete steps 1–3 and 7, and write the integration tests so the CI job exercises steps 4–5.

When finished, give a short summary of:
- what was built
- anything you could not verify
- the exact Vercel deploy steps