import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDispatchPrompt } from '../../src/lib/dispatch-prompt';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'beadboard-abc.1',
    title: 'Sample task',
    description: 'Describe the work in detail.',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: null,
    owner: null,
    labels: [],
    dependencies: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    closed_at: null,
    close_reason: null,
    closed_by_session: null,
    created_by: null,
    due_at: null,
    estimated_minutes: null,
    external_ref: null,
    acceptance_criteria: 'Checkbox: done when X.',
    metadata: {},
    ...overrides,
  };
}

test('buildDispatchPrompt includes bead id in opening and close commands', () => {
  const prompt = buildDispatchPrompt(makeIssue({ id: 'beadboard-77.3' }));

  assert.match(prompt, /beads-task-runner/);
  assert.match(prompt, /`beadboard-77\.3`/);
  assert.match(prompt, /bd note beadboard-77\.3 "claimed by agent <job_id>"/);
  assert.match(prompt, /bd close beadboard-77\.3 -r "completed by agent <job_id>"/);
});

test('buildDispatchPrompt renders priority as P<n> and includes issue type', () => {
  const prompt = buildDispatchPrompt(makeIssue({ priority: 2, issue_type: 'bug' }));

  assert.match(prompt, /\(P2, type=bug\)/);
});

test('buildDispatchPrompt includes description and acceptance criteria verbatim', () => {
  const prompt = buildDispatchPrompt(makeIssue({
    description: 'Concrete description here.',
    acceptance_criteria: 'Concrete acceptance here.',
  }));

  assert.ok(prompt.includes('Concrete description here.'));
  assert.ok(prompt.includes('Concrete acceptance here.'));
});

test('buildDispatchPrompt falls back when description or acceptance are missing', () => {
  const prompt = buildDispatchPrompt(makeIssue({
    description: null,
    acceptance_criteria: null,
  }));

  assert.ok(prompt.includes('(no description)'));
  assert.ok(prompt.includes('(no acceptance criteria)'));
});

test('buildDispatchPrompt includes operating guard rails', () => {
  const prompt = buildDispatchPrompt(makeIssue());

  assert.match(prompt, /bd --db \/workspace\/\.beads/);
  assert.match(prompt, /Do NOT push, do NOT edit files, do NOT run terraform\/kubectl\/helm\./);
  assert.match(prompt, /bd update beadboard-abc\.1 --status blocked/);
});
