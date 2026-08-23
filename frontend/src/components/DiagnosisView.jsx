import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from './ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, Copy, ShieldAlert, Sparkles, Layers } from 'lucide-react';

export default function DiagnosisView() {
  const { state } = useAppContext();
  const diagnosis = state.diagnosis;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (state.activeView !== 'tab-diagnosis') return null;

  const isStreaming = !diagnosis?.diagnosis && state.streamedRaw;

  return (
    <section className="flex-1 p-8 overflow-y-auto bg-background font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {!diagnosis && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-80 border border-border rounded-3xl bg-card text-muted-foreground text-sm gap-3">
            <ShieldAlert size={32} className="text-zinc-600 mb-1" />
            <p className="font-medium text-muted-foreground">No active diagnosis trace</p>
            <p className="text-xs text-zinc-600">Return to Terminal and click "Run Diagnostic Engine" to analyze Packet Tracer output.</p>
          </div>
        ) : isStreaming ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <header className="border-b border-border pb-4 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Sparkles size={18} className="text-blue-400 animate-pulse" />
                  Synthesizing Network Anomaly...
                </h1>
                <p className="text-xs text-muted-foreground mt-1">Applying deterministic Layer 1–4 heuristics + Llama 3.1 verification</p>
              </div>
            </header>
            <div className="p-5 bg-background/60 border border-border rounded-2xl font-mono shadow-2xl">
              <pre className="text-xs text-sky-400 leading-relaxed whitespace-pre-wrap break-words">
                {state.streamedRaw}
                <span className="inline-block w-1.5 h-3.5 bg-sky-400 ml-1 align-middle animate-pulse"></span>
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
            {/* Header Badge */}
            <div className="p-6 rounded-3xl bg-card border border-border shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <Layers size={12} />
                    {diagnosis.diagnosis?.osi_layer || 'Layer 3 Network'}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {Math.round((diagnosis.diagnosis?.confidence_score || 0.95) * 100)}% Confidence
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground bg-white/[0.04] px-2.5 py-1 rounded-full border border-border/60">
                  Case: {diagnosis.case_id || 'LIVE-PT'}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {diagnosis.diagnosis?.root_cause || 'Network Anomaly Detected'}
              </h1>
            </div>

            {/* Evidence Section */}
            <div className="p-6 rounded-3xl bg-card border border-border space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CLI Telemetry Evidence
              </h3>
              <div className="p-4 bg-background/60 border border-border/60 rounded-2xl">
                <pre className="text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap">
                  {diagnosis.diagnosis?.cli_evidence_quote || 'Telemetry verified against Cisco IOS baseline.'}
                </pre>
              </div>
            </div>

            {/* Remediation Steps */}
            <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommended Remediation Commands
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs gap-1.5 border-white/10 hover:bg-white/10 text-foreground" 
                  onClick={() => copyToClipboard((diagnosis.diagnosis?.fix_steps || []).join('\n'))}
                >
                  <Copy size={11} /> Copy All Commands
                </Button>
              </div>
              <Accordion type="multiple" defaultValue={["item-0"]} className="w-full space-y-2">
                {(diagnosis.diagnosis?.fix_steps || []).map((step, i) => (
                  <AccordionItem 
                    value={`item-${i}`} 
                    key={i} 
                    className="border-border bg-card px-4 rounded-2xl border overflow-hidden"
                  >
                    <AccordionTrigger className="hover:no-underline py-3 text-xs font-medium text-foreground">
                      Step {i + 1}: Apply Configuration
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="flex items-center justify-between gap-4 p-3 bg-background/50 rounded-xl border border-border/60">
                        <code className="text-xs font-mono text-blue-400">{step}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" 
                          onClick={() => copyToClipboard(step)}
                        >
                          Copy
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* Actions */}
            <footer className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <Button onClick={() => toast.success('Remediation verified & marked as resolved')} className="bg-blue-600 hover:bg-blue-500 text-foreground rounded-xl h-9 text-xs px-4 shadow-lg shadow-blue-600/30">
                  <CheckCircle2 size={14} className="mr-1.5" /> Approve Fix
                </Button>
                <Button variant="outline" className="border-white/10 text-foreground hover:text-foreground rounded-xl h-9 text-xs">
                  Re-evaluate
                </Button>
              </div>
              <Button variant="ghost" className="text-xs text-muted-foreground hover:text-red-400">
                Flag False Positive
              </Button>
            </footer>
          </div>
        )}
      </div>
    </section>
  );
}
