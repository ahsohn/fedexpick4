import type { ESPNLeaderboard, ESPNLeaderboardEntry, ESPNFedExStanding, ESPNScheduleEvent } from "./types";

export function parseLeaderboard(payload: any): ESPNLeaderboard {
  const event = payload?.events?.[0] ?? payload?.event;
  if (!event) throw new Error("No event found in leaderboard response");

  const eventId = String(event.id);
  const eventName = event.name ?? event.shortName ?? "Unknown";
  const competitors = event.competitions?.[0]?.competitors ?? [];

  const entries: ESPNLeaderboardEntry[] = competitors.map((c: any) => {
    const athlete = c.athlete ?? c;
    const statusText = (c.status?.type?.description ?? "").toUpperCase();

    let status: ESPNLeaderboardEntry["status"] = "active";
    if (statusText.includes("CUT")) status = "cut";
    else if (statusText.includes("WD")) status = "wd";
    else if (statusText.includes("DQ")) status = "dq";
    else if (statusText.includes("SCHEDULED")) status = "scheduled";

    // Extract FedEx points from statistics if available.
    // Preserve a legitimate 0; only fall back to null when the value is absent
    // or non-numeric (do NOT use `|| null`, which would coerce 0 to null).
    let fedexPoints: number | null = null;
    const stats = c.statistics ?? [];
    for (const stat of stats) {
      if (stat.name === "fedExPoints" || stat.name === "cupPoints") {
        const n = Number(stat.value);
        fedexPoints = Number.isNaN(n) ? null : n;
      }
    }

    return {
      player: {
        espnId: String(athlete.id),
        displayName: athlete.displayName ?? athlete.fullName ?? "Unknown",
      },
      position: c.sortOrder ?? null,
      status,
      fedexPoints,
    };
  });

  return { eventId, eventName, entries };
}

export function parseFedexStandings(payload: any, season: number): ESPNFedExStanding[] {
  const categories = payload?.stats?.categories ?? payload?.categories ?? [];
  const cupCategory = categories.find(
    (c: any) => c.name === "cupPoints" || c.name === "officialAmount"
  );

  if (!cupCategory?.leaders) return [];

  return cupCategory.leaders.map((leader: any, index: number) => {
    // `Number(x) ?? 0` is a no-op (Number returns NaN, never null), so guard
    // against NaN explicitly to keep corrupt values out of points arithmetic.
    const rawPoints = Number(leader.value);
    return {
      player: {
        espnId: String(leader.athlete?.id ?? ""),
        displayName: leader.athlete?.displayName ?? leader.athlete?.shortName ?? "Unknown",
      },
      rank: index + 1,
      points: Number.isNaN(rawPoints) ? 0 : rawPoints,
    };
  });
}

export function parseSchedule(payload: any): ESPNScheduleEvent[] {
  const events: ESPNScheduleEvent[] = [];
  const leagues = payload?.leagues ?? [];

  for (const league of leagues) {
    const calendar = league.calendar ?? [];
    for (const entry of calendar) {
      const eventList = entry.events ?? [];
      for (const evt of eventList) {
        events.push({
          eventId: String(evt.id),
          name: evt.name ?? evt.shortName ?? "Unknown",
          startDate: evt.date ?? evt.startDate ?? "",
          endDate: evt.endDate ?? "",
          status: evt.status?.type?.description ?? "unknown",
        });
      }
    }
  }

  // Fallback: events at top level
  if (events.length === 0 && payload?.events) {
    for (const evt of payload.events) {
      events.push({
        eventId: String(evt.id),
        name: evt.name ?? evt.shortName ?? "Unknown",
        startDate: evt.date ?? "",
        endDate: evt.endDate ?? "",
        status: evt.status?.type?.description ?? "unknown",
      });
    }
  }

  return events;
}
