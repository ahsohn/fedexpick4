# FedEx Pick 4

A standalone fantasy golf league app. Each week you pick **4 golfers + 1 backup**
from the full PGA Tour roster and earn points based on the FedEx Cup points your
golfers score that tournament. Golfers you've used can't be picked again that
season (an unused backup returns to the pool).

- **Spec:** `docs/superpowers/specs/2026-06-06-fedex-pick4-design.md`
- **Implementation plan:** `docs/superpowers/plans/2026-06-06-fedex-pick4.md`

## Next steps to get this running (start here)

The app code is complete and merged to `main`. To bring it online you need a
database and a few one-time setup steps — none of which were done automatically
because they require your own credentials. Work through these in order:

- [ ] **1. Create a Neon Postgres database.** Easiest path: in the Vercel
      dashboard, add the **Neon** integration to this project (Storage →
      Create → Neon). Otherwise sign up at [neon.tech](https://neon.tech), create
      a project, and copy the connection string.
- [ ] **2. Set `DATABASE_URL` locally.** Copy `.env.local.example` to
      `.env.local` and paste your Neon connection string (see *Local setup* below).
- [ ] **3. Apply the schema** to the database: `psql "$DATABASE_URL" -f sql/schema.sql`.
- [ ] **4. Add yourself as commissioner** (one SQL insert — see *Local setup* step 5).
- [ ] **5. Run `npm run dev`** and log in at http://localhost:3000 with that email.
- [ ] **6. Seed the golfer roster** once: `curl -X POST http://localhost:3000/api/seed`
      (see *Seeding the golfer roster*). This is the only slow step (a few minutes).
- [ ] **7. Add your league members and create the first tournament**
      (see *Running a season*).
- [ ] **8. Deploy to Vercel** and repeat the schema + seed against production
      (see *Deploying to Vercel*).

Everything below expands each of these steps in detail.

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Neon PostgreSQL (`@neondatabase/serverless`)
- ESPN Golf API (tournament fields, leaderboards, FedEx Cup standings)
- Deployed on Vercel

## How it works

- **Picks:** 4 starters + 1 backup per tournament, before a commissioner-set deadline.
- **Backup activation:** the backup only takes over if a starter does **not play**
  (not in the field / WD before round 1). Only the first non-playing starter (by
  pick order) is replaced; a starter who doesn't play is *not* marked "used".
- **Used golfers:** a golfer is "used" once they play as a starter, or as an
  activated backup. Used golfers can't be re-picked that season.
- **Scoring:** commissioner fetches results from ESPN, reviews/edits, then approves.
  Standings recompute automatically.
- **Roster:** built progressively from ESPN FedEx standings + completed-event
  leaderboards, and auto-grows as new golfers appear. It is **never** wiped on
  season reset.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Neon Postgres database (via the Vercel Marketplace or neon.tech) and
   copy its connection string.
3. Create `.env.local` (see `.env.local.example`):
   ```
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
4. Apply the schema:
   ```bash
   psql "$DATABASE_URL" -f sql/schema.sql
   ```
5. Add yourself as the commissioner:
   ```bash
   psql "$DATABASE_URL" -c "INSERT INTO users (name, email, is_commissioner) VALUES ('Your Name', 'you@example.com', true);"
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 and log in with that email.

## Seeding the golfer roster (one-time per environment)

With the dev server running (or against the deployed app), seed the roster from
ESPN. This pulls the FedEx Cup standings plus every completed 2026 event's
leaderboard, so it can take a few minutes (it is throttled to be polite to ESPN):

```bash
curl -X POST http://localhost:3000/api/seed
```

> The seed scrapes all completed events sequentially. On Vercel it runs as a
> serverless function — the default timeout (300s) is sufficient, but run it on a
> plan that allows long invocations and re-run if it times out (it's idempotent;
> golfers are inserted with `ON CONFLICT DO NOTHING`).

## Running a season

1. **Add players** — Admin → Manage Users.
2. **Create each tournament** — Admin → Tournaments. Set the name, the ESPN
   event ID (optional, but required for the auto field refresh and for ESPN
   scoring), and the pick deadline.
   - To find the ESPN event ID, open `http://localhost:3000/api/field/schedule`
     (or `https://<your-app>/api/field/schedule`) in a browser — it returns the
     season's events with their `eventId` and `name`. Match by name and copy the
     `eventId`.
   - You can also read it off ESPN's site: the leaderboard URL contains it, e.g.
     `espn.com/golf/leaderboard?tournamentId=401580351` → `401580351`.
3. Players make picks before the deadline. The field auto-refreshes from ESPN
   (and there's a manual "Refresh Field" button on the picks page).
4. **Lock** the tournament after the deadline (Admin → Tournaments → Lock).
5. **Score** it (Admin → Tournaments → Score): Fetch Results from ESPN, review
   and adjust points if needed, then Approve & Update Standings.

## End of season → start of next season

1. Admin → **Export CSV** to download every pick for the season (archival).
2. Admin → **Season Reset**: type `RESET`, then enter the new season year.
   This wipes `picks`, `standings`, `tournament_field`, and `tournaments`, and
   sets `config.current_season` to the new year. **Users and golfers are kept**,
   so the roster carries over and grows year over year.

## Deploying to Vercel

1. **Push to GitHub** (already wired to `origin`): `git push origin main`.
2. **Import the repo into Vercel** (Add New → Project → pick `fedexpick4`).
   Framework preset auto-detects as Next.js; no build settings to change.
3. **Provision the database / set the env var.** Either add the **Neon**
   integration from the project's Storage tab (it injects `DATABASE_URL`
   automatically), or set it yourself:
   - Dashboard: Project → Settings → Environment Variables → add `DATABASE_URL`
     for Production (and Preview if you want previews to work), or
   - CLI: `vercel env add DATABASE_URL production` (install with `npm i -g vercel`).
4. **Apply the schema to the production database** (run from your machine against
   the production `DATABASE_URL`): `psql "<prod DATABASE_URL>" -f sql/schema.sql`,
   then add your commissioner row (same insert as local setup step 5).
5. **Deploy** (automatic on push, or `vercel --prod`).
6. **Seed production once:** `curl -X POST https://<your-app>.vercel.app/api/seed`.
   Run this on a plan that allows long function execution; it's idempotent, so
   re-run if it times out.
7. Optionally add a custom domain in Vercel → Settings → Domains.

## Known limitations / future work

- **WD before round 1 vs. mid-tournament:** backup activation keys off whether a
  golfer appears in the ESPN leaderboard at all. A player who withdraws before
  round 1 may still appear and be treated as "played" (scoring 0). The
  commissioner can adjust points during score review; finer WD handling is future
  work.
- **World ranking (OGWR):** not available from the ESPN API, so only FedEx Cup
  ranking is shown.
- **Stats page** is a placeholder — specific stats to be added later.
- Auth is email-only with no password (commissioner-managed roster), suitable for
  a small private league.
