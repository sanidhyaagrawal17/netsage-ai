import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Copy, Check, Terminal, Code2, Bot, Brain, Loader2, Sparkles, 
  ChevronDown, ChevronRight, Network, ExternalLink 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

function TopologyCardBlock({ language, value }) {
  const { dispatch } = useAppContext();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Dynamic DSL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-zinc-950/90 to-black/90 p-4 shadow-xl overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            <Network size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Dynamic Topology Digital Twin
            </h4>
            <span className="text-[10px] font-mono text-sky-400/80">
              Graphviz DOT / React Flow DSL
            </span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => dispatch({ type: 'OPEN_TOPOLOGY_MODAL' })}
          className="h-7 px-3 text-[11px] rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 gap-1.5 shadow-sm transition-all"
        >
          <ExternalLink size={12} />
          <span>Explore in Digital Twin</span>
        </Button>
      </div>

      {/* Code Snippet */}
      <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/75 p-3 font-mono text-[11px] text-sky-300/90 max-h-40 overflow-y-auto scrollbar-mini">
        <pre className="whitespace-pre m-0 leading-relaxed">{value}</pre>
      </div>

      {/* Action Footer */}
      <div className="mt-2.5 pt-2 flex items-center justify-between text-[10px] font-mono text-zinc-500">
        <span>0 MB Extra VRAM • 60 FPS Remotion Sync</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? 'Copied DSL' : 'Copy Code'}</span>
        </button>
      </div>
    </div>
  );
}

function TopologyActionCardBlock({ value }) {
  const { dispatch } = useAppContext();
  const [executed, setExecuted] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  
  let actionData = null;
  try {
    actionData = JSON.parse(value);
  } catch (e) {
    const actionMatch = value.match(/"action":\s*"([^"]+)"/);
    const reasonMatch = value.match(/"reason":\s*"([^"]+)"/);
    if (actionMatch) {
      actionData = { action: actionMatch[1], reason: reasonMatch ? reasonMatch[1] : '' };
    }
  }

  const action = (actionData?.action || 'AUTO_HEAL').toUpperCase();
  const reason = actionData?.reason || 'Applying topological reconfiguration to Digital Twin';

  const executeMutation = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const res = await fetch('/api/topology/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(actionData?.params || {}) })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setExecuted(true);
        const msg = data.mutation_result?.message || `Executed mutation ${action}`;
        setResultMsg(msg);
        window.dispatchEvent(new CustomEvent('netsage:topology-updated', { detail: data }));
        toast.success(`Digital Twin: ${msg}`);
      } else {
        toast.error(`Mutation failed: ${data.message || 'Error'}`);
      }
    } catch (e) {
      toast.error(`Mutation error: ${e.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  useEffect(() => {
    if (actionData?.action && !executed) {
      executeMutation();
    }
  }, [actionData?.action]);

  const isHeal = action === 'AUTO_HEAL';
  const isFail = action === 'SIMULATE_FAIL';

  return (
    <div className={`my-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md overflow-hidden transition-all ${
      isFail 
        ? 'border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-zinc-950/90 to-black/90 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
        : isHeal
        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-950/90 to-black/90 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
        : 'border-sky-500/40 bg-gradient-to-br from-sky-950/40 via-zinc-950/90 to-black/90 shadow-[0_0_20px_rgba(56,189,248,0.15)]'
    }`}>
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${
            isFail 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
              : isHeal
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-sky-500/20 text-sky-400 border-sky-500/40'
          }`}>
            <Sparkles size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-foreground">
                AI Digital Twin Reconfiguration
              </h4>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isFail 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                  : isHeal
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              }`}>
                {action}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {reason}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => dispatch({ type: 'OPEN_TOPOLOGY_MODAL' })}
          className="h-7 px-3 text-[11px] rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 gap-1.5 shadow-sm transition-all"
        >
          <ExternalLink size={12} />
          <span>View in Digital Twin</span>
        </Button>
      </div>

      <div className="mt-3 pt-1 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-2">
          {executed ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <Check size={13} className="text-emerald-400" />
              <span>Applied to Live Topology & Remotion Simulator</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Loader2 size={13} className="animate-spin" />
              <span>Applying Reconfiguration...</span>
            </span>
          )}
        </div>

        <button
          onClick={executeMutation}
          disabled={isExecuting}
          className="text-xs text-zinc-400 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
        >
          {isExecuting ? 'Executing...' : 'Re-apply Mutation'}
        </button>
      </div>
    </div>
  );
}

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);
  const { state } = useAppContext();
  const isGenerating = state.aiStatus === 'streaming' || state.aiStatus === 'thinking';

  const handleCopy = () => {
    // Strip standard Cisco prompts before copying
    // Matches "Router> ", "Switch(config)# ", "Core-Router(config-if)# " etc.
    const cleanValue = value.replace(/^[a-zA-Z0-9_\-\.]+.*?[>#]\s+/gm, '');
    navigator.clipboard.writeText(cleanValue);
    setCopied(true);
    toast.success('Commands copied (prompts removed)');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-white/10 bg-black/60 overflow-hidden shadow-xl">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500/70"></span>
            <span className="w-2 h-2 rounded-full bg-yellow-500/70"></span>
            <span className="w-2 h-2 rounded-full bg-green-500/70"></span>
          </div>
          <span className="text-[10px] font-mono font-medium text-zinc-400 uppercase tracking-wider">
            {language || 'cisco ios'}
          </span>
        </div>
        {true && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 px-2 text-[10px] gap-1 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
          </Button>
        )}
      </div>

      {/* Code Body */}
      <div className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-sky-300/90 selection:bg-blue-500/30">
        <pre className="m-0 whitespace-pre">{value}</pre>
      </div>
    </div>
  );
}

const markdownPlugins = [remarkGfm];

const markdownComponents = {
  h1: ({ node, ...props }) => (
    <h1 className="text-sm font-bold text-foreground mt-2 mb-1 tracking-tight border-b border-border/40 pb-1" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-xs font-bold text-blue-400 mt-3 mb-1 tracking-tight flex items-center gap-1.5" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-2.5 mb-1" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="my-1.5 leading-relaxed text-zinc-300 last:mb-0" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold text-white" {...props} />
  ),
  em: ({ node, ...props }) => (
    <em className="text-zinc-400 italic" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="list-disc pl-5 space-y-2.5 my-3 text-zinc-200 marker:text-zinc-500" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="list-decimal pl-5 space-y-2.5 my-3 text-zinc-200 marker:text-zinc-500" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="leading-relaxed pl-1.5" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote className="border-l-2 border-blue-500/50 pl-3 my-2 text-zinc-400 italic bg-blue-500/[0.04] py-1 rounded-r-lg" {...props} />
  ),
  code({ node, inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1].toLowerCase() : '';
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && (codeString.includes('\n') || language)) {
      if (['topology-action', 'topology_action'].includes(language)) {
        return <TopologyActionCardBlock value={codeString} />;
      }
      if (['topology', 'dot', 'graphviz'].includes(language)) {
        return <TopologyCardBlock language={language} value={codeString} />;
      }
      return <CodeBlock language={language || 'cisco'} value={codeString} />;
    }

    return (
      <code
        className="px-1.5 py-0.5 rounded text-[11px] font-mono text-sky-300 bg-white/[0.08] border border-white/[0.08] mx-0.5"
        {...props}
      >
        {children}
      </code>
    );
  },
};

const ChatMessageContent = React.memo(function ChatMessageContent({ content, isUser }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap text-xs text-white leading-relaxed">{content}</p>;
  }

  // Check if thoughts are actively streaming (unclosed tag)
  const isActivelyThinking = (content.includes('<think>') && !content.includes('</think>')) || 
                             (content.includes('<thought>') && !content.includes('</thought>'));

  // Extract <thought> and <think> blocks
  const thinkRegex = /<(think|thought)>([\s\S]*?)(?:<\/\1>|$)/gi;
  const thoughts = [];
  
  const processedContent = content.replace(thinkRegex, (match, tag, innerText) => {
    thoughts.push(innerText.trim());
    return ''; // Remove from main markdown
  });

  return (
    <div className="chat-markdown text-xs leading-relaxed text-foreground space-y-2">
      {thoughts.map((thought, i) => {
        const isCurrentThoughtActive = isActivelyThinking && i === thoughts.length - 1;
        return (
          <details 
            key={i} 
            defaultOpen={isCurrentThoughtActive}
            className="mb-2.5 group rounded-lg border border-border/40 bg-muted/20 overflow-hidden transition-all duration-200"
          >
            <summary className="cursor-pointer flex items-center justify-between px-2.5 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors select-none">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/60 transition-transform group-open:rotate-90">
                  â–¶
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  {isCurrentThoughtActive ? (
                    <>
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="text-amber-400/90">Thinking...</span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Thought Process</span>
                  )}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground/50 font-mono">
                {isCurrentThoughtActive ? 'in progress' : `${(thought.split(/\s+/).length)} words`}
              </span>
            </summary>
            <div className="px-3 py-2 text-[11px] font-mono text-muted-foreground/80 border-t border-border/20 bg-background/50 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-mini">
              {thought || '...'}
            </div>
          </details>
        );
      })}

      <ReactMarkdown
        remarkPlugins={markdownPlugins}
        components={markdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default ChatMessageContent;

