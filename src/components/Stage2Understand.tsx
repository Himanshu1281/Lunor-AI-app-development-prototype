import { Target, Users, AlertTriangle, HelpCircle, CheckCircle2, Lightbulb } from 'lucide-react';
import clsx from 'clsx';
import { Card, NextButton, StageHeader } from './ui';
import type { Understanding } from '../types';

const TIERS = [
  { key: 'must', label: 'Must have', cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  { key: 'should', label: 'Should have', cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { key: 'could', label: 'Could have (later)', cls: 'bg-gray-500/10 border-gray-500/20 text-gray-400' },
] as const;

export default function Stage2Understand({ u, answers, setAnswer, onNext }: {
  u: Understanding; answers: Record<number, string>; setAnswer: (i: number, a: string) => void; onNext: () => void;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <StageHeader
        title={`Understanding "${u.appName}"`}
        subtitle={u.tagline}
        action={<NextButton onClick={onNext}>Approve & Plan</NextButton>}
      />

      <div className="grid lg:grid-cols-3 gap-6 pb-8">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Executive Summary" icon={<Target size={20} />}>
            <p className="text-gray-300 leading-relaxed text-sm">{u.summary}</p>
            <div className="mt-4 p-3 rounded-lg bg-black/30 border border-white/5 text-sm">
              <span className="text-gray-500">Core problem: </span><span className="text-gray-200">{u.problem}</span>
            </div>
          </Card>

          <Card title="MoSCoW Feature Breakdown" icon={<CheckCircle2 size={20} />} color="text-emerald-300" delay={0.1}>
            <div className="space-y-4">
              {TIERS.map(t => (
                <div key={t.key}>
                  <h4 className="text-xs uppercase text-gray-500 font-bold tracking-wider mb-2">{t.label}</h4>
                  <ul className="flex flex-wrap gap-2">
                    {u.features[t.key].map(f => <li key={f} className={clsx('border px-3 py-1 rounded-md text-xs', t.cls)}>{f}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500 flex gap-2"><Lightbulb size={14} className="shrink-0 text-yellow-400" />
              MoSCoW is how product teams scope a V1: ship the "Must haves", then iterate.</p>
          </Card>

          <Card title="Risks & Assumptions" icon={<AlertTriangle size={20} />} color="text-orange-300" delay={0.2}>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
              {u.risks.map(r => <li key={r}>{r}</li>)}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Target Personas" icon={<Users size={20} />} color="text-pink-300" delay={0.3}>
            <div className="space-y-3">
              {u.personas.map(p => (
                <div key={p.name} className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{p.description}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Clarifying Questions" icon={<HelpCircle size={20} />} delay={0.4} className="!bg-indigo-500/10 !border-indigo-500/30">
            <p className="text-xs text-gray-400 mb-4">Your answers shape the plan. The first option is Lunor's recommendation.</p>
            <div className="space-y-4 text-sm">
              {u.questions.map((q, i) => (
                <div key={q.question}>
                  <label className="block mb-2 font-medium">{q.question}</label>
                  <div className="space-y-1.5">
                    {q.options.map((o, oi) => {
                      const selected = (answers[i] ?? q.options[0]) === o;
                      return (
                        <button key={o} onClick={() => setAnswer(i, o)}
                          className={clsx('w-full text-left text-xs px-3 py-2 rounded-lg border transition-colors',
                            selected ? 'bg-indigo-500/25 border-indigo-400/60 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white')}>
                          {o}{oi === 0 && <span className="ml-2 text-[10px] text-indigo-300">recommended</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
