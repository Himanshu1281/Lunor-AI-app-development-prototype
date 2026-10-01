import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, Circle, Play, Swords, Clock } from 'lucide-react';
import clsx from 'clsx';
import { MD, StageHeader } from './ui';
import type { Learning } from '../types';

export default function Stage6Learn({ learning, onChallenge }: { learning: Learning; onChallenge: (prompt: string) => void }) {
  const [tab, setTab] = useState<'path' | 'quiz' | 'challenges'>('path');
  const [done, setDone] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const xp = done.size * 50 + score * 20;
  const maxXp = learning.lessons.length * 50 + learning.quiz.length * 20;
  const q = learning.quiz[quizIdx];
  const finished = quizIdx >= learning.quiz.length;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === q.answer) setScore(s => s + 1);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <StageHeader title="Your Learning Path" subtitle="A mini-course built from your own app's code."
        action={
          <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
            {([['path', 'Lessons'], ['quiz', 'Quiz'], ['challenges', 'Build challenges']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={clsx('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === id ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-white')}>
                {label}
              </button>
            ))}
          </div>
        } />

      <div className="grid lg:grid-cols-3 gap-8 pb-8">
        <div className="lg:col-span-2">
          {tab === 'path' && (
            <div className="space-y-4">
              {learning.lessons.map((l, i) => {
                const isDone = done.has(i);
                const isOpen = open === i;
                return (
                  <motion.div key={l.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={clsx('rounded-2xl border backdrop-blur-sm', isOpen ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-white/5 border-white/10')}>
                    <button onClick={() => setOpen(isOpen ? -1 : i)} className="w-full flex items-start gap-4 p-4 text-left">
                      <div className={clsx('mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        isDone ? 'bg-emerald-500' : isOpen ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-gray-800 text-gray-500')}>
                        {isDone ? <CheckCircle size={16} /> : isOpen ? <Play size={14} className="ml-0.5" /> : <Circle size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold">{i + 1}. {l.title}</h4>
                          <span className="text-xs text-gray-500 flex items-center gap-1 shrink-0"><Clock size={12} />{l.minutes} min</span>
                        </div>
                        <p className="text-sm text-gray-400">{l.summary}</p>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pl-16">
                        <MD>{l.content}</MD>
                        <div className="mt-4 p-3 rounded-lg bg-black/40 border border-yellow-500/20 text-sm">
                          <span className="text-yellow-300 font-semibold">✍️ Try it: </span><span className="text-gray-300">{l.exercise}</span>
                        </div>
                        <button onClick={() => { setDone(d => new Set(d).add(i)); setOpen(i + 1); }}
                          className="mt-4 bg-indigo-500 hover:bg-indigo-400 px-4 py-1.5 rounded-lg text-sm font-medium">
                          {isDone ? 'Completed ✓' : 'Mark complete (+50 XP)'}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {tab === 'quiz' && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              {finished ? (
                <div className="text-center py-8">
                  <Trophy size={48} className="mx-auto text-yellow-400 mb-4" />
                  <h3 className="text-2xl font-bold">You scored {score} / {learning.quiz.length}</h3>
                  <button onClick={() => { setQuizIdx(0); setPicked(null); setScore(0); }} className="mt-6 text-sm text-indigo-300 hover:text-white">Retake quiz</button>
                </div>
              ) : (
                <>
                  <div className="text-indigo-400 text-sm font-bold tracking-widest uppercase mb-4">Question {quizIdx + 1} of {learning.quiz.length}</div>
                  <h3 className="text-xl font-medium leading-relaxed mb-6">{q.question}</h3>
                  <div className="space-y-3">
                    {q.options.map((opt, i) => (
                      <button key={opt} onClick={() => pick(i)}
                        className={clsx('w-full text-left p-4 rounded-xl border transition-all font-medium',
                          picked === null ? 'border-white/10 bg-black/40 hover:bg-white/10 hover:border-indigo-500/50 text-gray-300'
                            : i === q.answer ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100'
                              : i === picked ? 'border-red-500/60 bg-red-500/15 text-red-200' : 'border-white/5 bg-black/20 text-gray-500')}>
                        {opt}
                      </button>
                    ))}
                  </div>
                  {picked !== null && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 p-4 rounded-xl bg-black/40 border border-white/10">
                      <div className="font-semibold mb-1">{picked === q.answer ? '✅ Correct! +20 XP' : '❌ Not quite'}</div>
                      <p className="text-sm text-gray-300">{q.why}</p>
                      <button onClick={() => { setQuizIdx(n => n + 1); setPicked(null); }} className="mt-4 bg-indigo-500 hover:bg-indigo-400 px-4 py-1.5 rounded-lg text-sm">Next question →</button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'challenges' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Level up by extending your app. Lunor applies the change in the Build stage, then you can ask it to explain the diff.</p>
              {learning.challenges.map(c => (
                <div key={c.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                  <Swords size={20} className="text-pink-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{c.title}</h4>
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-full',
                        c.difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-300' : c.difficulty === 'Medium' ? 'bg-yellow-500/15 text-yellow-300' : 'bg-red-500/15 text-red-300')}>{c.difficulty}</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{c.prompt}</p>
                  </div>
                  <button onClick={() => onChallenge(c.prompt)} className="shrink-0 bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-lg text-sm">Build it →</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
              <Trophy size={28} />
            </div>
            <h3 className="text-xl font-bold mb-1">{xp} XP</h3>
            <p className="text-gray-400 text-sm mb-4">{done.size}/{learning.lessons.length} lessons · {score} quiz points</p>
            <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all" style={{ width: `${(xp / maxXp) * 100}%` }} />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-gray-400">
            💬 Stuck? Ask the <b className="text-white">Lunor Mentor</b> on the right. It knows your app's code and plan.
          </div>
        </div>
      </div>
    </div>
  );
}
