import test from 'node:test';
import assert from 'node:assert/strict';

import { isTaskMatch, shouldHideEpicEntry, type LeftPanelFilters } from '../../../src/components/shared/left-panel';
import type { BeadIssue } from '../../../src/lib/types';

const defaultFilters: LeftPanelFilters = {
  query: '',
  status: 'all',
  priority: 'all',
  preset: 'all',
  hideClosed: true,
  hideNoAcceptance: true,
  hideShortDescription: true,
};

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'test-1',
    title: 'Test issue',
    description: 'x'.repeat(400),
    status: 'open',
    priority: 2,
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
    acceptance_criteria: 'Some acceptance criteria text',
    metadata: {},
    ...overrides,
  };
}

test('does not hide epics with no children when hideClosed is the only active toggle', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 0,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, false);
});

test('hides epics with only closed children when hideClosed is enabled', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 4,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});

test('hides epic with children when query filter excludes all children', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 3,
    isSelected: false,
    filters: { ...defaultFilters, query: 'nonexistent' },
  });

  assert.equal(hidden, true);
});

test('keeps selected epic visible even when no children match filters', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'open',
    matchedChildrenCount: 0,
    totalChildrenCount: 5,
    isSelected: true,
    filters: { ...defaultFilters, status: 'blocked' },
  });

  assert.equal(hidden, false);
});

test('hides closed epic even when it has no children', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'closed',
    matchedChildrenCount: 0,
    totalChildrenCount: 0,
    isSelected: false,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});

test('hides closed selected epic when hideClosed is enabled', () => {
  const hidden = shouldHideEpicEntry({
    epicStatus: 'closed',
    matchedChildrenCount: 2,
    totalChildrenCount: 2,
    isSelected: true,
    filters: defaultFilters,
  });

  assert.equal(hidden, true);
});

test('hideNoAcceptance=true hides task with empty acceptance_criteria', () => {
  const task = makeIssue({ acceptance_criteria: '' });
  assert.equal(isTaskMatch(task, defaultFilters), false);
});

test('hideNoAcceptance=true hides task with whitespace-only acceptance_criteria', () => {
  const task = makeIssue({ acceptance_criteria: '   \n\t  ' });
  assert.equal(isTaskMatch(task, defaultFilters), false);
});

test('hideNoAcceptance=false shows task with empty acceptance_criteria', () => {
  const task = makeIssue({ acceptance_criteria: null });
  const filters = { ...defaultFilters, hideNoAcceptance: false };
  assert.equal(isTaskMatch(task, filters), true);
});

test('hideNoAcceptance=true keeps epic visible regardless of acceptance_criteria', () => {
  const epic = makeIssue({ issue_type: 'epic', acceptance_criteria: null });
  assert.equal(isTaskMatch(epic, defaultFilters), true);
});

test('hideShortDescription=true hides task with 199-character description', () => {
  const task = makeIssue({ description: 'x'.repeat(199) });
  assert.equal(isTaskMatch(task, defaultFilters), false);
});

test('hideShortDescription=true shows task with 200-character description', () => {
  const task = makeIssue({ description: 'x'.repeat(200) });
  assert.equal(isTaskMatch(task, defaultFilters), true);
});

test('hideShortDescription=false shows task with short description', () => {
  const task = makeIssue({ description: 'short' });
  const filters = { ...defaultFilters, hideShortDescription: false, hideNoAcceptance: false };
  assert.equal(isTaskMatch(task, filters), true);
});

test('hideShortDescription=true keeps epic visible regardless of description length', () => {
  const epic = makeIssue({ issue_type: 'epic', description: 'short' });
  assert.equal(isTaskMatch(epic, defaultFilters), true);
});

test('hideShortDescription treats null description as length 0', () => {
  const task = makeIssue({ description: null });
  assert.equal(isTaskMatch(task, defaultFilters), false);
});
