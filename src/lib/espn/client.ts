import { DEFAULT_USER_AGENT, LEADERBOARD_URL, SCOREBOARD_URL, STATISTICS_URL } from "./endpoints";
import type { ESPNLeaderboard, ESPNLeaderboardEntry, ESPNFedExStanding, ESPNScheduleEvent, ESPNPlayer } from "./types";
import { parseLeaderboard, parseFedexStandings, parseSchedule } from "./parsers";

interface ClientOptions {
  delayMs?: number;
  userAgent?: string;
}

export class ESPNClient {
  private delayMs: number;
  private userAgent: string;
  private lastRequestTime = 0;

  constructor(options: ClientOptions = {}) {
    this.delayMs = options.delayMs ?? 1500;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  private async throttledFetch(url: string): Promise<unknown> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.delayMs) {
      await new Promise((r) => setTimeout(r, this.delayMs - elapsed));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": this.userAgent },
        signal: controller.signal,
      });
      this.lastRequestTime = Date.now();

      if (!res.ok) {
        throw new Error(`ESPN API ${res.status}: ${res.statusText} for ${url}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async getLeaderboard(eventId?: string): Promise<ESPNLeaderboard> {
    const url = eventId
      ? `${LEADERBOARD_URL}?event=${eventId}`
      : LEADERBOARD_URL;
    const data = await this.throttledFetch(url);
    return parseLeaderboard(data);
  }

  async getFedexStandings(season: number): Promise<ESPNFedExStanding[]> {
    const url = `${STATISTICS_URL}?season=${season}`;
    const data = await this.throttledFetch(url);
    return parseFedexStandings(data, season);
  }

  async getSchedule(season: number): Promise<ESPNScheduleEvent[]> {
    const url = `${SCOREBOARD_URL}?dates=${season}`;
    const data = await this.throttledFetch(url);
    return parseSchedule(data);
  }
}
