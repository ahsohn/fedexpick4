import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// Memoize a single Neon client. The HTTP driver is stateless (no persistent
// connection), so one instance is safe to reuse and is REQUIRED for
// sql.transaction([...]) to work: the queries in the array and the transaction
// method must come from the same client instance. Created lazily so the
// DATABASE_URL is only read on first query, not at import time.
let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  client = neon(url);
  return client;
}

// Proxy creates a fresh client per call — important for Vercel deployments
export const sql = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args) {
      return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_t, prop) {
      const client = getClient();
      const value = (client as unknown as Record<string | symbol, unknown>)[prop];
      // Bind methods (e.g. `transaction`) to their owning client so calling
      // them through the proxy doesn't lose `this`.
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
