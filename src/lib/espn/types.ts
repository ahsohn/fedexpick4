export interface ESPNPlayer {
  espnId: string;
  displayName: string;
}

export interface ESPNLeaderboardEntry {
  player: ESPNPlayer;
  position: number | null;
  status: "active" | "cut" | "wd" | "dq" | "scheduled";
  fedexPoints: number | null;
}

export interface ESPNLeaderboard {
  eventId: string;
  eventName: string;
  entries: ESPNLeaderboardEntry[];
}

export interface ESPNFedExStanding {
  player: ESPNPlayer;
  rank: number;
  points: number;
}

export interface ESPNScheduleEvent {
  eventId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}
