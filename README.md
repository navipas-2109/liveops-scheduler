# LiveOps Scheduler

Scheduling system for the E-commerce Live Operation team: brand slots, MC
planning, staff shifts and MC payments, replacing the Google Sheets workflow.

Built with Next.js, Tailwind CSS, Prisma and PostgreSQL (Supabase).

## Project layout

- `prisma/` – database structure (`schema.prisma`), migrations and master data seed
- `src/domain/` – business rules: payment calculation, conflict detection, slot status
- `src/application/` – use cases that combine the rules with data access
- `src/infrastructure/` – database client and outside services (Lark)
- `src/app/` – pages and API routes

## Running locally

1. Copy `.env.example` to `.env` and fill in the values.
2. `npm install`
3. `npm run db:migrate` – create the tables
4. `npm run db:seed` – load rooms, MCs, producers, brands and starter accounts
5. `npm run dev` – open http://localhost:3000

`npm test` runs the business-rule tests.
