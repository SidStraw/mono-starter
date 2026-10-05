import { it } from 'node:test';
import assert from 'node:assert/strict';
import { compatibilityFailure } from './classify-failure.mjs';
const job = (conclusion, supply = 'success', prepare = 'success') => ({
  name: 'starter/linux-x64',
  conclusion,
  steps: [
    { name: 'Prepare candidate', conclusion: prepare },
    { name: 'Supply-chain gates', conclusion: supply },
    { name: 'Compatibility checks', conclusion: 'failure' },
  ],
});
void it('only repairs compatibility failures after installation and policy gates succeed', () => {
  assert.ok(compatibilityFailure([job('failure')], ['linux-x64']));
  for (const value of ['skipped', 'cancelled', 'neutral', 'success'])
    assert.throws(() => compatibilityFailure([job(value)], ['linux-x64']));
  assert.throws(() => compatibilityFailure([job('failure', 'failure')], ['linux-x64']));
  assert.throws(() => compatibilityFailure([job('failure', 'success', 'failure')], ['linux-x64']));
  assert.throws(() => compatibilityFailure([job('failure')], ['linux-x64', 'macos-arm64']));
});
