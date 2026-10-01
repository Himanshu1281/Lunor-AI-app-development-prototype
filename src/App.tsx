import { useEffect, useState } from 'react';
import {
  Code2, Download, GraduationCap, MessageSquare, Sparkles, Layout,
  Map, Code, BookOpen, User, AlertCircle, RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';

import Stage1Prompt from './components/Stage1Prompt';
import Stage2Understand from './components/Stage2Understand';
import Stage3Plan from './components/Stage3Plan';
import Stage4Build from './components/Stage4Build';
import Stage5Explain from './components/Stage5Explain';
import Stage6Learn from './components/Stage6Learn';
import MentorChat from './components/MentorChat';
import { Thinking } from './components/ui';
import { getStatus, post } from './api';
import { erDiagram, flowChart } from './diagrams';
import type { Build, Explanation, Learning, Level, Plan, Project, Understanding } from './types';

const STAGES = [
  { id: 'prompt', label: 'Prompt', icon: Sparkles, hint: 'Describe your idea' },
  { id: 'understand', label: 'Understand', icon: User, hint: 'Users, features, risks' },
  { id: 'plan', label: 'Plan', icon: Map, hint: 'Screens, data, stack' },
  { id: 'build', label: 'Build', icon: Code, hint: 'Live code + preview' },
  { id: 'explain', label: 'Explain', icon: Layout, hint: 'Code walkthrough' },
  { id: 'learn', label: 'Learn', icon: BookOpen, hint: 'Lessons & quiz' },
];

const initialProject: Project = {
  idea: {
    prompt: 'A habit tracker app with daily check-ins, streaks and gamification to keep me motivated.',
    platform: 'Both',
    framework: 'React Native',
    level: 'Beginner',
  },
  answers: {},
};

export default function App() {
  const [project, setProject] = useState<Project>(initialProject);
  const [stage, setStage] = useState(0);
  const [reached, setReached] = useState(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(true);
  const [status, setStatus] = useState<{ live: boolean; model: string } | null>(null);

  useEffect(() => { getStatus().then(setStatus); }, []);

  const go = (i: number) => { setStage(i); setReached(r => Math.max(r, i)); };

  /** Run the AI call that produces stage `target`, then navigate to it. */
  async function advance(target: number, p: Project = project) {
    const id = STAGES[target].id;
    setError(null);
    setLoading(id);
    try {
      const { idea, understanding, answers, plan, build } = p;
      let next: Project = p;
      if (id === 'understand') {
        const u = await post<Understanding>('understand', { idea });
        // A fresh analysis invalidates everything downstream.
        next = { idea, understanding: u, answers: {} };
      } else if (id === 'plan') {
        next = { ...p, plan: await post<Plan>('plan', { idea, understanding, answers }), build: undefined, explanation: undefined, learning: undefined };
      } else if (id === 'build') {
        next = { ...p, build: await post<Build>('build', { idea, understanding, plan }), explanation: undefined, learning: undefined };
      } else if (id === 'explain') {
        next = { ...p, explanation: await post<Explanation>('explain', { idea, code: build!.code }) };
      } else if (id === 'learn') {
        next = { ...p, learning: await post<Learning>('learn', { idea, plan, code: build!.code }) };
      }
      setProject(next);
      setStage(target);
      setReached(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  /** Iterate on the code with a natural-language change request (used by Build + Learn challenges). */
  async function modify(instruction: string) {
    const { idea, understanding, plan, build } = project;
    setError(null);
    setLoading('build');
    setStage(3);
    try {
      const b = await post<Build>('build', { idea, understanding, plan, code: build?.code, instruction });
      setProject(p => ({ ...p, build: b, explanation: undefined, learning: undefined }));
      setReached(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  const setLevel = (level: Level) => setProject(p => ({ ...p, idea: { ...p.idea, level } }));

  async function exportZip() {
    const { idea, understanding: u, plan, build, learning } = project;
    const zip = new JSZip();
    const name = u?.appName ?? 'my-app';
    if (build) {
      zip.file('preview/App.js', build.code);
      zip.file(`native/MainScreen.${idea.framework === 'Flutter' ? 'dart' : idea.framework === 'SwiftUI' ? 'swift' : 'tsx'}`, build.nativeSnippet);
    }
    const md: string[] = [`# ${name}\n\n> ${u?.tagline ?? ''}\n\n**Idea:** ${idea.prompt}\n`];
    if (u) md.push(`## Summary\n${u.summary}\n\n## Must-have features\n${u.features.must.map(f => `- ${f}`).join('\n')}\n`);
    if (plan) {
      md.push(`## Screens\n${plan.screens.map(s => `- **${s.name}** — ${s.purpose}`).join('\n')}\n`);
      md.push(`## Screen flow\n\`\`\`mermaid\n${flowChart(plan) ?? ''}\n\`\`\`\n\n## Data model\n\`\`\`mermaid\n${erDiagram(plan) ?? ''}\n\`\`\`\n`);
      md.push(`## Tech stack\n${plan.techStack.map(t => `- **${t.name}** — ${t.why}`).join('\n')}\n\n## File structure\n\`\`\`\n${plan.fileTree}\n\`\`\`\n`);
      md.push(`## Milestones\n${plan.milestones.map(m => `### ${m.title}\n${m.tasks.map(t => `- [ ] ${t}`).join('\n')}`).join('\n\n')}\n`);
    }
    zip.file('PLAN.md', md.join('\n'));
    if (learning) zip.file('LEARN.md', learning.lessons.map(l => `# ${l.title} (${l.minutes} min)\n\n${l.content}\n\n**Exercise:** ${l.exercise}\n`).join('\n---\n\n'));
    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name.replace(/\W+/g, '-').toLowerCase()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const chatContext = JSON.stringify({
    stage: STAGES[stage].id,
    idea: project.idea,
    app: project.understanding && { name: project.understanding.appName, summary: project.understanding.summary, features: project.understanding.features },
    plan: project.plan && { screens: project.plan.screens.map(s => s.name), stack: project.plan.techStack.map(t => t.name) },
    code: project.build?.code,
  });

  const current = STAGES[stage].id;

  return (
    <div className="flex flex-col h-screen overflow-hidden text-white bg-[#0a0a0f]">
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 glass z-50">
        <div className="flex items-center gap-3 min-w-0">
          <Code2 className="text-indigo-500 shrink-0" size={24} />
          <h1 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200 whitespace-nowrap">
            Lunor App Studio
          </h1>
          <div className="h-4 w-px bg-white/20 mx-2" />
          <span className="text-sm text-gray-400 font-medium truncate">{project.understanding?.appName ?? 'Untitled app'}</span>
          {status && (
            <span className={clsx('ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap',
              status.live ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10' : 'text-amber-300 border-amber-500/40 bg-amber-500/10')}
              title={status.live ? 'Live AI' : 'No API key set — using built-in demo responses'}>
              {status.live ? `● Live · ${status.model}` : '● Demo mode'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10" title="Explanations, comments and lessons adapt to this level">
            <GraduationCap size={16} className="text-pink-400" />
            <select value={project.idea.level} onChange={e => setLevel(e.target.value as Level)} className="bg-transparent text-sm text-white outline-none cursor-pointer">
              {(['Beginner', 'Intermediate', 'Pro'] as Level[]).map(l => <option key={l} className="bg-gray-900" value={l}>{l}</option>)}
            </select>
          </div>
          <button onClick={exportZip} disabled={!project.understanding}
            className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors px-4 py-1.5 rounded-full border border-white/10">
            <Download size={16} /> Export ZIP
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-60 border-r border-white/10 glass-card flex flex-col z-40 shrink-0">
          <div className="p-6 text-xs uppercase tracking-widest text-gray-500 font-semibold">Development Flow</div>
          <div className="flex-1 px-4 space-y-2">
            {STAGES.map((s, idx) => {
              const Icon = s.icon;
              const active = stage === idx;
              const unlocked = idx <= reached && !loading;
              return (
                <button key={s.id} onClick={() => go(idx)} disabled={!unlocked}
                  className={clsx('w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative text-left',
                    active ? 'bg-indigo-500/20 border border-indigo-500/50 text-white'
                      : unlocked ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 cursor-not-allowed')}>
                  <div className={clsx('p-1.5 rounded-lg', active ? 'bg-indigo-500 text-white' : idx <= reached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5')}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{s.label}</div>
                    <div className="text-[11px] text-gray-500">{s.hint}</div>
                  </div>
                  {active && <motion.div layoutId="active-indicator" className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.8)]" />}
                </button>
              );
            })}
          </div>
          {reached > 0 && (
            <button onClick={() => { setProject(p => ({ ...initialProject, idea: { ...initialProject.idea, level: p.idea.level } })); setStage(0); setReached(0); }}
              className="m-4 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-white py-2 rounded-lg hover:bg-white/5">
              <RotateCcw size={12} /> Start a new app
            </button>
          )}
        </aside>

        <main className="flex-1 relative flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_70%)]">
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-500/15 border border-red-500/40 text-red-200 text-sm px-4 py-2 rounded-xl max-w-xl">
              <AlertCircle size={16} className="shrink-0" /> {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-white">✕</button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div key={loading ? 'loading' : stage}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
              className="flex-1 h-full overflow-y-auto">
              {loading ? <Thinking stage={loading} /> : (
                <>
                  {current === 'prompt' && <Stage1Prompt idea={project.idea} setIdea={idea => setProject(p => ({ ...p, idea }))} onNext={() => advance(1)} />}
                  {current === 'understand' && project.understanding && (
                    <Stage2Understand u={project.understanding} answers={project.answers}
                      setAnswer={(i, a) => setProject(p => ({ ...p, answers: { ...p.answers, [i]: a } }))} onNext={() => advance(2)} />
                  )}
                  {current === 'plan' && project.plan && <Stage3Plan plan={project.plan} framework={project.idea.framework} onNext={() => advance(3)} />}
                  {current === 'build' && project.build && (
                    <Stage4Build build={project.build} framework={project.idea.framework} onModify={modify}
                      onNext={() => (project.explanation ? go(4) : advance(4))} />
                  )}
                  {current === 'explain' && project.explanation && (
                    <Stage5Explain ex={project.explanation} onNext={() => (project.learning ? go(5) : advance(5))} />
                  )}
                  {current === 'learn' && project.learning && <Stage6Learn learning={project.learning} onChallenge={modify} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className={clsx('border-l border-white/10 glass-card flex flex-col transition-all duration-300 z-40 shrink-0', chatOpen ? 'w-80' : 'w-12')}>
          {chatOpen ? (
            <MentorChat onClose={() => setChatOpen(false)} stage={current} context={chatContext} appName={project.understanding?.appName} />
          ) : (
            <button onClick={() => setChatOpen(true)} className="w-full h-full flex flex-col items-center pt-6 text-gray-400 hover:text-white hover:bg-white/5 transition-colors gap-4">
              <MessageSquare size={20} />
              <div className="[writing-mode:vertical-rl] text-xs tracking-widest uppercase">Ask Lunor AI</div>
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
