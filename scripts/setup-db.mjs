// One-time DB setup: applies sql/schema.sql and adds the commissioner.
// Usage: node scripts/setup-db.mjs "Your Name" you@example.com
// Reads DATABASE_URL from .env.local (or the environment).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- Load DATABASE_URL from .env.local if not already set ---
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* fall through to the check below */
  }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked env and .env.local).");
  process.exit(1);
}

const [name = "Commissioner", email] = process.argv.slice(2);

const sql = neon(process.env.DATABASE_URL);

// --- Apply schema, statement by statement (HTTP driver = one stmt per call) ---
const raw = readFileSync(join(root, "sql", "schema.sql"), "utf8");
const stripped = raw
  .split(/\r?\n/)
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");
const statements = stripped
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Applying ${statements.length} schema statements...`);
for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 60);
  await sql.query(stmt);
  console.log("  ok:", label);
}

// --- Add commissioner (idempotent) ---
if (email) {
  await sql.query(
    `INSERT INTO users (name, email, is_commissioner) VALUES ($1, $2, true)
     ON CONFLICT (email) DO UPDATE SET is_commissioner = true, name = EXCLUDED.name`,
    [name, email]
  );
  console.log(`Commissioner ensured: ${name} <${email}>`);
} else {
  console.log("No email passed; skipped commissioner insert.");
}

// --- Sanity check ---
const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' ORDER BY table_name`
);
console.log(
  "Tables:",
  tables.map((r) => r.table_name).join(", ")
);
console.log("Done.");
