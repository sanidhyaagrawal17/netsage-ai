import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, ShieldCheck, Activity, BrainCircuit, Users } from 'lucide-react';
import { Button } from './ui/button';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

export default function AuditView() {
  const { state } = useAppContext();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (state.activeView === 'tab-audit') {
      fetch('/api/audit')
        .then(res => res.json())
        .then(json => {
          if (json.exists) {
            setData(json.records);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [state.activeView]);

  if (state.activeView !== 'tab-audit') return null;

  // Calculate Metrics
  const totalCases = data.length;
  
  // Severity Distribution
  const severityCount = data.reduce((acc, row) => {
    acc[row.severity] = (acc[row.severity] || 0) + 1;
    return acc;
  }, {});
  const severityData = Object.keys(severityCount).map(key => ({ name: key, value: severityCount[key] }));

  // Human Agreement (Decision)
  const decisionCount = data.reduce((acc, row) => {
    acc[row.decision] = (acc[row.decision] || 0) + 1;
    return acc;
  }, {});
  const decisionData = Object.keys(decisionCount).map(key => ({ name: key, count: decisionCount[key] }));

  // Latency over time
  const latencyData = data.map((row, idx) => ({
    name: Case ,
    latency: row.inference_time_ms
  }));

  const handleExport = () => {
    window.open('/api/audit', '_blank'); // Temporary simple export, backend would need a CSV export endpoint, but we can just use the raw file
    // To do it properly on frontend:
    const csvContent = "data:text/csv;charset=utf-8," + Object.keys(data[0]).join(",") + "\n" + data.map(e => Object.values(e).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "responsible_ai_log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
        <header className="border-b border-border pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="text-blue-400" size={28} /> Responsible AI Audit
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Transparency logs, HITL validation, and safety telemetry.</p>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2" disabled={loading || totalCases === 0}>
            <Download size={16} /> Export CSV
          </Button>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground">
            Loading telemetry...
          </div>
        ) : totalCases === 0 ? (
          <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-xl bg-muted/20 text-muted-foreground">
            Audit logs are currently empty. Run a diagnosis to populate.
          </div>
        ) : (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel p-6 rounded-xl border border-border">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <Activity size={18} /> <h3 className="font-semibold text-sm">Total Inferences</h3>
                </div>
                <p className="text-4xl font-bold">{totalCases}</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-border">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <BrainCircuit size={18} /> <h3 className="font-semibold text-sm">Avg Latency</h3>
                </div>
                <p className="text-4xl font-bold">
                  {(data.reduce((sum, row) => sum + row.inference_time_ms, 0) / totalCases / 1000).toFixed(2)}s
                </p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-border">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <Users size={18} /> <h3 className="font-semibold text-sm">Human Acceptance Rate</h3>
                </div>
                <p className="text-4xl font-bold text-emerald-400">
                  {((decisionCount['Accepted'] || 0) / totalCases * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* HITL Agreement */}
              <div className="glass-panel p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-6">Human-in-the-Loop Decisions</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={decisionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#888" />
                      <YAxis stroke="#888" allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Severity Distribution */}
              <div className="glass-panel p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-6">Fault Severity Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Latency Chart */}
            <div className="glass-panel p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-6">Inference Latency Profile</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="name" stroke="#888" hide={true} />
                      <YAxis stroke="#888" />
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
            </div>

          </div>
        )}
      </div>
    </section>
  );
}
