import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import type { Idea } from '../types';

const EXAMPLES = [
  'Habit tracker with daily streaks',
  'Expense splitter for roommates',
  'Recipe finder from pantry items',
  'Workout log with rest timer',
  'Flashcard study app with spaced repetition',
];

export default function Stage1Prompt({ idea, setIdea, onNext }: { idea: Idea; setIdea: (i: Idea) => void; onNext: () => void }) {
  return (
    <div className="min-h-full w-full max-w-4xl mx-auto p-8 flex flex-col justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-4">
          <Sparkles size={14} /> Prompt → Understand → Plan → Build → Explain → Learn
        </div>
        <h2 className="text-4xl font-bold mb-4">What app do you want to build?</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Describe your idea in plain language. Lunor won't just generate code. It will analyse the idea with you, plan the
          architecture, build a working preview, walk you through every line, and turn your own app into a course.
        </p>
      </motion.div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
        <textarea
          value={idea.prompt}
          onChange={e => setIdea({ ...idea, prompt: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && idea.prompt.trim()) onNext(); }}
          placeholder="e.g. An app that tracks daily water intake and sends reminders…"
          className="w-full h-36 bg-transparent text-xl outline-none resize-none placeholder-gray-600"
        />

        <div className="flex flex-wrap gap-2 mb-5 border-t border-white/10 pt-4 mt-2">
          {EXAMPLES.map(chip => (
            <button key={chip} onClick={() => setIdea({ ...idea, prompt: chip })}
              className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 transition-colors text-gray-300">
              {chip}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-5">
            <Segmented label="Platform" value={idea.platform} options={['iOS', 'Android', 'Both'] as const} onChange={platform => setIdea({ ...idea, platform })} />
            <Segmented label="Framework" value={idea.framework} options={['React Native', 'Flutter', 'SwiftUI'] as const} onChange={framework => setIdea({ ...idea, framework })} />
            <Segmented label="I am a" value={idea.level} options={['Beginner', 'Intermediate', 'Pro'] as const} onChange={level => setIdea({ ...idea, level })} />
          </div>
          <button onClick={onNext} disabled={!idea.prompt.trim()}
            className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/20 group">
            Analyze Idea <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-gray-600 mt-4">Tip: Ctrl + Enter to analyze</p>
    </div>
  );
}

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      <div className="flex bg-black/40 rounded-lg p-1">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={clsx('px-3 py-1 rounded-md text-xs font-medium transition-colors', value === o ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white')}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
