import { useEffect, useId, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict', suppressErrorRendering: true });

/** Repair common LLM Mermaid mistakes: code fences, escaped newlines, unquoted labels with special characters. */
function cleanMermaid(src: string): string {
  let s = src.replace(/```(?:mermaid)?/g, '').replace(/\\n/g, '\n').trim();
  if (/^(graph|flowchart)\b/.test(s)) {
    // Quote node labels: A[Home (tab)] -> A["Home (tab)"], also for (), {} shapes
    // Single left-to-right pass so text inside an already-quoted label is never re-matched.
    const q = (l: string) => `"${l.replace(/"/g, "'").trim()}"`;
    s = s.replace(
      /"[^"\n]*"|(\b[\w-]+)\s*(?:\[(?!")([^\]\n]*)\]|\{(?!")([^}\n]*)\}|\((?!")([^)\n]*)\))/g,
      (m, id, sq, cu, pa) =>
        id === undefined ? m // an already-quoted string: leave untouched
        : sq !== undefined ? `${id}[${q(sq)}]` : cu !== undefined ? `${id}{${q(cu)}}` : pa !== undefined ? `${id}(${q(pa)})` : m,
    );
    // Quote edge labels: -->|Go to (x)| B
    s = s.replace(/\|([^|\n"]+)\|/g, (_m, label) => `|"${label.trim()}"|`);
  }
  return s;
}

export function StageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-400 mt-1">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function NextButton({ onClick, children, loading }: { onClick: () => void; children: ReactNode; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="shrink-0 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white px-5 py-2 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 group"
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : null}
      {children}
      {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
    </button>
  );
}

export function Card({ title, icon, color = 'text-indigo-300', children, delay = 0, className = '' }: {
  title: string; icon: ReactNode; color?: string; children: ReactNode; delay?: number; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-white/5 border border-white/10 rounded-2xl p-6 ${className}`}
    >
      <h3 className={`flex items-center gap-2 text-lg font-semibold mb-4 ${color}`}>{icon} {title}</h3>
      {children}
    </motion.div>
  );
}

export function MD({ children }: { children: string }) {
  return <div className="prose-lunor text-sm leading-relaxed text-gray-300"><Markdown>{children}</Markdown></div>;
}

export function Mermaid({ chart }: { chart: string }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try the cleaned chart first, then the raw one, before giving up.
      for (const candidate of [cleanMermaid(chart), chart]) {
        try {
          if (!(await mermaid.parse(candidate, { suppressErrors: true }))) continue;
          const r = await mermaid.render(id, candidate);
          if (!cancelled) { setSvg(r.svg); setFailed(false); }
          return;
        } catch {
          document.getElementById('d' + id)?.remove(); // mermaid leaves a temp node behind on failure
        }
      }
      if (!cancelled) setFailed(true);
    })();
    return () => { cancelled = true; };
  }, [chart, id]);
  if (failed)
    return (
      <div className="w-full">
        <div className="text-xs text-amber-300 mb-2">Couldn't draw this diagram, so here is its source:</div>
        <pre className="text-xs text-gray-400 whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  return <div className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

const MESSAGES: Record<string, string[]> = {
  understand: ['Reading your idea…', 'Identifying target users…', 'Prioritising features (MoSCoW)…', 'Spotting risks & open questions…'],
  plan: ['Designing screen flow…', 'Modelling your data…', 'Choosing the tech stack…', 'Breaking work into milestones…'],
  build: ['Scaffolding screens…', 'Writing components…', 'Wiring up state & storage…', 'Adding teaching comments…'],
  explain: ['Reading your code…', 'Finding the key concepts…', 'Writing explanations for your level…'],
  learn: ['Designing your curriculum…', 'Writing lessons from your own code…', 'Creating quiz questions…'],
};

export function Thinking({ stage }: { stage: string }) {
  const msgs = MESSAGES[stage] ?? ['Thinking…'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % msgs.length), 2200);
    return () => clearInterval(t);
  }, [msgs.length]);
  return (
    <div className="h-full flex flex-col items-center justify-center gap-6 text-center p-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.5)]">
          <Loader2 className="animate-spin" size={32} />
        </div>
      </div>
      <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-lg text-indigo-200">
        {msgs[i]}
      </motion.div>
      <div className="text-xs text-gray-500">Lunor AI is working on the <b className="text-gray-300">{stage}</b> stage</div>
    </div>
  );
}
