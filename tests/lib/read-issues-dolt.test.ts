import test from 'node:test';
import assert from 'node:assert/strict';

import { dependencyTarget } from '../../src/lib/read-issues-dolt';

// bd up to schema v53 stores the target in `depends_on_id`. bd 1.3 (schema v66)
// splits it into one column per target kind, and exactly one of them is set.
const cases: Array<{ name: string; row: Record<string, unknown>; expected: string | null }> = [
  { name: 'v32-v53 depends_on_id', row: { depends_on_id: 'code-abc' }, expected: 'code-abc' },
  { name: 'v66 issue target', row: { depends_on_issue_id: 'code-abc', depends_on_wisp_id: null, depends_on_external: null }, expected: 'code-abc' },
  { name: 'v66 wisp target', row: { depends_on_issue_id: null, depends_on_wisp_id: 'code-wisp-1', depends_on_external: null }, expected: 'code-wisp-1' },
  { name: 'v66 external target', row: { depends_on_issue_id: null, depends_on_wisp_id: null, depends_on_external: 'external:gh:1' }, expected: 'external:gh:1' },
  { name: 'no target column set', row: { depends_on_issue_id: null, depends_on_wisp_id: null, depends_on_external: null }, expected: null },
  { name: 'empty strings are not targets', row: { depends_on_issue_id: '', depends_on_external: 'external:x' }, expected: 'external:x' },
];

for (const { name, row, expected } of cases) {
  test(`dependencyTarget: ${name}`, () => {
    assert.equal(dependencyTarget(row), expected);
  });
}
