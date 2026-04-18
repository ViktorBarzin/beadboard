import test from 'node:test';
import assert from 'node:assert/strict';

test('DispatchButton module exports component', async () => {
  const mod = await import('../../../src/components/shared/dispatch-button');
  assert.ok(mod.DispatchButton, 'DispatchButton should be exported');
  assert.equal(typeof mod.DispatchButton, 'function', 'DispatchButton should be a function');
});

test('DispatchButton module exports default', async () => {
  const mod = await import('../../../src/components/shared/dispatch-button');
  assert.ok(mod.default, 'default export should exist');
  assert.equal(mod.default, mod.DispatchButton, 'default should match named export');
});
