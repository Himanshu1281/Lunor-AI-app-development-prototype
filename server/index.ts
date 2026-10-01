import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';
import { askJSON, askText, hasKey, MODEL, type ChatMessage } from './ai.ts';
import * as demo from './demo.ts';
import type { Build, Explanation, Idea, Learning, Plan, Understanding } from '../src/types.ts';

const app = express();
app.use(express.json({ limit: '2mb' }));

const MENTOR = `You are Lunor, an AI mentor inside "Lunor App Studio", a tool that teaches people app development by helping them build a real app.
You always adapt depth and vocabulary to the learner's level:
- Beginner: plain language, analogies, define every term, no jargon without explanation.
- Intermediate: assume JS/React basics, explain mobile-specific ideas and trade-offs.
- Pro: concise, focus on architecture, performance, edge cases and production concerns.`;

const ideaBlock = (i: Idea) =>
  `App idea: """${i.prompt}"""\nTarget platform: ${i.platform}\nPreferred framework: ${i.framework}\nLearner level: ${i.level}`;

// Every stage endpoint: live Claude call when a key is configured, otherwise demo fixtures.
function stage<B, R>(name: string, live: (body: B) => Promise<R>, fallback: (body: B) => R) {
  app.post(`/api/${name}`, async (req, res) => {
    try {
      if (!hasKey()) {
        await new Promise(r => setTimeout(r, 900));
        return res.json(fallback(req.body));
      }
      res.json(await live(req.body));
    } catch (e) {
      console.error(`[${name}]`, e);
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });
}

app.get('/api/status', (_req, res) => res.json({ live: hasKey(), model: hasKey() ? MODEL : 'demo' }));

// LLM JSON sometimes omits fields; fill them so the UI never reads undefined.
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function normalizeUnderstanding(u: Partial<Understanding>): Understanding {
  const f = (u.features ?? {}) as Partial<Understanding['features']>;
  return {
    appName: u.appName || 'My App',
    tagline: u.tagline || '',
    summary: u.summary || '',
    problem: u.problem || '',
    personas: arr(u.personas),
    features: { must: arr(f.must), should: arr(f.should), could: arr(f.could) },
    risks: arr(u.risks),
    questions: arr<Understanding['questions'][number]>(u.questions)
      .filter(q => q?.question)
      .map(q => ({ question: q.question, options: arr<string>(q.options).length ? arr<string>(q.options) : ['Yes', 'No'] })),
  };
}

function normalizePlan(p: Partial<Plan>): Plan {
  return {
    ...p,
    screens: arr<Plan['screens'][number]>(p.screens).map(s => ({ ...s, components: arr(s.components) })),
    flow: arr(p.flow),
    entities: arr<NonNullable<Plan['entities']>[number]>(p.entities).map(e => ({ ...e, fields: arr(e.fields) })),
    relations: arr(p.relations),
    techStack: arr(p.techStack),
    fileTree: p.fileTree || '',
    milestones: arr<Plan['milestones'][number]>(p.milestones).map(m => ({ ...m, tasks: arr(m.tasks) })),
  };
}

stage<{ idea: Idea }, Understanding>(
  'understand',
  async ({ idea }) => normalizeUnderstanding(await askJSON<Partial<Understanding>>(
      `${MENTOR}\nStage: UNDERSTAND. Act as a product manager. Analyse the idea before any code is written.`,
      `${ideaBlock(idea)}

Return JSON:
{"appName": short catchy name, "tagline": one line, "summary": 3-4 sentence executive summary,
 "problem": the core user problem in 1-2 sentences,
 "personas": [{"name","description"}] (2-3),
 "features": {"must": [...], "should": [...], "could": [...]} (MoSCoW, short labels, 3-5 must),
 "risks": [...] 3-4 risks or assumptions,
 "questions": [{"question","options":[2-3 short options, first = recommended]}] exactly 3 clarifying questions that would change the design}`,
      'low',
    )),
  () => demo.understanding,
);

stage<{ idea: Idea; understanding: Understanding; answers: Record<number, string> }, Plan>(
  'plan',
  async ({ idea, understanding, answers }) => normalizePlan(await askJSON<Partial<Plan>>(
      `${MENTOR}\nStage: PLAN. Act as a senior mobile architect producing a buildable V1 plan.`,
      `${ideaBlock(idea)}
Analysis: ${JSON.stringify(understanding)}
User's answers to clarifying questions: ${JSON.stringify(
        arr<Understanding['questions'][number]>(understanding?.questions).map((q, i) => ({ q: q.question, a: answers?.[i] ?? q.options?.[0] })),
      )}

Return JSON:
{"screens":[{"name","purpose","components":[...]}] (4-6 screens),
 "flow":[{"from": screen name,"to": screen name,"label": short user action, optional}] navigation between the screens above (use the exact screen names, 5-10 links),
 "entities":[{"name": entity name,"fields":[{"type": one of string|int|float|boolean|date,"name": camelCase field}]}] 2-5 entities,
 "relations":[{"from": entity name,"to": entity name,"kind": "one-to-one"|"one-to-many"|"many-to-many","label": short verb}],
 "techStack":[{"name","why"}] 4-6 choices specific to ${idea.framework},
 "fileTree": an indented plain-text project tree for a ${idea.framework} project (use 2-space indents, no emojis),
 "milestones":[{"title","tasks":[...]}] 3-4 milestones}`,
      'medium',
    )),
  () => demo.plan,
);

function normalizeBuild(b: Partial<Build>): Build {
  const code = typeof b.code === 'string' ? b.code.replace(/^```\w*\n?|```\s*$/g, '').trim() : '';
  if (!code) throw new Error('The AI did not return any app code. Please try again.');
  return { code, nativeSnippet: b.nativeSnippet || '', summary: b.summary || 'App generated.', changes: arr(b.changes) };
}

function normalizeExplanation(e: Partial<Explanation>): Explanation {
  return {
    overview: e.overview || '',
    sections: arr<Explanation['sections'][number]>(e.sections).map(s => ({
      title: s.title || 'Section', snippet: s.snippet || '', explanation: s.explanation || '', concept: s.concept || '',
    })),
    concepts: arr(e.concepts),
  };
}

function normalizeLearning(l: Partial<Learning>): Learning {
  return {
    lessons: arr<Learning['lessons'][number]>(l.lessons).map(x => ({
      title: x.title || 'Lesson', minutes: Number(x.minutes) || 10, summary: x.summary || '', content: x.content || '', exercise: x.exercise || '',
    })),
    quiz: arr<Learning['quiz'][number]>(l.quiz)
      .filter(q => q?.question && arr(q.options).length >= 2)
      .map(q => ({ ...q, answer: Number(q.answer) || 0, why: q.why || '' })),
    challenges: arr(l.challenges),
  };
}

/** Returns a readable syntax error for the generated JSX file, or null if it parses. */
function syntaxError(code: string): string | null {
  try {
    transformSync(code, { loader: 'jsx' });
    return null;
  } catch (e) {
    const errs = (e as { errors?: { text: string; location?: { line: number; column: number; lineText: string } }[] }).errors;
    if (!errs?.length) return String(e);
    return errs
      .slice(0, 3)
      .map(m => `${m.text} at line ${m.location?.line}:${m.location?.column}: ${m.location?.lineText.trim()}`)
      .join('\n');
  }
}

type BuildRequest = { idea: Idea; understanding: Understanding; plan: Plan; code?: string; instruction?: string };

stage<BuildRequest, Build>(
  'build',
  async req => {
    let build = await generateBuild(req);
    // Models sometimes emit JSX that doesn't parse; send the exact error back for up to 2 repair rounds.
    for (let round = 0; round < 2; round++) {
      const err = syntaxError(build.code);
      if (!err) return build;
      console.warn(`[build] syntax error, repair round ${round + 1}:\n${err}`);
      const fixed = await generateBuild({
        ...req,
        code: build.code,
        instruction: `The file does not compile. Parser error:\n${err}\nFix ONLY the syntax problem(s); keep all features and behaviour identical.`,
      });
      build = { ...fixed, changes: build.changes, summary: build.summary };
    }
    const err = syntaxError(build.code);
    if (err) throw new Error(`The AI's code still has a syntax error after 2 automatic repairs: ${err.split('\n')[0]}. Please try again.`);
    return build;
  },
  ({ code, instruction }) => (code ? demo.rebuild(code, instruction ?? '') : demo.build),
);

async function generateBuild({ idea, understanding, plan, code, instruction }: BuildRequest): Promise<Build> {
  return normalizeBuild(await askJSON<Partial<Build>>(
      `${MENTOR}\nStage: BUILD. You are an expert mobile engineer. You write the app so the learner can run it instantly in a browser preview framed as a phone.`,
      `${ideaBlock(idea)}
Analysis: ${JSON.stringify(understanding)}
Plan: ${JSON.stringify({ screens: plan.screens, techStack: plan.techStack })}
${code ? `CURRENT CODE:\n${code}\n\nUSER CHANGE REQUEST: """${instruction}"""\nApply the change, keep everything else working.` : 'Build V1 implementing all MUST features.'}

Rules for "code":
- ONE self-contained React 18 file (default export App) runnable in a CodeSandbox react template. Only import from "react". No other packages, no CSS files.
- It is a MOBILE app preview: design for a 360x740 viewport, inline styles only, bottom tab bar or stack navigation implemented with useState, touch-friendly sizes, polished modern look.
- Mirror React Native structure so it maps 1:1 to native: components named View-like, a styles object at the bottom like StyleSheet.create, screens as separate components.
- Persist data with localStorage (comment: "AsyncStorage in React Native"). Seed realistic sample data.
- Add short teaching comments (// 💡 ...) at key concepts, tuned to the learner level. Fully working, no TODOs, no placeholders.
- This runs in react-dom, NOT React Native: the "style" prop must always be ONE plain object. Never pass arrays to style (merge with {...a, ...b}). Use only HTML elements (div, span, button, input, img).
- The layout must fit a narrow phone width: root width 100%, no fixed widths over 340px, no horizontal scrolling.
- Keep it compact: at most ~350 lines. Implement the MUST features well rather than everything; keep seed data to 3-5 items.

Return JSON:
{"code": the full file,
 "nativeSnippet": the main screen written idiomatically in ${idea.framework} (40-80 lines),
 "summary": 1-2 sentences on what was built or changed,
 "changes": [3-5 bullets of what you did, max 8 words each]}`,
      'medium',
    ));
}

stage<{ idea: Idea; code: string }, Explanation>(
  'explain',
  async ({ idea, code }) => normalizeExplanation(await askJSON<Partial<Explanation>>(
      `${MENTOR}\nStage: EXPLAIN. Walk the learner through THEIR generated code like a patient code reviewer.`,
      `${ideaBlock(idea)}
CODE:\n${code}

Return JSON:
{"overview": 3-5 sentences on how the app is structured and how data flows,
 "sections":[{"title","snippet": an exact short excerpt (3-12 lines) copied from the code,"explanation": markdown explanation for the ${idea.level} level,"concept": the one programming concept it teaches}] 5-7 sections in reading order,
 "concepts":[{"name","oneLiner"}] 6-8 key concepts}`,
      'low',
    )),
  () => demo.explanation,
);

stage<{ idea: Idea; plan: Plan; code: string }, Learning>(
  'learn',
  async ({ idea, plan, code }) => normalizeLearning(await askJSON<Partial<Learning>>(
      `${MENTOR}\nStage: LEARN. Build a personalised mini-course using the learner's own app as the running example.`,
      `${ideaBlock(idea)}
Tech stack: ${JSON.stringify(plan.techStack)}
CODE:\n${code}

Return JSON:
{"lessons":[{"title","minutes","summary": one line,"content": markdown lesson (150-300 words, with a code example from THEIR app, and how it translates to ${idea.framework}),"exercise": a small hands-on task in their app}] 4-5 lessons from fundamentals to shipping to the ${idea.platform} store(s),
 "quiz":[{"question","options":[4],"answer": index 0-3,"why": explanation}] 5 questions about their code,
 "challenges":[{"title","difficulty":"Easy"|"Medium"|"Hard","prompt": a change request the learner can send to the Build stage}] 3 challenges}`,
      'medium',
    )),
  () => demo.learning,
);

app.post('/api/chat', async (req, res) => {
  const { messages, context } = req.body as { messages: ChatMessage[]; context: string };
  try {
    if (!hasKey()) return res.json({ reply: demo.chatReply(messages.at(-1)?.content as string) });
    const reply = await askText(
      `${MENTOR}\nYou are the mentor side-panel. Answer questions about the learner's project briefly (under 180 words), use markdown, and encourage them to try things themselves.\n\nPROJECT CONTEXT:\n${context}`,
      messages,
    );
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Production: serve the built frontend
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () =>
  console.log(`Lunor API on http://localhost:${port} — ${hasKey() ? `live (${MODEL})` : 'DEMO mode (set GEMINI_API_KEY or ANTHROPIC_API_KEY for live AI)'}`),
);
