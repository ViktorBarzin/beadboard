import { NextResponse } from 'next/server';

import { getAgentStatus } from '../../../lib/agent-status';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const snapshot = await getAgentStatus();
  return NextResponse.json({ busy: snapshot.busy });
}
