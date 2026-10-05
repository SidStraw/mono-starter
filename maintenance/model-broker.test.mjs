import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { UsageBudget, createBroker } from './model-broker.mjs';
void it('reserves budget before dispatch and retains full charge for missing usage', () => {
  const budget = new UsageBudget({
    model: 'fixture-model',
    maxTokens: 10000,
    maxCostUsd: 1,
    pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
  });
  const reservation = budget.reserve({
    model: 'fixture-model',
    messages: [{ content: 'test' }],
    max_tokens: 100,
  });
  assert.throws(() => budget.settle(reservation, null));
  assert.ok(budget.spent.tokens > 4000);
  assert.throws(() => budget.reserve({ model: 'different', messages: [] }));
  for (const max_tokens of [-10000, 0, 0.5, '100'])
    assert.throws(() => budget.reserve({ model: 'fixture-model', messages: [], max_tokens }));
  assert.throws(() =>
    budget.reserve({ model: 'fixture-model', messages: [{ content: 'x'.repeat(10000) }] }),
  );
  const costLimited = new UsageBudget({
    model: 'fixture-model',
    maxTokens: 60000,
    maxCostUsd: 0.000001,
    pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
  });
  assert.throws(
    () => costLimited.reserve({ model: 'fixture-model', messages: [{ content: 'test' }] }),
    /cost limit/,
  );
  assert.equal(costLimited.spent.tokens, 0);
});
void it('keeps the provider key outside the client and rejects non-model routes', async () => {
  let sawKey = false;
  const upstream = createServer(async (request, response) => {
    sawKey = request.headers.authorization === 'Bearer fixture-upstream-key';
    for await (const _ of request) {
      /* consume body */
    }
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 2 } }),
    );
  });
  await new Promise((done) => upstream.listen(0, '127.0.0.1', done));
  const broker = await createBroker({
    config: {
      model: 'fixture-model',
      endpoint: `http://127.0.0.1:${upstream.address().port}`,
      maxTokens: 10000,
      maxCostUsd: 1,
    },
    apiKey: 'fixture-upstream-key',
    deadline: Date.now() + 10000,
    tool: async () => 'fixture',
  });
  try {
    const response = await fetch(`http://127.0.0.1:${broker.port}/v1/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${broker.capability}` },
      body: JSON.stringify({
        model: 'fixture-model',
        messages: [{ content: 'test' }],
        max_tokens: 100,
      }),
    });
    assert.equal(response.status, 200);
    assert.ok(sawKey);
    assert.ok(!(await response.text()).includes('fixture-upstream-key'));
    assert.equal(broker.budget.spent.tokens, 7);
    const rejected = await fetch(`http://127.0.0.1:${broker.port}/secrets`, {
      method: 'POST',
      headers: { authorization: `Bearer ${broker.capability}` },
      body: '{}',
    });
    assert.equal(rejected.status, 403);
  } finally {
    await broker.close();
    await new Promise((done) => upstream.close(done));
  }
});
