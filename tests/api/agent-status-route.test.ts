import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../../src/app/api/agent-status/route';

type FetchFn = typeof fetch;

function withFetchStub<T>(stub: FetchFn, work: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = stub;
  return work().finally(() => {
    globalThis.fetch = original;
  });
}

function captureEnv(keys: string[]): () => void {
  const saved = new Map<string, string | undefined>();
  for (const key of keys) saved.set(key, process.env[key]);
  return () => {
    for (const key of keys) {
      const prior = saved.get(key);
      if (prior === undefined) delete process.env[key];
      else process.env[key] = prior;
    }
  };
}

test('GET returns {busy:false} when CLAUDE_AGENT_SERVICE_URL is unset', async () => {
  const restore = captureEnv(['CLAUDE_AGENT_SERVICE_URL']);
  delete process.env.CLAUDE_AGENT_SERVICE_URL;
  try {
    await withFetchStub(async () => {
      throw new Error('fetch should not be called when URL is unset');
    }, async () => {
      // Bust the module cache so cached snapshots from prior tests do not leak.
      await import(`../../src/app/api/agent-status/route?url-unset=${Date.now()}`);
      const response = await GET();
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.busy, false);
    });
  } finally {
    restore();
  }
});

test('GET proxies busy=true when /health returns busy=true', async () => {
  const restore = captureEnv(['CLAUDE_AGENT_SERVICE_URL']);
  process.env.CLAUDE_AGENT_SERVICE_URL = 'http://fake-agent.local';
  try {
    const stub: FetchFn = async () => new Response(JSON.stringify({ status: 'ok', busy: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    await withFetchStub(stub, async () => {
      const mod = await import(`../../src/app/api/agent-status/route?busy-true=${Date.now()}`) as { GET: typeof GET };
      const response = await mod.GET();
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.busy, true);
    });
  } finally {
    restore();
  }
});

test('GET returns busy=true when /health returns HTTP 503', async () => {
  const restore = captureEnv(['CLAUDE_AGENT_SERVICE_URL']);
  process.env.CLAUDE_AGENT_SERVICE_URL = 'http://fake-agent.local';
  try {
    const stub: FetchFn = async () => new Response('busy', { status: 503 });

    await withFetchStub(stub, async () => {
      const mod = await import(`../../src/app/api/agent-status/route?busy-503=${Date.now()}`) as { GET: typeof GET };
      const response = await mod.GET();
      const body = await response.json();
      assert.equal(response.status, 200);
      assert.equal(body.busy, true);
    });
  } finally {
    restore();
  }
});
