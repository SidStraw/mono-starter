import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export class UsageBudget {
  constructor(limits, spent = { tokens: 0, cost: 0 }) {
    this.limits = limits;
    this.spent = spent;
  }
  reserve(body) {
    if (
      body.model !== this.limits.model ||
      !Array.isArray(body.messages) ||
      body.messages.some(
        (message) => typeof message.content !== 'string' && !Array.isArray(message.content),
      )
    )
      throw new Error('Unsupported model request');
    if (JSON.stringify(body).includes('image_url'))
      throw new Error('Only text model inputs are supported');
    const input = Buffer.byteLength(JSON.stringify(body)) + 4096;
    const requested = body.max_tokens ?? body.max_completion_tokens ?? 4096;
    if (!Number.isSafeInteger(requested) || requested < 1)
      throw new Error('Invalid output token request');
    const output = Math.min(requested, 4096);
    const tokens = input + output;
    const rates = this.limits.pricing;
    const cost = rates
      ? (input * rates.inputUsdPerMillion + output * rates.outputUsdPerMillion) / 1000000
      : 0;
    if (
      this.spent.tokens + tokens > this.limits.maxTokens ||
      (rates && this.spent.cost + cost > this.limits.maxCostUsd)
    )
      throw new Error('Model token/cost limit reached');
    this.spent.tokens += tokens;
    this.spent.cost += cost;
    return { input, output, tokens, cost };
  }
  settle(reservation, usage) {
    if (
      !usage ||
      !Number.isSafeInteger(usage.prompt_tokens) ||
      !Number.isSafeInteger(usage.completion_tokens) ||
      usage.prompt_tokens < 0 ||
      usage.completion_tokens < 0
    )
      throw new Error('Usage missing; full reservation retained');
    if (usage.prompt_tokens > reservation.input || usage.completion_tokens > reservation.output)
      throw new Error('Provider usage exceeds conservative reservation');
    const rates = this.limits.pricing;
    this.spent.tokens -= reservation.tokens - usage.prompt_tokens - usage.completion_tokens;
    if (rates)
      this.spent.cost -=
        reservation.cost -
        (usage.prompt_tokens * rates.inputUsdPerMillion +
          usage.completion_tokens * rates.outputUsdPerMillion) /
          1000000;
  }
}
export async function createBroker({
  config,
  apiKey,
  tool,
  persist = async () => {},
  spent,
  deadline,
  host = '127.0.0.1',
}) {
  if (!config.model || !config.endpoint || !apiKey || !Number.isSafeInteger(config.maxTokens))
    throw new Error('Explicit model/endpoint/key/budget required');
  const upstream = new URL(config.endpoint);
  if (upstream.protocol !== 'https:' && upstream.hostname !== '127.0.0.1')
    throw new Error('Model endpoint must use HTTPS');
  if (
    config.pricing &&
    (!Number.isFinite(config.pricing.inputUsdPerMillion) ||
      !Number.isFinite(config.pricing.outputUsdPerMillion) ||
      config.pricing.inputUsdPerMillion < 0 ||
      config.pricing.outputUsdPerMillion < 0 ||
      !config.pricing.source ||
      !config.pricing.verifiedAt)
  )
    throw new Error('Verified price metadata required');
  const capability = randomUUID();
  const budget = new UsageBudget(config, spent);
  const active = new Set();
  const server = createServer(async (request, response) => {
    try {
      if (
        Date.now() >= deadline ||
        request.headers.authorization !== `Bearer ${capability}` ||
        request.method !== 'POST'
      )
        throw new Error('Broker authorization/deadline rejected');
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 128 * 1024) throw new Error('Broker payload too large');
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString());
      if (request.url === '/tool') {
        const result = await tool(body);
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify(result));
        return;
      }
      if (request.url !== '/v1/chat/completions') throw new Error('Broker route rejected');
      const reservation = budget.reserve(body);
      await persist(budget.spent);
      const abort = new AbortController();
      active.add(abort);
      const timer = setTimeout(() => abort.abort(), Math.max(1, deadline - Date.now()));
      try {
        const result = await fetch(upstream, {
          method: 'POST',
          redirect: 'error',
          headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            ...body,
            max_tokens: reservation.output,
            max_completion_tokens: undefined,
            stream_options: body.stream ? { include_usage: true } : undefined,
          }),
          signal: abort.signal,
        });
        if (!result.ok) throw new Error(`Model service HTTP ${result.status}`);
        const text = await result.text();
        let usage;
        if (body.stream) {
          for (const line of text.split('\n'))
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              const chunk = JSON.parse(line.slice(6));
              if (chunk.usage) usage = chunk.usage;
            }
        } else usage = JSON.parse(text).usage;
        budget.settle(reservation, usage);
        await persist(budget.spent);
        response.setHeader('content-type', body.stream ? 'text/event-stream' : 'application/json');
        response.end(text);
      } finally {
        clearTimeout(timer);
        active.delete(abort);
      }
    } catch {
      if (!response.headersSent) response.writeHead(403, { 'content-type': 'application/json' });
      response.end(
        '{"error":{"message":"Broker rejected request or upstream usage was unavailable"}}',
      );
    }
  });
  await new Promise((done) => server.listen(0, host, done));
  return {
    server,
    capability,
    budget,
    port: server.address().port,
    close: async () => {
      for (const abort of active) abort.abort();
      await new Promise((done) => server.close(done));
    },
  };
}
