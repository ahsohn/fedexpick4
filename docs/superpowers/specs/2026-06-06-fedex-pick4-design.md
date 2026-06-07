# FedEx Pick 4 — Design Specification

## Overview

FedEx Pick 4 is a standalone fantasy golf league app where users pick 4 golfers (+1 backup) each week from the full PGA Tour roster. Users earn points based on the FedEx Cup points their picked golfers score that tournament. Previously picked golfers cannot be reused in future weeks (except unused backups). The user with the most cumulative points at the end of the season wins.

**Timeline:** Testing with a small group for the remainder of the 2026 PGA Tour season, then running for real in 2027.

## Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Neon PostgreSQL (serverless)
- **Hosting:** Vercel
- **External API:** ESPN Golf API (tournament fields, leaderboards, FedEx Cup standings)
- **Auth:** Email-based login (commissioner-managed user list)

## Core Mechanics

### Weekly Picks
- Each week corresponds to a PGA Tour tournament
- Users select **4 starter golfers + 1 backup** from the full PGA Tour roster
- The full roster is always shown (not just that week's field), with badges indicating which golfers are in the current tournament field
- Users cannot pick golfers they have already used in a previous week that season
- Picks must be submitted before a commissioner-set deadline for each tournament

### Backup Activation
- The backup golfer **only activates** if one of the 4 starters does not play at all that week (not entered in the tournament or WD before round 1)
- If activated, the backup replaces the non-playing starter and earns FedEx points. The backup is then marked as "used" and cannot be picked again
- If the backup is **not activated**, they return to the available pool and can be picked again in future weeks
- If multiple starters don't play, only one is replaced by the backup (the first non-playing starter in pick order)

### Scoring
- Points are based on FedEx Cup points awarded for that tournament
- A golfer who plays but earns 0 FedEx points (e.g., misses the cut) scores 0
- A golfer not in the tournament field scores 0 (and triggers backup activation)
- Each user's weekly score is the sum of their 4 active golfers' FedEx points
- Season standings are the cumulative sum of all weekly scores

### Used Golfer Tracking
- A golfer is marked as "used" for a user when:
  - They were picked as a starter (always used, regardless of score)
  - They were picked as a backup AND were activated
- A golfer is NOT marked as "used" when:
  - They were picked as a backup but were NOT activated
- Used golfers cannot be picked again for the remainder of the season

## Data Model

### `users`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Auto-incrementing unique ID |
| `name` | text | Display name |
| `email` | text (unique) | Login identifier |
| `is_commissioner` | boolean | Admin access flag |
| `created_at` | timestamp | Account creation time |

### `golfers`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Internal unique ID |
| `espn_id` | text (unique) | ESPN athlete ID for API mapping |
| `name` | text | Display name |
| `active` | boolean | Whether the golfer is active (default true) |
| `created_at` | timestamp | When first added to the system |

### `tournaments`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Internal unique ID |
| `name` | text | Tournament name (e.g., "The Memorial") |
| `espn_event_id` | text | ESPN event ID for API mapping |
| `season_year` | integer | Season year (2026, 2027, etc.) |
| `deadline` | timestamp | Pick submission deadline (set by commissioner) |
| `status` | text | `open` / `locked` / `scored` |
| `field_last_updated` | timestamp | Last time the tournament field was refreshed from ESPN |
| `created_at` | timestamp | When the tournament was created |

### `tournament_field`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Row ID |
| `tournament_id` | integer FK | References `tournaments.id` |
| `golfer_id` | integer FK | References `golfers.id` |
| `in_field` | boolean | Whether the golfer is in this week's field |

### `picks`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Row ID |
| `user_id` | integer FK | References `users.id` |
| `tournament_id` | integer FK | References `tournaments.id` |
| `golfer_id` | integer FK | References `golfers.id` |
| `pick_type` | text | `starter` or `backup` |
| `pick_order` | integer | 1-4 for starters, 5 for backup (used for backup activation priority) |
| `was_activated` | boolean | For backups: whether they were activated (default false) |
| `fedex_points` | integer | Points earned (null until tournament is scored) |
| `created_at` | timestamp | When the pick was submitted |

Unique constraint: `(user_id, tournament_id, golfer_id)` — a user cannot pick the same golfer twice for the same tournament.

### `standings`
| Column | Type | Description |
|--------|------|-------------|
| `id` | serial PK | Row ID |
| `user_id` | integer FK | References `users.id` |
| `season_year` | integer | Season year |
| `total_points` | integer | Cumulative FedEx points for the season |

### `config`
| Column | Type | Description |
|--------|------|-------------|
| `key` | text PK | Setting name |
| `value` | text | Setting value |

Used for: `current_season` (e.g., "2026"), and any other app-wide settings.

### Key Queries (Derived Data)

**Used golfers for a user in a season:**
```sql
SELECT DISTINCT golfer_id FROM picks p
JOIN tournaments t ON p.tournament_id = t.id
WHERE p.user_id = :userId
  AND t.season_year = :season
  AND (p.pick_type = 'starter' OR (p.pick_type = 'backup' AND p.was_activated = true))
```

**Season standings:**
```sql
SELECT u.id, u.name, COALESCE(SUM(p.fedex_points), 0) as total
FROM users u
LEFT JOIN picks p ON u.id = p.user_id
  AND (p.pick_type = 'starter' OR (p.pick_type = 'backup' AND p.was_activated = true))
LEFT JOIN tournaments t ON p.tournament_id = t.id
  AND t.season_year = :season
GROUP BY u.id ORDER BY total DESC
```

## ESPN API Integration

### Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `site.api.espn.com/.../statistics` | FedEx Cup standings — player names, ESPN IDs, FedEx points/ranking |
| `site.web.api.espn.com/.../leaderboard` | Tournament leaderboard — competitors, scores, FedEx points earned |
| `site.api.espn.com/.../scoreboard` | Season schedule — list of all tournaments with ESPN event IDs |

### Golfer Roster Strategy

The ESPN API does not provide a single "full PGA Tour roster" endpoint. Instead, the roster is built and maintained progressively:

1. **Initial seed (one-time):**
   - Pull all golfers from the **FedEx Cup standings** (statistics endpoint) — captures everyone who has earned points in 2026
   - Scrape all completed **2026 tournament leaderboards** — captures anyone who played but may not appear in standings
   - Union and deduplicate by `espn_id`, insert into `golfers` table

2. **Ongoing auto-discovery:**
   - Whenever a tournament field or leaderboard is fetched and contains a golfer not in the `golfers` table, auto-insert them
   - This naturally captures new tour members, sponsor exemptions, qualifiers, etc.

3. **Season reset preserves golfers:**
   - The `golfers` table is never wiped. It only grows over time.
   - By the 2027 season, the roster will be comprehensive from the full 2026 season plus any new players

### FedEx Cup Ranking

- Pulled from the statistics endpoint
- Displayed on the pick page as a sortable column
- Refreshed periodically (same lazy-refresh pattern as tournament fields)
- Stored in-memory/cached, not persisted to database (changes weekly)

### Tournament Field Refresh

- On tournament creation: attempt to pull the field from ESPN. If not yet available, that's fine.
- On pick page load: check `field_last_updated`. If stale (> 6 hours), re-pull from ESPN automatically.
- Display "Field last updated: X hours ago" with a manual "Refresh Field" button for users.
- After the tournament deadline: stop refreshing (field is locked).

### Auto-Scoring Flow

1. Commissioner triggers "Fetch Results" for a completed tournament
2. System pulls leaderboard from ESPN, extracts FedEx points per golfer
3. Maps golfer ESPN IDs to internal `golfer_id`
4. For each user's picks:
   - Populates `fedex_points` on each starter pick
   - Checks if any starter's golfer was not in the field → activates backup if so
   - Populates `fedex_points` on the activated backup
5. Presents a review screen to the commissioner showing all users' picks with points
6. Commissioner approves → standings table is recalculated

## Pages & User Experience

### Navigation Bar
`FedEx Pick 4 | Picks | Standings | Results | History | Stats`

### Login Page
- Email-only authentication
- Commissioner manages who is in the league (no self-registration)
- Email validated against `users` table

### Dashboard (Home)
- Current tournament name and deadline countdown
- "Make Your Picks" call-to-action button (or "Picks Submitted" if already done)
- Standings snapshot (top 5 + current user's position)
- Recent results summary

### Make Picks Page
- **Tournament header:** name, deadline with countdown timer
- **Field status bar:** "Field last updated: X ago" + Refresh Field button
- **Search bar:** type-ahead search by golfer name
- **Filter toggles:** All / In Field Only / Available Only (combinable)
- **Sort options:** Alphabetical, FedEx Cup Ranking
- **Golfer list:** each row shows:
  - Golfer name
  - FedEx Cup ranking
  - Field badge: `IN FIELD` (green) / `NOT IN FIELD` (yellow) / `USED WK X` (red, greyed out)
  - Pick slot assignment or "+ Add" button
- **Pick progress bar:** "Starters: 2/4 — Backup: 1/1"
- **Visual distinction:** starters highlighted in blue, backup in purple
- **Submit button:** disabled until 4 starters + 1 backup selected
- **Clear Picks button:** reset current selections
- Users can modify picks until the deadline

### Standings Page
- Season leaderboard table
- Columns: Rank, Player Name, Total Points, This Week's Points (+delta)
- Highlights current user's row

### Weekly Results Page
- Dropdown/selector to choose which tournament week to view
- **Your picks section:** each golfer with points earned, backup activation status
- **All players section:** everyone's picks and weekly totals, ranked by weekly score

### Pick History Page
- **Used golfers tag cloud:** visual display of all golfers the user has used this season with count
- **Week-by-week list:** for each tournament, show the 4 starters + backup, whether backup was activated, and points earned per golfer

### Stats/Analytics Page
- Placeholder page for now — actual stats to be determined later
- Potential stats: best single-week score, worst picks, most popular golfer across league, etc.

### Admin Panel (Commissioner Only)

#### Manage Users
- Add/remove league members (name + email)
- Toggle commissioner status

#### Tournament Management
- Create tournament: name, ESPN event ID (with event picker from scoreboard data), deadline date/time
- Edit tournament details
- Lock/unlock picks manually
- Set tournament status (open → locked → scored)

#### Score Review
- "Fetch Results" button to pull ESPN data for a completed tournament
- Review screen showing all users' picks with auto-populated FedEx points
- Ability to manually edit any points before approving (for edge cases)
- "Approve & Update Standings" button to finalize

#### Season Management
- **Export CSV:** download all picks for the season with columns: `user, tournament, golfer, pick_type, was_activated, fedex_points, tournament_date`
- **Season Reset:** confirmation dialog → truncates `picks`, `standings`, `tournaments`, `tournament_field`. Preserves `users`, `golfers`, `config`. Updates `config.current_season` to the new year.

## Season Lifecycle

### Starting a New Season (Beginning of Year)
1. Update `config.current_season` to the new year
2. Golfer roster carries over (no reset)
3. Commissioner creates tournaments for the upcoming schedule (can be done progressively week-by-week or batch from ESPN scoreboard)
4. Users begin making picks

### During the Season
1. Commissioner creates each week's tournament (or batch-creates from ESPN schedule)
2. ESPN fields auto-refresh as users visit the pick page
3. Users submit picks before the deadline
4. After tournament completes, commissioner fetches results → reviews → approves
5. Standings update automatically

### Ending a Season
1. Commissioner exports all picks to CSV for archival
2. Commissioner triggers season reset
3. All picks, standings, tournaments, and tournament fields are wiped
4. Users and golfers are preserved
5. Ready for the next season

## Error Handling & Edge Cases

- **User misses a week:** no picks submitted = 0 points for that week. No penalty, no carryover.
- **ESPN API unavailable:** field badges show "Field data unavailable" with last-known data. Picks can still be submitted (full roster is always available). Scoring falls back to manual entry by commissioner.
- **Golfer withdraws mid-tournament:** they still count as "played" (they were in the field). They earn whatever FedEx points they earned (likely 0). Backup is NOT activated.
- **Golfer withdraws before round 1:** treated as "did not play" → backup activates.
- **All 4 starters don't play:** only one is replaced by the backup. The other 3 score 0.
- **Duplicate picks across users:** allowed. Multiple users can pick the same golfer in the same week.
- **Pick modification:** users can change picks freely until the deadline. After deadline, picks are locked.

## Out of Scope (Future Considerations)

- Mobile app
- Push notifications for deadlines
- Live tournament scoring/tracking
- Head-to-head matchups
- Trade/waiver system
- Multiple leagues
- OGWR (Official Golf World Ranking) — not available from ESPN API
- Draft-based format (this is the existing GolfLeagueManager)
