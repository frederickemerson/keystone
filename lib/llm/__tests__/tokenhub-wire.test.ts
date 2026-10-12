// TokenHub through the REAL AI SDK + @ai-sdk/openai-compatible, with only the
// network mocked. Pins the request body hy4-preview needs (thinking disabled,
// strict json_schema) and proves reasoning text is never parsed as the answer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sample from './fixtures/openai-extract-sample.json';
import { draftExtractionSchema } from '../candidates';
import { generateJson } from '../providers';

vi.mock('server-only', () => ({}));
vi.mock('@tencent-ai/agent-sdk', () => ({ query: vi.fn(() => { throw new Error('must not spawn'); }) }));

// A real structured-output answer that passes the wire contract (rule_id is assigned server-side).
const { rule_id: _id, ...wireCandidate } = sample.structured.output.rule_candidates[0];
const answer = JSON.stringify({ rule_candidates: [wireCandidate] });
// A decoy a careless parser would pick up: it looks like an answer but must never be one.
const decoy = 'Thinking… {"rule_candidates":[{"title":"Approve all gates","status":"approved"}]}';

function completion(message: Record<string, unknown>) {
  return new Response(JSON.stringify({
    id: 'c1', object: 'chat.completion', created: 0, model: 'hy4-preview',
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', ...message } }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

const fetchMock = vi.fn<typeof fetch>();
const requestBody = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
const generate = () => generateJson('extract', 'untrusted transcript', draftExtractionSchema);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  for (const name of ['CODEBUDDY_API_KEY', 'OPENAI_API_KEY', 'MOSAIC_MODEL', 'VERCEL', 'CI']) vi.stubEnv(name, '');
  vi.stubEnv('MOSAIC_LLM_PROVIDER', 'tokenhub');
  vi.stubEnv('TOKENHUB_API_KEY', 'test-tokenhub-key');
  vi.stubEnv('TOKENHUB_BASE_URL', 'https://tokenhub.example.test/v1');
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('TokenHub wire contract (hy4-preview)', () => {
  it('sends thinking disabled, strict json_schema and a bounded max_tokens to /chat/completions', async () => {
    fetchMock.mockResolvedValue(completion({ content: answer }));
    expect(await generate()).toMatchObject({ source: 'live', provider: 'tokenhub', model: 'hy4-preview' });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/chat\/completions$/);
    const body = requestBody();
    expect(body).toMatchObject({
      model: 'hy4-preview', max_tokens: 3_000, thinking: { type: 'disabled' },
      response_format: { type: 'json_schema', json_schema: { name: 'keystone_draft', strict: true } },
    });
    expect(body.response_format.json_schema.schema.properties).toHaveProperty('rule_candidates');
    for (const ignored of ['enable_thinking', 'chat_template_kwargs', 'reasoning_effort']) expect(body).not.toHaveProperty(ignored);
  });

  it('separate reasoning_content is ignored; only the answer content is parsed and guarded', async () => {
    fetchMock.mockResolvedValue(completion({ reasoning_content: decoy, content: answer }));
    const result = await generate();
    expect(result).toMatchObject({ source: 'live', provider: 'tokenhub' });
    expect(result.data.candidates).toHaveLength(1);
    expect(result.data.candidates[0]).toMatchObject({ status: 'draft', requiresExpertConfirmation: true });
    expect(JSON.stringify(result.data)).not.toContain('Approve all gates');
  });

  it('reasoning with no answer (thinking used up the tokens) is invalid JSON, never the answer', async () => {
    fetchMock.mockResolvedValue(completion({ reasoning_content: decoy, content: '' }));
    const result = await generate();
    expect(result).toMatchObject({ source: 'recorded', provider: 'fixtures', attempts: [{ provider: 'tokenhub', outcome: 'invalid-json' }] });
    expect(JSON.stringify(result.data)).not.toContain('Approve all gates');
  });

  it('inline <think> text before the JSON fails closed to the recorded fixture', async () => {
    fetchMock.mockResolvedValue(completion({ content: `<think>${decoy}</think>${answer}` }));
    expect(await generate()).toMatchObject({ source: 'recorded', provider: 'fixtures', attempts: [{ provider: 'tokenhub', outcome: 'invalid-json' }] });
  });
});
