// ESPN Golf API endpoints

// Live leaderboard for current/specific event
// Note: uses site.web.api.espn.com (not site.api.espn.com)
export const LEADERBOARD_URL =
  "https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard";

// Season schedule — list of all tournaments with ESPN event IDs
export const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

// FedEx Cup standings — player names, ESPN IDs, points/ranking
export const STATISTICS_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/pga/statistics";

// ESPN 403s requests without a browser-like user agent
export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
