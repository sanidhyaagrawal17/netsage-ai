import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal, Code2, Bot, Brain, Loader2, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

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
    const language = match ? match[1] : '';
    const codeString = String(children).replace(/\n$/, '');

    if (!inline && (codeString.includes('\n') || language)) {
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
                  ▶
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
