// AI provider wrapper. Uses Google Gemini when GEMINI_API_KEY is set,
// otherwise Anthropic Claude when ANTHROPIC_API_KEY is set, otherwise demo mode.
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Effort = 'low' | 'medium' | 'high';

const provider: 'gemini' | 'claude' | null = process.env.GEMINI_API_KEY
  ? 'gemini'
  : process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN
    ? 'claude'
    : null;

export const MODEL =
  provider === 'gemini'
    ? process.env.GEMINI_MODEL || 'gemini-2.5-flash'
    : process.env.LUNOR_MODEL || 'claude-opus-5-5';

export const hasKey = () => provider !== null;

let gemini: GoogleGenAI | null = null;
let claude: Anthropic | null = null;
const getGemini = () => (gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));
const getClaude = () => (claude ??= new Anthropic());

async function generate(system: string, messages: ChatMessage[], opts: { json: boolean; effort: Effort; maxTokens: number }): Promise<string> {
  if (provider === 'gemini') {
    const res = await getGemini().models.generateContent({
      model: MODEL,
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      config: {
        systemInstruction: system,
        // Gemini 2.5 counts "thinking" tokens against this limit, so give it plenty of room.
        maxOutputTokens: opts.maxTokens,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const finish = res.candidates?.[0]?.finishReason;
    if (finish === 'MAX_TOKENS') throw new Error('The AI response was too long and got cut off. Please try again.');
    const text = res.text;
    if (!text) throw new Error(`Gemini returned no text (finish reason: ${finish ?? 'unknown'})`);
    return text;
  }

  const stream = getClaude().messages.stream({
    model: MODEL,
    max_tokens: opts.maxTokens,
    output_config: { effort: opts.effort },
    system,
    messages,
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('The model declined this request. Try rephrasing your app idea.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Response was cut off (max_tokens). Try a smaller scope.');
  return msg.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('');
}

/**
 * Fix invalid escape sequences that models copy from JavaScript into JSON strings, e.g. `\u{1F4A1}`,
 * `\'`, `\x41`, or a stray backslash. Valid JSON escapes (\" \\ \/ \b \f \n \r \t \uXXXX) are kept.
 */
export function repairJSON(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|["\\/bfnrt])|\\u\{([0-9a-fA-F]+)\}|\\(.)/g, (m, valid, codePoint, other) => {
    if (valid) return m;
    if (codePoint) return JSON.stringify(String.fromCodePoint(parseInt(codePoint, 16))).slice(1, -1);
    return other === "'" ? "'" : '\\\\' + other; // keep the character, escape the backslash literally
  });
}

/** Ask the model for JSON and parse it, tolerating ```json fences or leading prose. */
export async function askJSON<T>(system: string, user: string, effort: Effort = 'medium'): Promise<T> {
  // One automatic retry: LLM JSON occasionally comes back malformed or truncated.
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await generate(
        system + '\n\nRespond with ONE valid JSON object only. No markdown fences, no commentary.',
        [{ role: 'user', content: user }],
        { json: true, effort, maxTokens: 65536 },
      );
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end < 0) throw new Error('Model did not return JSON');
      const raw = text.slice(start, end + 1);
      try {
        return JSON.parse(raw) as T;
      } catch {
        return JSON.parse(repairJSON(raw)) as T;
      }
    } catch (e) {
      lastError = e;
      console.warn(`askJSON attempt ${attempt + 1} failed:`, e instanceof Error ? e.message : e);
    }
  }
  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(lastError instanceof SyntaxError ? `The AI returned malformed data twice (${msg}). Please try again.` : msg);
}

export async function askText(system: string, messages: ChatMessage[]): Promise<string> {
  return generate(system, messages, { json: false, effort: 'low', maxTokens: 16000 });
}
