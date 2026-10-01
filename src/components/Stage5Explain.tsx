import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, BookOpen, Layers } from 'lucide-react';
import clsx from 'clsx';
import { MD, NextButton, StageHeader } from './ui';
import type { Explanation } from '../types';

export default function Stage5Explain({ ex, onNext }: { ex: Explanation; onNext: () => void }) {
  const [active, setActive] = useState(0);
  const section = ex.sections[active];

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <StageHeader title="Code Walkthrough" subtitle="Step through your app's code piece by piece, in reading order."
        action={<NextButton onClick={onNext}>Start Learning</NextButton>} />

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex gap-3">
        <Layers size={20} className="text-indigo-300 shrink-0 mt-0.5" />
        <MD>{ex.overview}</MD>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 pb-8">
        <nav className="space-y-1">
          {ex.sections.map((s, i) => (
            <button key={s.title} onClick={() => setActive(i)}
              className={clsx('w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex gap-2',
                i === active ? 'bg-indigo-500/20 border border-indigo-500/40 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white')}>
              <span className="text-gray-500 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, '0')}</span>{s.title}
            </button>
          ))}
        </nav>

        <motion.div key={active} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 min-w-0">
          <pre className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-4 text-xs font-mono text-gray-200 leading-relaxed overflow-x-auto">{section.snippet}</pre>
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 text-indigo-500/10"><Lightbulb size={110} /></div>
            <div className="relative">
              <div className="text-[11px] uppercase tracking-widest text-indigo-300 mb-1">Concept: {section.concept}</div>
              <h3 className="text-xl font-bold mb-2">{section.title}</h3>
              <MD>{section.explanation}</MD>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <button disabled={active === 0} onClick={() => setActive(a => a - 1)} className="text-gray-400 hover:text-white disabled:opacity-30">← Previous</button>
            <button disabled={active === ex.sections.length - 1} onClick={() => setActive(a => a + 1)} className="text-gray-400 hover:text-white disabled:opacity-30">Next →</button>
          </div>
        </motion.div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="flex items-center gap-2 font-semibold mb-4"><BookOpen size={18} /> Concept cards</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ex.concepts.map(c => (
            <div key={c.name} className="bg-black/40 p-3 rounded-lg border border-white/5">
              <div className="text-sm font-bold">{c.name}</div>
              <div className="text-xs text-gray-500 mt-1">{c.oneLiner}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
