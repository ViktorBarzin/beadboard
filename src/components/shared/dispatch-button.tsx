'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Rocket } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { BeadIssue } from '../../lib/types';

interface DispatchButtonProps {
  bead: BeadIssue;
}

type StatusMessage = { kind: 'info' | 'ok' | 'error'; text: string };

const DISPATCHABLE_STATUSES = new Set<BeadIssue['status']>(['open', 'in_progress']);
const POLL_INTERVAL_MS = 5000;

export function DispatchButton({ bead }: DispatchButtonProps) {
  const [agentBusy, setAgentBusy] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const mountedRef = useRef<boolean>(true);

  const isDispatchable = DISPATCHABLE_STATUSES.has(bead.status);
  const hasAcceptance = Boolean(bead.acceptance_criteria?.trim());

  const fetchAgentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/agent-status', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json() as { busy?: boolean };
      if (mountedRef.current) {
        setAgentBusy(Boolean(payload.busy));
      }
    } catch {
      // Leave previous state; fail closed is not required for a heartbeat.
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!isDispatchable) {
      return () => {
        mountedRef.current = false;
      };
    }

    void fetchAgentStatus();
    const handle = window.setInterval(() => { void fetchAgentStatus(); }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(handle);
    };
  }, [isDispatchable, fetchAgentStatus]);

  const handleDispatch = useCallback(async () => {
    setSubmitting(true);
    setStatus({ kind: 'info', text: 'Submitting…' });
    try {
      const response = await fetch('/api/agent-dispatch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId: bead.id }),
      });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (response.status === 409) {
        setStatus({ kind: 'error', text: 'Agent busy — try again shortly' });
        setAgentBusy(true);
        return;
      }
      if (!response.ok) {
        const message = typeof payload.error === 'string' ? payload.error : `Dispatch failed (HTTP ${response.status})`;
        setStatus({ kind: 'error', text: message });
        return;
      }
      const jobId = typeof payload.job_id === 'string' ? payload.job_id : 'unknown';
      setStatus({ kind: 'ok', text: `Job \`${jobId}\` submitted` });
      setAgentBusy(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      setStatus({ kind: 'error', text: message });
    } finally {
      setSubmitting(false);
    }
  }, [bead.id]);

  if (!isDispatchable) {
    return null;
  }

  const disabled = submitting || agentBusy || !hasAcceptance;
  const hint = !hasAcceptance
    ? 'Task is missing acceptance criteria — cannot dispatch.'
    : agentBusy
      ? 'Agent is currently busy.'
      : 'Hand this task to the claude-agent-service runner.';

  const statusToneClass = status?.kind === 'ok'
    ? 'text-[var(--ui-accent-ready)]'
    : status?.kind === 'error'
      ? 'text-[#EAA7A0]'
      : 'text-[var(--ui-text-muted)]';

  return (
    <div className="pt-1" data-testid="dispatch-button-container">
      <Button
        onClick={() => void handleDispatch()}
        disabled={disabled}
        title={hint}
        className="h-8 rounded-full bg-[var(--ui-accent-info)] px-4 text-[#0b1e30] hover:bg-[color-mix(in_srgb,var(--ui-accent-info)_86%,white)] disabled:opacity-40"
        data-testid="dispatch-agent-button"
      >
        <Rocket className="mr-2 h-3.5 w-3.5" />
        {submitting ? 'Dispatching…' : 'Dispatch to Agent'}
      </Button>
      {status ? (
        <p className={`mt-1 text-xs ${statusToneClass}`} data-testid="dispatch-status">
          {status.text}
        </p>
      ) : null}
    </div>
  );
}

export default DispatchButton;
