import { NextResponse } from 'next/server';

import { buildDispatchPrompt } from '../../../lib/dispatch-prompt';
import { readIssuesFromDisk } from '../../../lib/read-issues';
import type { BeadIssue } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const DISPATCH_AGENT = 'beads-task-runner';
const DEFAULT_MAX_BUDGET_USD = 5;
const DEFAULT_TIMEOUT_SECONDS = 900;

interface DispatchRequestBody {
  taskId?: unknown;
}

async function findBead(taskId: string): Promise<BeadIssue | null> {
  const issues = await readIssuesFromDisk({ projectRoot: process.cwd(), preferBd: true });
  return issues.find((issue) => issue.id === taskId) ?? null;
}

function missingEnv(): Response | null {
  const serviceUrl = process.env.CLAUDE_AGENT_SERVICE_URL;
  const token = process.env.CLAUDE_AGENT_BEARER_TOKEN;
  if (!serviceUrl || !token) {
    return NextResponse.json(
      { error: 'Claude agent service is not configured (CLAUDE_AGENT_SERVICE_URL / CLAUDE_AGENT_BEARER_TOKEN missing).' },
      { status: 500 },
    );
  }
  return null;
}

export async function POST(request: Request): Promise<Response> {
  let body: DispatchRequestBody;
  try {
    body = (await request.json()) as DispatchRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : '';
  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required.' }, { status: 400 });
  }

  const envError = missingEnv();
  if (envError) return envError;

  const bead = await findBead(taskId);
  if (!bead) {
    return NextResponse.json({ error: `Bead ${taskId} not found.` }, { status: 400 });
  }

  if (!bead.acceptance_criteria?.trim()) {
    return NextResponse.json({ error: `Bead ${taskId} is missing acceptance criteria.` }, { status: 400 });
  }

  const prompt = buildDispatchPrompt(bead);
  const serviceUrl = process.env.CLAUDE_AGENT_SERVICE_URL!;
  const token = process.env.CLAUDE_AGENT_BEARER_TOKEN!;

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, '')}/execute`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        agent: DISPATCH_AGENT,
        max_budget_usd: DEFAULT_MAX_BUDGET_USD,
        timeout_seconds: DEFAULT_TIMEOUT_SECONDS,
      }),
    });

    if (response.status === 409) {
      return NextResponse.json({ error: 'Agent is busy' }, { status: 409 });
    }

    const payload = await response.json().catch(() => null) as { job_id?: string; detail?: string } | null;

    if (!response.ok) {
      const message = payload?.detail ?? `Agent service returned HTTP ${response.status}.`;
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (!payload?.job_id) {
      return NextResponse.json({ error: 'Agent service response missing job_id.' }, { status: 502 });
    }

    return NextResponse.json({ job_id: payload.job_id }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach claude-agent-service.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
