import test from 'node:test';
import assert from 'node:assert/strict';

import { POST } from '../../src/app/api/agent-dispatch/route';

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

test('POST returns 400 when body is not valid JSON', async () => {
  const request = new Request('http://localhost/api/agent-dispatch', {
    method: 'POST',
    body: 'not-json',
    headers: { 'content-type': 'application/json' },
  });

  const response = await POST(request);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /Invalid JSON/);
});

test('POST returns 400 when taskId missing', async () => {
  const request = new Request('http://localhost/api/agent-dispatch', {
    method: 'POST',
    body: JSON.stringify({}),
    headers: { 'content-type': 'application/json' },
  });

  const response = await POST(request);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /taskId is required/);
});

test('POST returns 500 when env vars are missing', async () => {
  const restore = captureEnv(['CLAUDE_AGENT_SERVICE_URL', 'CLAUDE_AGENT_BEARER_TOKEN']);
  delete process.env.CLAUDE_AGENT_SERVICE_URL;
  delete process.env.CLAUDE_AGENT_BEARER_TOKEN;
  try {
    const request = new Request('http://localhost/api/agent-dispatch', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'some-bead-id' }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await POST(request);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.match(body.error, /not configured/);
  } finally {
    restore();
  }
});
