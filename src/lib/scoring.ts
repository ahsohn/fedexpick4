import { sql } from "@/lib/db";

interface PickRow {
  id: number;
  user_id: number;
  golfer_id: number;
  pick_type: string;
  pick_order: number;
  espn_id: string;
}

interface ScoredPick {
  pick_id: number;
  golfer_id: number;
  pick_type: string;
  pick_order: number;
  fedex_points: number;
  was_subbed_out: boolean;
  was_activated: boolean;
}

/**
 * Process scoring for a single user's picks.
 * - Checks which starters are not in the field -> marks as subbed out
 * - Activates backup for the first non-playing starter (by pick_order)
 * - Assigns FedEx points from the leaderboard data
 */
export function processUserPicks(
  picks: PickRow[],
  fieldGolferEspnIds: Set<string>,
  fedexPointsByEspnId: Map<string, number>
): ScoredPick[] {
  const starters = picks
    .filter((p) => p.pick_type === "starter")
    .sort((a, b) => a.pick_order - b.pick_order);
  const backup = picks.find((p) => p.pick_type === "backup");

  const result: ScoredPick[] = [];
  let backupActivatedFor: number | null = null;

  for (const starter of starters) {
    const inField = fieldGolferEspnIds.has(starter.espn_id);

    if (!inField && backupActivatedFor === null) {
      // First non-playing starter -> backup activates for this one
      backupActivatedFor = starter.pick_order;
      result.push({
        pick_id: starter.id,
        golfer_id: starter.golfer_id,
        pick_type: "starter",
        pick_order: starter.pick_order,
        fedex_points: 0,
        was_subbed_out: true,
        was_activated: false,
      });
    } else if (!inField) {
      // Additional non-playing starter -> subbed out, no replacement
      result.push({
        pick_id: starter.id,
        golfer_id: starter.golfer_id,
        pick_type: "starter",
        pick_order: starter.pick_order,
        fedex_points: 0,
        was_subbed_out: true,
        was_activated: false,
      });
    } else {
      // Starter played
      const points = fedexPointsByEspnId.get(starter.espn_id) ?? 0;
      result.push({
        pick_id: starter.id,
        golfer_id: starter.golfer_id,
        pick_type: "starter",
        pick_order: starter.pick_order,
        fedex_points: points,
        was_subbed_out: false,
        was_activated: false,
      });
    }
  }

  if (backup) {
    if (backupActivatedFor !== null) {
      const points = fedexPointsByEspnId.get(backup.espn_id) ?? 0;
      result.push({
        pick_id: backup.id,
        golfer_id: backup.golfer_id,
        pick_type: "backup",
        pick_order: backup.pick_order,
        fedex_points: points,
        was_subbed_out: false,
        was_activated: true,
      });
    } else {
      result.push({
        pick_id: backup.id,
        golfer_id: backup.golfer_id,
        pick_type: "backup",
        pick_order: backup.pick_order,
        fedex_points: 0,
        was_subbed_out: false,
        was_activated: false,
      });
    }
  }

  return result;
}

/**
 * Recalculate standings for the entire season from scored picks.
 */
export async function recalculateStandings(seasonYear: number) {
  await sql`DELETE FROM standings WHERE season_year = ${seasonYear}`;

  await sql`
    INSERT INTO standings (user_id, season_year, total_points)
    SELECT
      u.id,
      ${seasonYear},
      COALESCE(SUM(p.fedex_points), 0)
    FROM users u
    LEFT JOIN picks p ON u.id = p.user_id
      AND (
        (p.pick_type = 'starter' AND p.was_subbed_out = false)
        OR (p.pick_type = 'backup' AND p.was_activated = true)
      )
    LEFT JOIN tournaments t ON p.tournament_id = t.id
      AND t.season_year = ${seasonYear}
    GROUP BY u.id
    ON CONFLICT (user_id, season_year)
    DO UPDATE SET total_points = EXCLUDED.total_points
  `;
}
