// A stand-in for the Supabase gateway in the app e2e suite (TICKET-047):
// answers the GoTrue endpoints supabase-js uses (password sign-in, refresh,
// user, sign-out) for the fixed test users, and proxies /rest/v1/* to a real
// PostgREST over the test database so row-level security is exercised.
import { createServer, request as httpRequest } from "node:http";
import { ANON_KEY, AUTH_PORT, POSTGREST_URL, sign, USERS } from "./env.mjs";

const port = Number(process.env.PORT ?? AUTH_PORT);
const rest = new URL(POSTGREST_URL);
const TTL = 3600;

function userRecord(u) {
  const t = "2026-01-01T00:00:00Z";
  return {
    id: u.id,
    aud: "authenticated",
    role: "authenticated",
    email: u.email,
    email_confirmed_at: t,
    phone: "",
    confirmed_at: t,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: t,
    updated_at: t,
    is_anonymous: false,
  };
}

function session(u) {
  const iat = Math.floor(Date.now() / 1000);
  const access_token = sign({
    iss: `http://localhost:${port}/auth/v1`,
    sub: u.id,
    aud: "authenticated",
    exp: iat + TTL,
    iat,
    email: u.email,
    role: "authenticated",
    session_id: `${u.id}-session`,
  });
  return {
    access_token,
    token_type: "bearer",
    expires_in: TTL,
    expires_at: iat + TTL,
    refresh_token: `refresh-${u.id}`,
    user: userRecord(u),
  };
}

const byId = Object.fromEntries(Object.values(USERS).map((u) => [u.id, u]));
const byEmail = Object.fromEntries(
  Object.values(USERS).map((u) => [u.email, u])
);
const byRefresh = Object.fromEntries(
  Object.values(USERS).map((u) => [`refresh-${u.id}`, u])
);

function bearerUser(req) {
  const auth = req.headers.authorization ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token || token === ANON_KEY) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    if (payload.exp * 1000 < Date.now()) return null;
    return byId[payload.sub] ?? null;
  } catch {
    return null;
  }
}

const json = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => resolve(body));
  });

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname.startsWith("/rest/v1/")) {
    const upstream = httpRequest(
      {
        hostname: rest.hostname,
        port: rest.port,
        method: req.method,
        path: url.pathname.slice("/rest/v1".length) + url.search,
        headers: { ...req.headers, host: rest.host },
      },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      }
    );
    upstream.on("error", (e) => json(res, 502, { message: e.message }));
    req.pipe(upstream);
    return;
  }
  if (!url.pathname.startsWith("/auth/v1/")) {
    json(res, 404, { message: `no route for ${url.pathname}` });
    return;
  }
  const route = url.pathname.slice("/auth/v1".length);
  if (req.method === "GET" && route === "/health") {
    json(res, 200, { name: "lynq-e2e-auth" });
  } else if (req.method === "POST" && route === "/token") {
    const grant = url.searchParams.get("grant_type");
    const body = JSON.parse((await readBody(req)) || "{}");
    const u =
      grant === "password"
        ? byEmail[body.email]
        : grant === "refresh_token"
          ? byRefresh[body.refresh_token]
          : null;
    if (!u || (grant === "password" && body.password !== u.password)) {
      json(res, 400, {
        error: "invalid_grant",
        error_description: "Invalid login credentials",
        code: 400,
        msg: "Invalid login credentials",
      });
      return;
    }
    json(res, 200, session(u));
  } else if (req.method === "GET" && route === "/user") {
    const u = bearerUser(req);
    if (!u) json(res, 401, { code: 401, msg: "invalid claim: missing sub" });
    else json(res, 200, userRecord(u));
  } else if (req.method === "POST" && route === "/logout") {
    res.writeHead(204).end();
  } else {
    json(res, 404, { code: 404, msg: `unhandled auth route ${route}` });
  }
}).listen(port, () => {
  console.log(
    `lynq e2e auth stub on http://localhost:${port} → ${POSTGREST_URL}`
  );
});
