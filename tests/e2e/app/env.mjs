// Shared constants for the app e2e harness (TICKET-047): the JWT secret the
// stand-in auth server and PostgREST agree on, the fixed test users, and the
// ports. Everything here is test-only and public by design.
import { createHmac } from "node:crypto";

export const JWT_SECRET = "lynq-e2e-jwt-secret-must-be-at-least-32-chars";
export const AUTH_PORT = 54330;
export const POSTGREST_URL =
  process.env.E2E_POSTGREST_URL ?? "http://localhost:54331";
export const APP_PORT = 3006;
export const APP_URL = `http://localhost:${APP_PORT}`;
export const SUPABASE_URL = `http://localhost:${AUTH_PORT}`;

/** The two accounts the suite signs in as. The guest matches the login page's button. */
export const USERS = {
  owner: {
    id: "00000000-0000-4000-8000-000000000001",
    email: "owner@e2e.lynq.test",
    password: "owner-e2e-password",
  },
  guest: {
    id: "00000000-0000-4000-8000-000000000002",
    email: "guest@email.com",
    password: "guest@password",
  },
};

const b64 = (s) => Buffer.from(s).toString("base64url");

/** HS256 JWT PostgREST accepts; `auth.uid()` reads `sub`. */
export function sign(claims) {
  const header = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64(JSON.stringify(claims));
  const sig = createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

/** The anon key is itself a JWT with role anon, as in a real project. */
export const ANON_KEY = sign({
  iss: "supabase",
  ref: "e2e",
  role: "anon",
  iat: 1_700_000_000,
  exp: 4_000_000_000,
});
