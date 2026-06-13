# FedEx Pick 4 — Project Guide

Standalone fantasy golf league app. Each week players pick **4 starters + 1
backup** from the PGA Tour roster and score the FedEx Cup points their golfers
earn that tournament. Used golfers can't be re-picked that season.

- **Spec:** `docs/superpowers/specs/2026-06-06-fedex-pick4-design.md`
- **Plan:** `docs/superpowers/plans/2026-06-06-fedex-pick4.md`
- **README:** end-to-end setup, seeding, and deploy instructions.

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Neon PostgreSQL via `@neondatabase/serverless` (HTTP driver, see `src/lib/db.ts`)
- ESPN Golf API for fields, leaderboards, FedEx Cup standings
- Deployed on Vercel

## Database

- Connection is read lazily from `DATABASE_URL` (`.env.local` locally; Vercel env
  var in production). The HTTP driver is **one statement per call** — it does not
  run multi-statement SQL.
- Schema: `sql/schema.sql`. Apply it with `node scripts/setup-db.mjs "Name" email`
  (works without `psql`; also ensures the commissioner user and prints the tables).
- `psql` is **not** installed on the dev machine — use the Node script or Neon's
  web SQL editor for schema/admin SQL.

## Known Issues & Solutions

### Vercel/Next.js API Route Caching (IMPORTANT)

**Problem:** Data updated directly in the Neon database (or by another request)
may not appear on the production site — an API route returns stale values even
though the database is correct. Example seen in practice: a user's name updated
in the DB still showed the old name in the standings leaderboard.

**Root Cause:** Next.js on Vercel aggressively caches API route responses. Even
with `export const dynamic = "force-dynamic"`, responses can still be cached.

**Solution:** Every GET route that reads frequently-updated data must include
**all three** of these:

```typescript
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore(); // call at the very start of the handler
  // ...rest of handler
}
```

**Routes that have this applied** (keep this list in sync when adding read
endpoints — any new GET that reads mutable data needs the same treatment):
- `src/app/api/standings/route.ts`
- `src/app/api/picks/route.ts`
- `src/app/api/picks/history/route.ts`
- `src/app/api/tournaments/route.ts`
- `src/app/api/tournaments/current/route.ts`
- `src/app/api/tournaments/[id]/route.ts`
- `src/app/api/field/[tournamentId]/route.ts`
- `src/app/api/field/schedule/route.ts`
- `src/app/api/golfers/route.ts`
- `src/app/api/results/[id]/route.ts`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/export/route.ts`

**Client note:** the logged-in user is cached in `localStorage`
(`fedexpick4_auth`, see `src/contexts/AuthContext.tsx`) and only refreshes on
re-login. After a profile change (name, commissioner status), the affected user
must log out and back in — or hard-refresh — to see it in client-rendered UI.

## Conventions

- Files use **CRLF** line endings (Windows). Scripts that rewrite source must be
  CRLF-tolerant.
- Verify changes with `npx tsc --noEmit` before committing.
- This is a private, low-traffic league app — email-only auth, no passwords.
