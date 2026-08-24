import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal, Code2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Commands copied to clipboard');
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
      </div>

      {/* Code Body */}
      <div className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-sky-300/90 selection:bg-blue-500/30">
        <pre className="m-0 whitespace-pre">{value}</pre>
      </div>
    </div>
  );
}

export default function ChatMessageContent({ content, isUser }) {
  if (isUser) {
    return <p className="whitespace-pre-wrap text-xs text-white leading-relaxed">{content}</p>;
  }

  return (
    <div className="chat-markdown text-xs leading-relaxed text-foreground space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
            <ul className="list-disc pl-4 space-y-1 my-1.5 text-zinc-300" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal pl-4 space-y-1 my-1.5 text-zinc-300" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
