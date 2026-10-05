import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
} from '@earendil-works/pi-coding-agent';
import { Type } from '@earendil-works/pi-ai';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(process.env.REPAIR_AGENT_CONFIG);
const agentDir = config.agentDir ?? '/tmp/pi';
const resources = config.resources ?? '/agent';
const runtime = await ModelRuntime.create({
  authPath: `${agentDir}/auth.json`,
  modelsPath: null,
  modelsStorePath: `${agentDir}/models-store.json`,
  allowModelNetwork: false,
  refreshOnCreate: false,
});
runtime.registerProvider('repair-broker', {
  api: 'openai-completions',
  baseUrl: `${config.broker}/v1`,
  apiKey: config.capability,
  models: [
    {
      id: config.model,
      name: config.model,
      reasoning: false,
      input: ['text'],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 60000,
      maxTokens: 4096,
    },
  ],
});
await runtime.setRuntimeApiKey('repair-broker', config.capability);
const loader = new DefaultResourceLoader({
  cwd: agentDir,
  agentDir,
  noExtensions: true,
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  noContextFiles: true,
  systemPrompt: await readFile(`${resources}/repair-prompt.md`, 'utf8'),
});
await loader.reload();
const settings = SettingsManager.inMemory({});
const { session } = await createAgentSession({
  cwd: agentDir,
  agentDir,
  modelRuntime: runtime,
  model: runtime.getModel('repair-broker', config.model),
  resourceLoader: loader,
  settingsManager: settings,
  sessionManager: SessionManager.inMemory(),
  tools: ['workspace'],
  noTools: 'builtin',
  customTools: [
    {
      name: 'workspace',
      label: 'Isolated workspace',
      description:
        'Read/list source, write allowed source, or run a command in the isolated candidate container. No network or secrets are available.',
      parameters: Type.Object({
        operation: Type.String(),
        path: Type.Optional(Type.String()),
        content: Type.Optional(Type.String()),
        command: Type.Optional(Type.String()),
      }),
      execute: async (_id, params) => {
        const response = await fetch(`${config.broker}/tool`, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${config.capability}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(params),
        });
        if (!response.ok) throw new Error('Isolated tool rejected');
        return {
          content: [{ type: 'text', text: JSON.stringify(await response.json()) }],
          details: {},
        };
      },
    },
  ],
});
try {
  await session.prompt(await readFile(`${resources}/repair-input.txt`, 'utf8'));
  const last = session.state.messages.at(-1);
  if (!last || last.role !== 'assistant' || ['error', 'aborted'].includes(last.stopReason))
    throw new Error('Pi model request failed');
  console.log('Pi run settled; patch is subject to independent verification');
} finally {
  session.dispose();
}
