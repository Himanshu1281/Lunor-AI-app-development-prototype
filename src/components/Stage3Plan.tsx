import { Network, Database, FolderTree, Cpu, Smartphone, Flag } from 'lucide-react';
import { Card, Mermaid, NextButton, StageHeader } from './ui';
import type { Plan } from '../types';
import { erDiagram, flowChart } from '../diagrams';

export default function Stage3Plan({ plan, framework, onNext }: { plan: Plan; framework: string; onNext: () => void }) {
  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <StageHeader
        title="Architecture & Plan"
        subtitle={`A buildable V1 blueprint for ${framework}. Review it before any code is written.`}
        action={<NextButton onClick={onNext}>Generate Code</NextButton>}
      />

      <div className="grid lg:grid-cols-2 gap-6 pb-8">
        <div className="space-y-6">
          <Card title="Screens" icon={<Smartphone size={20} />} color="text-indigo-300">
            <div className="grid sm:grid-cols-2 gap-3">
              {plan.screens.map(s => (
                <div key={s.name} className="bg-black/30 p-3 rounded-lg border border-white/5">
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{s.purpose}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.components.map(c => <span key={c} className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-gray-300">{`<${c}/>`}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Screen Flow" icon={<Network size={20} />} color="text-purple-300" delay={0.1}>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4"><Mermaid chart={flowChart(plan) ?? ''} /></div>
          </Card>

          <Card title="Tech Stack Choices" icon={<Cpu size={20} />} color="text-cyan-300" delay={0.2}>
            <div className="space-y-3 text-sm">
              {plan.techStack.map(t => (
                <div key={t.name} className="flex gap-4 items-start border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <div className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-md font-semibold text-xs whitespace-nowrap">{t.name}</div>
                  <div className="text-gray-300">{t.why}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Data Model" icon={<Database size={20} />} color="text-emerald-300" delay={0.1}>
            <div className="bg-black/40 rounded-xl border border-white/5 p-4"><Mermaid chart={erDiagram(plan) ?? ''} /></div>
          </Card>

          <Card title="File Structure" icon={<FolderTree size={20} />} color="text-orange-300" delay={0.2}>
            <pre className="font-mono text-sm text-gray-300 bg-black/40 p-4 rounded-xl border border-white/5 leading-relaxed overflow-x-auto">{plan.fileTree}</pre>
          </Card>

          <Card title="Milestones" icon={<Flag size={20} />} color="text-pink-300" delay={0.3}>
            <ol className="space-y-4">
              {plan.milestones.map((m, i) => (
                <li key={m.title} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 text-pink-300 text-xs flex items-center justify-center shrink-0">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-sm">{m.title}</div>
                    <ul className="text-xs text-gray-400 mt-1 space-y-0.5">{m.tasks.map(t => <li key={t}>• {t}</li>)}</ul>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
