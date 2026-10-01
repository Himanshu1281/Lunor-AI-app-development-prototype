import { useEffect, useRef, useState } from 'react';
import { X, Send, User, Sparkles, Code2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { post } from '../api';
import { MD } from './ui';

type Msg = { role: 'user' | 'assistant'; content: string };

const STARTERS: Record<string, string[]> = {
  prompt: ['What makes a good app idea?', 'React Native vs Flutter?'],
  understand: ['Why these must-have features?', 'What is MoSCoW?'],
  plan: ['Explain the data model', 'Why this tech stack?'],
  build: ['How does state work here?', 'How would I run this on my phone?'],
  explain: ['Explain props like I am 10', 'What is useEffect for?'],
  learn: ['What should I learn next?', 'How do I publish to the App Store?'],
};

export default function MentorChat({ onClose, stage, context, appName }: { onClose: () => void; stage: string; context: string; appName?: string }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, content: text.trim() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const { reply } = await post<{ reply: string }>('chat', { messages: next, context });
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : e}` }]);
    } finally {
      setBusy(false);
    }
  }

  const greeting = `Hi! I'm Lunor, your AI mentor${appName ? ` for **${appName}**` : ''}. You're on the **${stage}** stage. Ask me anything about it.`;

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-xl">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/20 rounded-md border border-indigo-500/30"><Sparkles size={16} className="text-indigo-400" /></div>
          <span className="font-semibold text-sm">Lunor Mentor</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-white"><X size={16} /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {[{ role: 'assistant' as const, content: greeting }, ...messages].map((msg, i) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={i}
            className={clsx('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
              msg.role === 'user' ? 'bg-white/10' : 'bg-gradient-to-br from-indigo-500 to-purple-600')}>
              {msg.role === 'user' ? <User size={14} /> : <Code2 size={14} />}
            </div>
            <div className={clsx('px-3 py-2 rounded-2xl max-w-[85%] min-w-0',
              msg.role === 'user' ? 'bg-white/10 rounded-tr-sm border border-white/5 text-sm' : 'bg-indigo-500/10 border border-indigo-500/20 rounded-tl-sm')}>
              {msg.role === 'user' ? msg.content : <MD>{msg.content}</MD>}
            </div>
          </motion.div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-gray-400 pl-11"><Loader2 size={12} className="animate-spin" /> thinking…</div>}
        {messages.length === 0 && (
          <div className="flex flex-col gap-2 pl-11">
            {(STARTERS[stage] ?? []).map(s => (
              <button key={s} onClick={() => send(s)} className="text-left text-xs text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 px-3 py-1.5 rounded-lg">{s}</button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className="relative flex items-center">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask me anything…"
            className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-4 pr-12 text-sm placeholder-gray-500 outline-none focus:border-indigo-500/50" />
          <button onClick={() => send(input)} disabled={busy} className="absolute right-2 p-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 rounded-lg"><Send size={14} /></button>
        </div>
        <div className="mt-2 text-center text-[10px] text-gray-500">Context-aware: knows your idea, plan and code</div>
      </div>
    </div>
  );
}
