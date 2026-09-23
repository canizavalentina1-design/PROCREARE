# PROCREARE

PROCREARE is a Spanish-language cattle and farm management platform for Paraguay. It is a single Next.js application with Prisma/Postgres, farm-scoped authorization, import-safe data workflows, and a calm responsive web UI.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Open the project’s Storage tab and add Neon Postgres.
3. Connect the database to the project.
4. Redeploy. The build generates Prisma and applies committed migrations automatically.

No database URL is required for a local build; the app shows a Spanish connection guide until Neon is connected.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

For local Postgres, use `docker compose up -d`, set `DATABASE_URL`, then run `npm run db:migrate`.

## Scripts

`npm run dev`, `npm run build`, `npm run start`, `npm run typecheck`, `npm test`, `npm run db:generate`, and `npm run db:migrate`.

## Roles

Owner and Manager administer farms; Operator manages animals and imports; Veterinarian records weighings; Reader has read-only access. Every protected query is scoped by farm membership on the server.

## Structure

`app/` contains routes, `src/domain/` contains pure formulas, `src/server/` contains database/auth services, `prisma/` contains schema and migrations, and `tests/` contains database-free unit tests.
