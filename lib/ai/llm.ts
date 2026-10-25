const ANTHROPIC_BASE = 'https://api.anthropic.com/v1/messages';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

export class LlmUnavailable extends Error {}

export function llmStatus(): { enabled: boolean; provider?: string; model?: string } {
  if (process.env.ANTHROPIC_API_KEY) {
    return { enabled: true, provider: 'anthropic', model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5' };
  }
  if (process.env.OPENAI_API_KEY) {
    return { enabled: true, provider: 'openai', model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini' };
  }
  return { enabled: false };
}

function parseJson(raw: string): unknown {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model returned no JSON object.');
  return JSON.parse(body.slice(start, end + 1));
}

/**
 * Single JSON-in/JSON-out call. Claude is primary, OpenAI is the documented
 * fallback; with no key configured the pipeline uses its deterministic engine.
 */
export async function completeJson(
  system: string,
  user: string,
  { maxTokens = 3000, temperature = 0.7 }: { maxTokens?: number; temperature?: number } = {},
): Promise<unknown> {
  const provider = llmStatus();
  if (!provider.enabled || !provider.provider) throw new LlmUnavailable('No AI provider configured.');

  if (provider.provider === 'anthropic') {
    const res = await fetch(ANTHROPIC_BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Claude request failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return parseJson((data.content ?? []).map((part) => part.text ?? '').join(''));
  }

  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: maxTokens,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI request failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return parseJson(data.choices?.[0]?.message?.content ?? '');
}
