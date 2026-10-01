# Lunor App Studio: AI-powered App Development prototype

Lunor's Web Development tool, brought to **mobile app development**. Instead of *Prompt → Generate App*, the user goes through
the full development journey:

**Prompt → Understand → Plan → Build → Explain → Learn**

| Stage | What the AI does |
|---|---|
| **Prompt** | User describes an idea and picks platform (iOS/Android/Both), framework (React Native / Flutter / SwiftUI) and their level. |
| **Understand** | AI acts as a product manager: summary, core problem, personas, MoSCoW feature list, risks, and 3 clarifying questions the user answers. |
| **Plan** | AI acts as an architect: screens and components, Mermaid screen-flow and ER diagrams, a justified tech stack, file tree, and milestones. |
| **Build** | AI writes a working app that runs live in a phone-frame preview (Sandpack). It also writes the main screen in the chosen native framework. The user can keep editing it in natural language ("add dark mode"). |
| **Explain** | Step-by-step walkthrough of *their* code: real snippets, explanations tuned to their level, and concept cards. |
| **Learn** | A personalised mini-course built from their own app: lessons with exercises, a scored quiz, XP, and build challenges that send a change request back to the Build stage. |

A context-aware **AI Mentor** chat (it knows the idea, plan and code) is available at every stage. The **Beginner / Intermediate / Pro**
setting changes the depth of every explanation, code comment and lesson. **Export ZIP** downloads the code, native snippet, `PLAN.md` and `LEARN.md`.

## Run it

```bash
npm install
cp .env.example .env        # add your GEMINI_API_KEY (optional)
npm run dev                 # API on :8787 + web on http://localhost:5173
```

With no API key the app runs in **Demo mode**: every stage returns a complete, hand-written walkthrough (the "StreakUp" habit tracker),
so the full flow can be shown offline. With a key, every stage is generated live by the AI model.
The server uses **Google Gemini** when `GEMINI_API_KEY` is set (model via `GEMINI_MODEL`, default `gemini-2.5-flash`),
and falls back to **Anthropic Claude** when only `ANTHROPIC_API_KEY` is set.

Production: `npm run build && npm start` (Express serves `dist/` and the API on port 8787).

## Architecture

```
src/                     React 19 + TypeScript + Vite + Tailwind v4 frontend
  App.tsx                stage orchestration, project state, ZIP export
  components/Stage*.tsx  one component per stage
  components/MentorChat  context-aware mentor
server/
  index.ts               Express API: /api/understand, /plan, /build, /explain, /learn, /chat
  ai.ts                  AI provider wrapper: Gemini (@google/genai, JSON mode) or Claude (@anthropic-ai/sdk)
  demo.ts                offline demo responses
```

Each stage passes the output of earlier stages as context, so the plan follows from the analysis, the code follows from the plan,
and the explanations and lessons are about the code that was actually generated.

## AI tools & technologies used

**AI**
- **Google Gemini API** (`@google/genai`), model `gemini-2.5-flash` (configurable). It powers all 5 AI stages and the mentor chat, using JSON response mode for structured stage output.
- **Anthropic Claude API** (`@anthropic-ai/sdk`), an optional alternative provider (Claude Opus 5.5).
- **Claude Code** (Anthropic's AI coding agent). Used to build this prototype.

**Frameworks & libraries**
- React 19, TypeScript, Vite 8, Tailwind CSS v4, Framer Motion, lucide-react
- **Sandpack** (CodeSandbox): in-browser bundler for the live code editor and phone preview
- **Mermaid**: renders AI-generated screen-flow and data-model diagrams
- react-markdown: renders AI explanations and lessons
- JSZip: project export
- Express + tsx: backend API
