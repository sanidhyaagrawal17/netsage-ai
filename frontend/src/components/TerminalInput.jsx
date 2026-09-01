import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Play, Bot, Trash2, Copy, Wifi, WifiOff, Clipboard, HelpCircle, Map, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { parseCiscoPrompt } from '../lib/ciscoParser';

export default function TerminalInput() {
  const { state, dispatch } = useAppContext();
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const listenerRunning = state.isListenerRunning;
  const [lineCount, setLineCount] = useState(1);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

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

  const handleDiscoverTopology = async () => {
    if (!state.cliInput || !state.cliInput.trim()) {
      toast.info("Paste 'show cdp neighbors' or an image screenshot (Ctrl+V) first!");
      return;
    }
    setIsDiscoveringTopology(true);
    try {
      const res = await fetch('/api/topology/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cli_text: state.cliInput })
      });
      const data = await res.json();
      if (data.status === 'success' && data.topology) {
        dispatch({ type: 'SET_TOPOLOGY_NOTE', payload: data.topology });
        toast.success('Topology mapped successfully into active context!');
        dispatch({ 
          type: 'SET_COPILOT_PROMPT', 
          payload: "I just mapped a network topology. Please summarize the connected devices, subnets, and layers, and suggest a topology reference name." 
        });
      } else {
        toast.info(data.message || "No CDP neighbor output detected in buffer. Paste 'show cdp neighbors' or a diagram screenshot (Ctrl+V).");
      }
    } catch (e) {
      toast.error('Failed to discover topology from buffer');
    } finally {
      setIsDiscoveringTopology(false);
    }
  };

  const handlePaste = async (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        setIsOcrLoading(true);
        toast.info('Running OCR on pasted image...');
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/ocr', { method: 'POST', body: formData });
          const json = await res.json();
          if (json.success) {
            dispatch({ type: 'SET_CLI_INPUT', payload: state.cliInput + (state.cliInput ? '\n' : '') + json.text });
            toast.success('OCR Transcription Successful');
          } else {
            toast.error(json.text || 'OCR Failed');
          }
        } catch (err) {
          toast.error('Network error during OCR');
        } finally {
          setIsOcrLoading(false);
        }
      }
    }
  };

  const handleSelect = (e) => {
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    if (start !== end) {
      const text = state.cliInput.substring(start, end).trim();
      if (text.length > 5) {
        setSelectedText(text);
      } else {
        setSelectedText('');
      }
    } else {
      setSelectedText('');
    }
  };

  const explainSelection = () => {
    if (!selectedText) return;
    dispatch({
      type: 'SET_COPILOT_PROMPT',
      payload: `Explain this Cisco CLI snippet in plain language for a networking student:\n\n\`\`\`cisco\n${selectedText}\n\`\`\``
    });
    toast.info("Sent snippet to NetSage Copilot");
  };

  const copyToClipboard = () => {
    if (!state.cliInput) return;
    navigator.clipboard.writeText(state.cliInput);
    toast.success('CLI buffer copied to clipboard');
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        dispatch({ type: 'SET_CLI_INPUT', payload: text });
        toast.success('Pasted from clipboard');
      }
    } catch (e) {
      toast.error('Could not access clipboard');
    }
  };

  const [isTogglingListener, setIsTogglingListener] = useState(false);
  const toggleListener = async () => {
    if (isTogglingListener) return;
    setIsTogglingListener(true);
    try {
      const res = await fetch('/api/listener/toggle', { method: 'POST' });
      const data = await res.json();
      const isRunning = data.status === 'started' || !!data.running;
      dispatch({ type: 'SET_LISTENER_RUNNING', payload: isRunning });
      toast.success(isRunning ? 'Packet Tracer Clipboard Listener active' : 'Clipboard Listener stopped');
    } catch (e) {
      toast.error('Failed to toggle listener: ' + e.message);
    } finally {
      setIsTogglingListener(false);
    }
  };

  const [isDiscoveringTopology, setIsDiscoveringTopology] = useState(false);

  const discoverTopology = async () => {
    if (!state.cliInput.trim()) {
      toast.error('Paste "show cdp neighbors" output first!');
      return;
    }
    setIsDiscoveringTopology(true);
    try {
      const res = await fetch('/api/topology/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cli_text: state.cliInput })
      });
      const data = await res.json();
      if (data.status === 'success' && data.topology) {
        dispatch({ type: 'SET_TOPOLOGY_NOTE', payload: data.topology });
        toast.success('Topology discovered successfully!');
      } else {
        toast.error('No CDP neighbors found in the input.');
      }
    } catch (e) {
      toast.error('Failed to discover topology');
    } finally {
      setIsDiscoveringTopology(false);
    }
  };

  const handleDiagnose = async () => {
    if (!state.cliInput || state.cliInput.trim().length === 0 || state.cliInput.startsWith('# Waiting')) {
      toast.error('Please paste Cisco IOS CLI output first');
      return;
    }

    setIsDiagnosing(true);
    dispatch({ type: 'SET_AI_STATUS', payload: 'rules' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'tab-diagnosis' });
    dispatch({ type: 'SET_DIAGNOSIS', payload: null });
    dispatch({ type: 'SET_STREAMED_RAW', payload: '' });

    const promptDetails = parseCiscoPrompt(state.cliInput);

    try {
      const res = await fetch('/api/diagnose/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: 'LIVE-PT-SESSION',
          symptom: 'Capturing live network anomaly from your active Cisco Packet Tracer terminal...',
          topology_note: `CLI Context: ${promptDetails.mode}\nLast Prompt: ${promptDetails.prompt}`,
          show_outputs: state.cliInput,
          osi_layer: 'Network',
          model_name: state.currentModel,
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
          const diagnosisPayload = { case_id: 'LIVE-PT-SESSION', deterministic_findings: currentFindings, diagnosis: finalData };
          dispatch({ type: 'SET_DIAGNOSIS', payload: diagnosisPayload });
          dispatch({ type: 'SET_STREAMED_RAW', payload: '' });

          // Auto-save to Diagnosis History
          dispatch({
            type: 'ADD_HISTORY_ENTRY',
            payload: {
              id: 'diag-' + Date.now(),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              date: new Date().toLocaleDateString(),
              caseId: finalData?.case_id || 'LIVE-PT-SESSION',
              rootCause: finalData?.root_cause || 'Network Anomaly Detected',
              osiLayer: finalData?.osi_layer || 'Network',
              confidence: Math.round((finalData?.confidence_score || 0.95) * 100),
              fixSteps: finalData?.fix_steps || [],
              cliEvidence: finalData?.cli_evidence_quote || '',
              cliInput: state.cliInput,
              modelUsed: state.currentModel,
              approved: false,
              diagnosisObj: diagnosisPayload,
            }
          });

          toast.success('Diagnostic analysis complete');
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
            <h1 className="text-lg font-semibold tracking-tight text-foreground">CLI Capture</h1>
            <p className="text-sm text-muted-foreground">Paste Cisco IOS output or enable the clipboard listener.</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedText && (
              <Button
                variant="outline"
                size="sm"
                onClick={explainSelection}
                className="gap-1.5 rounded-xl text-xs h-8 bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20"
              >
                <HelpCircle size={13} />
                <span>Explain Selected Snippet</span>
              </Button>
            )}
            <Button
              variant={listenerRunning ? "default" : "outline"}
              size="sm"
              onClick={toggleListener}
              className={cn("gap-2 rounded-xl text-xs h-8", listenerRunning && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20")}
            >
              {listenerRunning ? <Wifi size={13} /> : <WifiOff size={13} />}
              {listenerRunning ? 'Listener Active' : 'Start Listener'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDiscoverTopology}
              disabled={isDiscoveringTopology || state.isCopilotStreaming}
              className="gap-2 rounded-xl text-xs h-8 hover:bg-emerald-600/20 text-emerald-500 border-emerald-500/30"
            >
              <Map size={13} />
              {isDiscoveringTopology ? 'Mapping Topology...' : state.isCopilotStreaming ? 'Copilot Analyzing...' : 'Map Topology'}
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
              onSelect={handleSelect}
              onScroll={handleScroll}
              onPaste={handlePaste}
              placeholder={isOcrLoading ? "Extracting text from image via OCR..." : "Paste your Cisco IOS CLI output or an image screenshot here..."}
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
          <Button onClick={handleDiagnose} disabled={isDiagnosing || isWaiting} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-600/20">
            <Play size={14} />
            {isDiagnosing ? 'Analyzing...' : 'Run Diagnostic Engine'}
          </Button>
        </div>
      </div>
    </section>
  );
}
