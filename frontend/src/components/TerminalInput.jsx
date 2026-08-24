import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Play, Bot, Trash2, Copy, Wifi, WifiOff, Clipboard } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseCiscoPrompt } from '../lib/ciscoParser';

export default function TerminalInput() {
  const { state, dispatch } = useAppContext();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [listenerRunning, setListenerRunning] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // Sync listener status
  useEffect(() => {
    const poll = () => fetch('/api/listener/status').then(r => r.json()).then(d => setListenerRunning(d.running)).catch(() => {});
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, []);

  // Sync line numbers with textarea scroll
  useEffect(() => {
    const lines = (state.cliInput || '').split('\n').length;
    setLineCount(lines);
  }, [state.cliInput]);

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const toggleListener = async () => {
    const ep = listenerRunning ? '/api/listener/stop' : '/api/listener/start';
    try {
      const r = await fetch(ep, { method: 'POST' });
      const d = await r.json();
      const nowRunning = d.status === 'started' || d.status === 'already_running';
      setListenerRunning(nowRunning);
      toast.success(nowRunning ? 'PT Listener started — monitoring clipboard' : 'PT Listener stopped');
    } catch (e) {
      toast.error('Failed to toggle listener');
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      dispatch({ type: 'SET_CLI_INPUT', payload: text });
      toast.success('Pasted from clipboard');
    } catch {
      toast.error('Clipboard access denied');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(state.cliInput);
    toast.success('Copied to clipboard');
  };

  const handleDiagnose = async () => {
    if (!state.cliInput || state.cliInput.startsWith('# Waiting')) {
      toast.error('Please provide CLI input first.');
      return;
    }

    setIsDiagnosing(true);
    dispatch({ type: 'SET_AI_STATUS', payload: 'rules' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });
    dispatch({ type: 'SET_DIAGNOSIS', payload: null });
    dispatch({ type: 'SET_STREAMED_RAW', payload: '' });

    try {
      const res = await fetch('/api/diagnose/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: 'LIVE-PT-SESSION',
          symptom: 'Capturing live network anomaly from your active Cisco Packet Tracer terminal...',
          show_outputs: state.cliInput,
          osi_layer: 'Network',
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let currentFindings = [];
      let rawJson = '';
      let doneReading = false;

      while (!doneReading) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const event = JSON.parse(dataStr);
              if (event.type === 'findings') {
                currentFindings = event.data;
                dispatch({ type: 'SET_AI_STATUS', payload: 'thinking' });
                dispatch({ type: 'SET_DIAGNOSIS', payload: { case_id: 'LIVE-PT-SESSION', deterministic_findings: currentFindings, diagnosis: null } });
              } else if (event.type === 'token') {
                dispatch({ type: 'SET_AI_STATUS', payload: 'streaming' });
                rawJson += event.token;
                dispatch({ type: 'SET_STREAMED_RAW', payload: rawJson });
              } else if (event.type === 'done') {
                doneReading = true;
              }
            } catch (e) {
              console.error('SSE parse error', e);
            }
          }
        }
      }

      try {
        const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const finalData = JSON.parse(jsonMatch[0]);
          dispatch({ type: 'SET_DIAGNOSIS', payload: { case_id: 'LIVE-PT-SESSION', deterministic_findings: currentFindings, diagnosis: finalData } });
          dispatch({ type: 'SET_STREAMED_RAW', payload: '' });
          toast.success('Analysis complete');
        }
      } catch (e) {
        console.error('Final parse error', e);
      }
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setIsDiagnosing(false);
      dispatch({ type: 'SET_AI_STATUS', payload: 'idle' });
    }
  };

  if (state.activeView !== 'tab-input') return null;

  const isWaiting = !state.cliInput || state.cliInput.startsWith('# Waiting');
  const promptInfo = parseCiscoPrompt(state.cliInput);

  return (
    <section className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="max-w-4xl w-full mx-auto flex flex-col flex-1 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">CLI Capture</h1>
            <p className="text-sm text-muted-foreground">Paste Cisco IOS output or enable the clipboard listener.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={listenerRunning ? "default" : "outline"}
              size="sm"
              onClick={toggleListener}
              className={cn("gap-2 rounded-xl text-xs h-8", listenerRunning && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20")}
            >
              {listenerRunning ? <Wifi size={13} /> : <WifiOff size={13} />}
              {listenerRunning ? 'Listener Active' : 'Start Listener'}
            </Button>
            {!state.isCopilotOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatch({ type: 'TOGGLE_COPILOT' })}
                className="gap-1.5 rounded-xl text-xs h-8 border-white/10 hover:bg-white/[0.06] text-zinc-300 hover:text-white"
              >
                <Bot size={13} className="text-blue-400" />
                <span>Open Copilot</span>
              </Button>
            )}
          </div>
        </div>

        {/* Terminal Chrome */}
        <div className="flex-1 rounded-xl overflow-hidden border border-border bg-card shadow-sm flex flex-col min-h-0">
          {/* Title Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">cisco-ios-cli — NetSage</span>
              {listenerRunning && (
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={pasteFromClipboard}>
                <Clipboard size={12} /> Paste
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1" onClick={copyToClipboard}>
                <Copy size={12} /> Copy
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 gap-1 text-destructive hover:text-destructive" onClick={() => dispatch({ type: 'SET_CLI_INPUT', payload: '' })}>
                <Trash2 size={12} /> Clear
              </Button>
            </div>
          </div>

          {/* Editor Body with Line Numbers */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Line Numbers */}
            <div
              ref={lineNumbersRef}
              className="w-12 flex-shrink-0 bg-muted/20 border-r border-border overflow-hidden select-none pt-4 pb-4"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i} className="text-right pr-3 text-[11px] leading-[1.65rem] font-mono text-muted-foreground/50">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              className="flex-1 p-4 bg-transparent text-sm font-mono text-foreground focus:outline-none resize-none overflow-y-auto leading-[1.65rem] scrollbar-none"
              spellCheck="false"
              value={state.cliInput}
              onChange={(e) => dispatch({ type: 'SET_CLI_INPUT', payload: e.target.value })}
              onScroll={handleScroll}
              placeholder="Paste your Cisco IOS CLI output here, or start the PT Listener..."
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-muted-foreground font-mono">
            {lineCount} lines · {(state.cliInput || '').length} chars
            {promptInfo.mode !== 'Unknown' && (
              <>
                <span className="mx-2">·</span>
                <span className="text-blue-400 font-medium">{promptInfo.mode}</span>
              </>
            )}
          </span>
          <Button onClick={handleDiagnose} disabled={isDiagnosing || isWaiting} className="gap-2">
            <Play size={14} />
            {isDiagnosing ? 'Analyzing...' : 'Run Diagnostic Engine'}
          </Button>
        </div>
      </div>
    </section>
  );
}
