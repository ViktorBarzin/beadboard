// Proxies claude-agent-service's /health busy flag for the dispatcher and the
// board, cached for CACHE_TTL_MS so a busy board does not hammer the service.
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

export async function getAgentStatus(): Promise<StatusSnapshot> {
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

// Drops the cached snapshot. Tests call it so one case's status does not leak
// into the next.
export function resetAgentStatusCache(): void {
  cache = null;
  inflight = null;
}
