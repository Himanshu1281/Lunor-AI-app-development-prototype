import { useEffect, useState } from 'react';
import { SandpackProvider, SandpackCodeEditor, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { Smartphone, Wand2, Send, CheckCircle2, Bug } from 'lucide-react';
import clsx from 'clsx';
import { NextButton } from './ui';
import type { Build } from '../types';

const SUGGESTIONS = ['Add a dark mode toggle', 'Add a search bar', 'Make the design more playful', 'Add a settings screen'];

/** Shows a banner when the preview hits a compile/runtime error, with one-click AI repair. */
function ErrorFixer({ onModify }: { onModify: (instruction: string) => void }) {
  const { sandpack, listen } = useSandpack();
  const [shown, setShown] = useState<string | null>(null);
  // Some crashes only arrive as a "show-error" message from the preview, not via sandpack.error.
  useEffect(() => listen(msg => {
    if (msg.type === 'action' && msg.action === 'show-error') setShown(`${msg.title}\n${msg.message}`);
    if (msg.type === 'start') setShown(null);
  }), [listen]);
  const message = sandpack.error?.message ?? shown;
  if (!message) return null;
  return (
    <div className="flex items-start gap-3 p-3 border-t border-red-500/30 bg-red-500/10 text-sm">
      <Bug size={16} className="text-red-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-red-200 font-medium">The preview hit an error</div>
        <div className="text-xs text-red-300/80 font-mono truncate" title={message}>{message.split('\n')[0]}</div>
      </div>
      <button
        onClick={() => onModify(`The app crashes in the preview with this error:\n${message}\nFind the cause, fix it, and explain the bug in "changes".`)}
        className="shrink-0 bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs font-medium"
      >
        Fix with AI
      </button>
    </div>
  );
}

export default function Stage4Build({ build, framework, onModify, onNext }: {
  build: Build; framework: string; onModify: (instruction: string) => void; onNext: () => void;
}) {
  const [tab, setTab] = useState<'preview' | 'native'>('preview');
  const [instruction, setInstruction] = useState('');
  const submit = () => { if (instruction.trim()) onModify(instruction.trim()); };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-4 p-4 border-b border-white/10 bg-black/20">
        <div className="min-w-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400" /> Build</h2>
          <p className="text-xs text-indigo-300 truncate">{build.summary}</p>
        </div>
        <NextButton onClick={onNext}>Explain my code</NextButton>
      </div>

      <SandpackProvider
        template="react"
        theme="dark"
        files={{
          '/App.js': build.code,
          // Phone-like reset: generated apps often combine width: 100% with padding, overflowing the screen.
          '/styles.css': { code: '*, *::before, *::after { box-sizing: border-box; }\nhtml, body, #root { margin: 0; height: 100%; overflow-x: hidden; }\nbody { font-family: system-ui, -apple-system, sans-serif; }\n', hidden: true },
        }}
        key={build.code}
        options={{ recompileMode: 'delayed', recompileDelay: 600 }}
        // Sandpack renders a wrapper div; it must fill the remaining height or the editor grows unbounded.
        // (inline style, because Sandpack's own CSS overrides utility classes on this element)
        style={{ flex: 1, minHeight: 0, height: 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col border-r border-white/10 min-w-0">
            <div className="flex items-center gap-1 px-3 pt-2 bg-[#151515] border-b border-white/10">
              {([['preview', 'App.js · live'], ['native', `${framework} version`]] as const).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={clsx('px-3 py-1.5 text-xs rounded-t-md', tab === id ? 'bg-[#1e1e1e] text-white' : 'text-gray-500 hover:text-gray-300')}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {tab === 'preview' ? (
                <SandpackCodeEditor showLineNumbers showTabs={false} style={{ height: '100%', overflow: 'auto' }} />
              ) : (
                <div className="h-full overflow-auto bg-[#1e1e1e]">
                  <div className="text-xs text-gray-400 px-4 pt-3">
                    The preview runs as React in your browser. This is the same main screen written idiomatically in <b>{framework}</b>. It's what goes into the real project.
                  </div>
                  <pre className="p-4 text-xs font-mono text-gray-200 leading-relaxed">{build.nativeSnippet}</pre>
                </div>
              )}
            </div>

            <ErrorFixer onModify={onModify} />
            <div className="p-3 border-t border-white/10 bg-black/30">
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-16 overflow-y-auto">
                {(build.changes ?? []).map(c => <span key={c} className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded">✓ {c}</span>)}
              </div>
              <div className="flex items-center gap-2">
                <Wand2 size={16} className="text-indigo-400 shrink-0" />
                <input value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
                  placeholder="Describe a change… e.g. add a dark mode toggle"
                  className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500/50" />
                <button onClick={submit} disabled={!instruction.trim()} className="p-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 rounded-lg"><Send size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInstruction(s)} className="text-[11px] text-gray-400 hover:text-white bg-white/5 px-2 py-0.5 rounded-full">{s}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="w-[420px] shrink-0 bg-black/40 flex flex-col items-center justify-center p-6 relative">
            <div className="absolute top-4 left-4 flex items-center gap-2 text-xs text-gray-400 font-medium">
              <Smartphone size={14} /> Live preview (try it!)
            </div>
            <div className="w-[340px] h-[700px] max-h-[calc(100vh-190px)] bg-white rounded-[3rem] border-[12px] border-gray-900 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-gray-900 rounded-b-2xl z-50" />
              <div className="absolute inset-0 pt-5 bg-[#f8fafc]">
                <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      </SandpackProvider>
    </div>
  );
}
