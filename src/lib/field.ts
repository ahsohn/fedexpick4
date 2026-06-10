import { sql } from "@/lib/db";
import { ESPNClient } from "@/lib/espn/client";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

const toMs = (v: unknown): number | null => (v ? new Date(v as string).getTime() : null);

/**
 * Refresh a tournament's field from the ESPN leaderboard and return the new
 * field_last_updated timestamp. The leaderboard is fetched BEFORE the existing
 * field rows are deleted, so a failed ESPN fetch leaves current data intact.
 * New golfers are auto-discovered (upserted) here.
 */
export async function refreshField(tournamentId: number, espnEventId: string) {
  const client = new ESPNClient();
  const leaderboard = await client.getLeaderboard(espnEventId);

  await sql`DELETE FROM tournament_field WHERE tournament_id = ${tournamentId}`;

  for (const entry of leaderboard.entries) {
    if (!entry.player.espnId) continue;

    // Upsert the golfer and get its internal id in a single round-trip.
    const golferRows = await sql`
      INSERT INTO golfers (espn_id, name)
      VALUES (${entry.player.espnId}, ${entry.player.displayName})
      ON CONFLICT (espn_id) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    if (golferRows.length === 0) continue;

    await sql`
      INSERT INTO tournament_field (tournament_id, golfer_id, in_field)
      VALUES (${tournamentId}, ${golferRows[0].id}, true)
      ON CONFLICT (tournament_id, golfer_id) DO UPDATE SET in_field = true
    `;
  }

  const updated = await sql`
    UPDATE tournaments SET field_last_updated = NOW() WHERE id = ${tournamentId}
    RETURNING field_last_updated
  `;
  return updated[0]?.field_last_updated ?? null;
}

/**
 * Ensure a tournament's field is reasonably fresh, refreshing from ESPN only if
 * it is stale (>6h) AND the deadline hasn't passed AND an ESPN event is linked.
 * Returns the (possibly updated) field_last_updated value. Safe to call on every
 * picks-page load: it no-ops when the field is fresh, past deadline, or unlinked.
 * A failed ESPN refresh is swallowed so the page still loads with existing data.
 */
export async function ensureFieldFresh(tournament: {
  id: number;
  espn_event_id: string | null;
  deadline: unknown;
  field_last_updated: unknown;
}) {
  const lastUpdatedMs = toMs(tournament.field_last_updated);
  const deadlineMs = toMs(tournament.deadline);
  const isPastDeadline = deadlineMs !== null && deadlineMs < Date.now();
  const isStale = lastUpdatedMs === null || lastUpdatedMs < Date.now() - SIX_HOURS_MS;

  if (isStale && !isPastDeadline && tournament.espn_event_id) {
    try {
      return await refreshField(tournament.id, tournament.espn_event_id);
    } catch (err) {
      console.error("Auto field refresh failed (serving existing data):", err);
    }
  }
  return tournament.field_last_updated;
}
