import { NextResponse } from "next/server";
import { getGeoCodesFromHeaders } from "@/lib/geo/request-geo";
import { handleCollect, MAX_BODY_BYTES } from "@/lib/ingest/collect";
import { insertEvents, logIngest, rememberUser } from "@/lib/ingest/db-deps";
import { saltFor } from "@/lib/ingest/salts";
import { resolveSite } from "@/lib/ingest/sites";

// Tracker v2 endpoint (design §7). Every response after the gates is 202: the
// tracker never retries, so a 5xx would only lose the same data with extra load.
export const dynamic = "force-dynamic";
export const maxDuration = 5;

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: cors(req.headers.get("origin")),
  });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const headers = cors(origin);
  const declared = Number.parseInt(req.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 400, headers });
  }
  const body = await req.text();
  const result = await handleCollect(
    { headers: req.headers, body, receivedAt: new Date() },
    {
      resolveSite,
      saltFor,
      identitySecret: process.env.LYNQ_IDENTITY_SECRET ?? "",
      geo: getGeoCodesFromHeaders,
      insert: insertEvents,
      log: logIngest,
      rememberUser,
    }
  );
  return new NextResponse(null, { status: result.status, headers });
}
