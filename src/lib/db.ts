import { neon, NeonQueryFunction } from "@neondatabase/serverless";

function getClient(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL environment variable is not set");
  return neon(url);
}

// Proxy creates a fresh client per call — important for Vercel deployments
export const sql = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args) {
      return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
    },
    get(_t, prop) {
      return (getClient() as unknown as Record<string | symbol, unknown>)[prop];
    },
  }
);
