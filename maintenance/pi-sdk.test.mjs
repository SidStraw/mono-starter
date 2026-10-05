import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createBroker } from './model-broker.mjs';
void it('runs the pinned Pi SDK through the broker with an explicit fixture model', async () => {
  let requests = 0;
  const upstream = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const data = JSON.parse(body);
    assert.equal(data.model, 'fixture-model');
    assert.equal(data.tools.length, 1);
    assert.equal(data.tools[0].function.name, 'workspace');
    requests++;
    response.setHeader('content-type', 'text/event-stream');
    const event = (value) => response.write('data: ' + JSON.stringify(value) + '\n\n');
    event({
      id: 'fixture',
      object: 'chat.completion.chunk',
      choices: [
        {
          index: 0,
          delta: { role: 'assistant', content: 'Fixture SDK completed.' },
          finish_reason: null,
        },
      ],
    });
    event({
      id: 'fixture',
      object: 'chat.completion.chunk',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    response.end('data: [DONE]\n\n');
  });
  await new Promise((done) => upstream.listen(0, '127.0.0.1', done));
  const broker = await createBroker({
    config: {
      model: 'fixture-model',
      endpoint: `http://127.0.0.1:${upstream.address().port}`,
      maxTokens: 60000,
      maxCostUsd: 1,
    },
    apiKey: 'fixture-private-key',
    deadline: Date.now() + 30000,
    tool: async () => ({}),
  });
  const temp = await mkdtemp(join(tmpdir(), 'pi-sdk-fixture-'));
  try {
    await cp('maintenance/repair-prompt.md', join(temp, 'repair-prompt.md'));
    await writeFile(
      join(temp, 'repair-input.txt'),
      'Return a short completion; this is a fixture protocol test.',
    );
    const result = await new Promise((done, reject) => {
      const child = spawn(process.execPath, ['maintenance/pi-agent.mjs'], {
        env: {
          PATH: process.env.PATH,
          HOME: temp,
          REPAIR_AGENT_CONFIG: JSON.stringify({
            broker: `http://127.0.0.1:${broker.port}`,
            capability: broker.capability,
            model: 'fixture-model',
            agentDir: temp,
            resources: temp,
          }),
        },
      });
      let output = '';
      child.stdout.on('data', (chunk) => (output += chunk));
      child.stderr.on('data', (chunk) => (output += chunk));
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('SDK fixture timeout'));
      }, 25000);
      child.on('exit', (code) => {
        clearTimeout(timer);
        done({ code, output });
      });
      child.on('error', reject);
    });
    assert.equal(result.code, 0, result.output);
    assert.equal(requests, 1);
    assert.equal(broker.budget.spent.tokens, 15);
    assert.ok(!result.output.includes('fixture-private-key'));
  } finally {
    await broker.close();
    await new Promise((done) => upstream.close(done));
    await rm(temp, { recursive: true, force: true });
  }
});
