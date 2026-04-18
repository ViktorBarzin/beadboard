import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 2000;

interface StatusSnapshot {
  busy: boolean;
  fetchedAt: number;
}

let cache: StatusSnapshot | null = null;
let inflight: Promise<StatusSnapshot> | null = null;

async function fetchRemoteStatus(): Promise<StatusSnapshot> {
  const serviceUrl = process.env.CLAUDE_AGENT_SERVICE_URL;
  if (!serviceUrl) {
    return { busy: false, fetchedAt: Date.now() };
  }

  const now = Date.now();
  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/health`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    });

    if (response.status === 503) {
      return { busy: true, fetchedAt: now };
    }

    if (!response.ok) {
      return { busy: false, fetchedAt: now };
    }

    const payload = await response.json().catch(() => null) as { busy?: boolean } | null;
    return { busy: Boolean(payload?.busy), fetchedAt: now };
  } catch {
    return { busy: false, fetchedAt: now };
  }
}

async function getStatus(): Promise<StatusSnapshot> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache;
  }

  if (inflight) {
    return inflight;
  }

  inflight = fetchRemoteStatus().then((snapshot) => {
    cache = snapshot;
    return snapshot;
  }).finally(() => {
    inflight = null;
  });

  return inflight;
}

export async function GET(): Promise<Response> {
  const snapshot = await getStatus();
  return NextResponse.json({ busy: snapshot.busy });
}
