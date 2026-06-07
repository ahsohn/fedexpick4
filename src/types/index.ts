// --- Database row types ---

export interface User {
  id: number;
  name: string;
  email: string;
  is_commissioner: boolean;
  created_at: string;
}

export interface Golfer {
  id: number;
  espn_id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface Tournament {
  id: number;
  name: string;
  espn_event_id: string | null;
  season_year: number;
  deadline: string | null;
  status: "open" | "locked" | "scored";
  field_last_updated: string | null;
  created_at: string;
}

export interface TournamentField {
  id: number;
  tournament_id: number;
  golfer_id: number;
  in_field: boolean;
}

export interface Pick {
  id: number;
  user_id: number;
  tournament_id: number;
  golfer_id: number;
  pick_type: "starter" | "backup";
  pick_order: number;
  was_subbed_out: boolean;
  was_activated: boolean;
  fedex_points: number | null;
  created_at: string;
}

export interface Standing {
  id: number;
  user_id: number;
  season_year: number;
  total_points: number;
}

// --- API response types ---

export interface GolferWithStatus extends Golfer {
  in_field: boolean | null; // null if no field data available
  used_in_week: string | null; // tournament name if used, null if available
  fedex_rank: number | null;
}

export interface PickWithGolfer extends Pick {
  golfer_name: string;
}

export interface StandingWithUser {
  rank: number;
  user_id: number;
  user_name: string;
  total_points: number;
  week_points: number | null;
}

export interface WeeklyResult {
  user_id: number;
  user_name: string;
  picks: PickWithGolfer[];
  week_total: number;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

export interface PickSubmission {
  tournament_id: number;
  picks: {
    golfer_id: number;
    pick_type: "starter" | "backup";
    pick_order: number;
  }[];
}
