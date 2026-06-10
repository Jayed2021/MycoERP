import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, AlertTriangle, Scissors, ClipboardList, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageLoader } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { getBatchTypeLabel, formatDate } from '../lib/utils';

const REPORT_TABS = [
  { key: 'pipeline', label: 'Production Pipeline', icon: Layers },
  { key: 'tasks', label: 'Task Performance', icon: ClipboardList },
  { key: 'harvest', label: 'Harvest Report', icon: Scissors },
  { key: 'contamination', label: 'Contamination', icon: AlertTriangle },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [loading, setLoading] = useState(false);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [taskData, setTaskData] = useState<any>(null);
  const [harvestData, setHarvestData] = useState<any[]>([]);
  const [contaminationData, setContaminationData] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchReport(); }, [activeTab, dateFrom, dateTo]);

  async function fetchReport() {
    setLoading(true);
    try {
      if (activeTab === 'pipeline') {
        const { data } = await supabase.from('batches').select('batch_type, status, health_status, quantity').not('status', 'in', '("Closed","Discarded","Spent")');
        const byType: Record<string, any> = {};
        for (const b of data ?? []) {
          if (!byType[b.batch_type]) byType[b.batch_type] = { type: b.batch_type, count: 0, units: 0, contaminated: 0 };
          byType[b.batch_type].count++;
          byType[b.batch_type].units += b.quantity ?? 0;
          if (['Contaminated', 'Partially Contaminated'].includes(b.health_status)) byType[b.batch_type].contaminated++;
        }
        setPipelineData(Object.values(byType));
      } else if (activeTab === 'tasks') {
        const { data } = await supabase.from('tasks').select('status, priority, assigned_to, due_at, assignee:profiles!tasks_assigned_to_fkey(full_name)').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
        const total = data?.length ?? 0;
        const completed = data?.filter(t => ['Completed', 'Approved'].includes(t.status)).length ?? 0;
        const overdue = data?.filter(t => !['Completed', 'Approved', 'Cancelled'].includes(t.status) && new Date(t.due_at) < new Date()).length ?? 0;
        const rejected = data?.filter(t => t.status === 'Rejected').length ?? 0;
        const byWorker: Record<string, any> = {};
        for (const t of data ?? []) {
          const name = (t as any).assignee?.full_name ?? 'Unassigned';
          if (!byWorker[name]) byWorker[name] = { name, total: 0, completed: 0, overdue: 0 };
          byWorker[name].total++;
          if (['Completed', 'Approved'].includes(t.status)) byWorker[name].completed++;
          if (!['Completed', 'Approved', 'Cancelled'].includes(t.status) && new Date(t.due_at) < new Date()) byWorker[name].overdue++;
        }
        setTaskData({ total, completed, overdue, rejected, rate: total > 0 ? Math.round(completed / total * 100) : 0, byWorker: Object.values(byWorker).sort((a: any, b: any) => b.total - a.total) });
      } else if (activeTab === 'harvest') {
        const { data } = await supabase.from('harvests').select('*, species:species(name), strain:strains(strain_code)').gte('harvested_at', dateFrom).lte('harvested_at', dateTo + 'T23:59:59').order('harvested_at', { ascending: false });
        setHarvestData(data ?? []);
      } else if (activeTab === 'contamination') {
        const { data } = await supabase.from('contamination_reports').select('severity, suspected_cause, batch_type, status, affected_quantity').gte('created_at', dateFrom).lte('created_at', dateTo + 'T23:59:59');
        const byCause: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        let totalUnits = 0;
        for (const r of data ?? []) {
          byCause[r.suspected_cause ?? 'Unknown'] = (byCause[r.suspected_cause ?? 'Unknown'] ?? 0) + 1;
          bySeverity[r.severity] = (bySeverity[r.severity] ?? 0) + 1;
          totalUnits += r.affected_quantity ?? 0;
        }
        setContaminationData({ total: data?.length ?? 0, totalUnits, byCause, bySeverity });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Production analytics and performance metrics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {REPORT_TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${activeTab === tab.key ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date filter for time-based reports */}
      {activeTab !== 'pipeline' && (
        <div className="flex gap-3 mb-5 items-center">
          <label className="text-sm text-gray-500">From:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          <label className="text-sm text-gray-500">To:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
        </div>
      )}

      {loading ? <PageLoader /> : (
        <>
          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Active Production by Stage</h2>
                </div>
                {pipelineData.length === 0 ? (
                  <p className="text-sm text-gray-400 px-5 py-8">No active batches.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-5 py-3">Stage</th>
                        <th className="text-right px-3 py-3">Batches</th>
                        <th className="text-right px-3 py-3">Total Units</th>
                        <th className="text-right px-3 py-3">Contaminated</th>
                        <th className="text-right px-3 py-3">% Contaminated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pipelineData.map(row => (
                        <tr key={row.type} className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium text-gray-900">{getBatchTypeLabel(row.type)}</td>
                          <td className="px-3 py-3 text-right">{row.count}</td>
                          <td className="px-3 py-3 text-right">{row.units.toFixed(0)}</td>
                          <td className="px-3 py-3 text-right text-red-500">{row.contaminated}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={row.contaminated > 0 ? 'text-red-500' : 'text-emerald-600'}>
                              {row.count > 0 ? Math.round(row.contaminated / row.count * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && taskData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Total Tasks', value: taskData.total, color: 'text-gray-900' },
                  { label: 'Completed', value: taskData.completed, color: 'text-emerald-700' },
                  { label: 'Overdue', value: taskData.overdue, color: 'text-red-600' },
                  { label: 'Rejected', value: taskData.rejected, color: 'text-orange-600' },
                  { label: 'Completion Rate', value: `${taskData.rate}%`, color: taskData.rate >= 80 ? 'text-emerald-700' : 'text-red-600' },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Performance by Worker</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Worker</th>
                      <th className="text-right px-3 py-3">Total</th>
                      <th className="text-right px-3 py-3">Completed</th>
                      <th className="text-right px-3 py-3">Overdue</th>
                      <th className="text-right px-3 py-3">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {taskData.byWorker.map((w: any) => (
                      <tr key={w.name} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-900">{w.name}</td>
                        <td className="px-3 py-3 text-right">{w.total}</td>
                        <td className="px-3 py-3 text-right text-emerald-700">{w.completed}</td>
                        <td className="px-3 py-3 text-right text-red-500">{w.overdue}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={w.total > 0 && w.completed / w.total >= 0.8 ? 'text-emerald-600 font-medium' : 'text-gray-600'}>
                            {w.total > 0 ? Math.round(w.completed / w.total * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'harvest' && (
            <div className="space-y-4">
              {harvestData.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Gross (kg)', value: harvestData.reduce((s, h) => s + h.gross_weight, 0).toFixed(2) },
                    { label: 'Grade A (kg)', value: harvestData.reduce((s, h) => s + h.grade_a_weight, 0).toFixed(2) },
                    { label: 'Grade B (kg)', value: harvestData.reduce((s, h) => s + h.grade_b_weight, 0).toFixed(2) },
                    { label: 'Waste (kg)', value: harvestData.reduce((s, h) => s + h.waste_weight, 0).toFixed(2) },
                  ].map(c => (
                    <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                      <p className="text-2xl font-bold text-gray-900">{c.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Harvest Records ({harvestData.length})</h2>
                </div>
                {harvestData.length === 0 ? <p className="text-sm text-gray-400 px-5 py-8">No harvests in this period.</p> : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase">
                        <th className="text-left px-5 py-3">Code</th>
                        <th className="text-left px-3 py-3">Species</th>
                        <th className="text-center px-3 py-3">Flush</th>
                        <th className="text-right px-3 py-3">Net (kg)</th>
                        <th className="text-right px-3 py-3">Grade A</th>
                        <th className="text-left px-3 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {harvestData.map(h => (
                        <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-5 py-3 font-medium">{h.harvest_code}</td>
                          <td className="px-3 py-3 text-gray-600">{(h as any).species?.name ?? '—'}</td>
                          <td className="px-3 py-3 text-center">#{h.flush_number}</td>
                          <td className="px-3 py-3 text-right font-medium">{(h.grade_a_weight + h.grade_b_weight).toFixed(2)}</td>
                          <td className="px-3 py-3 text-right text-emerald-700">{h.grade_a_weight.toFixed(2)}</td>
                          <td className="px-3 py-3 text-gray-500">{formatDate(h.harvested_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === 'contamination' && contaminationData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Reports</p>
                  <p className="text-2xl font-bold text-gray-900">{contaminationData.total}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 mb-1">Total Affected Units</p>
                  <p className="text-2xl font-bold text-red-600">{contaminationData.totalUnits}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-900 mb-3">By Severity</h2>
                  <div className="space-y-2">
                    {Object.entries(contaminationData.bySeverity).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([sev, count]) => (
                      <div key={sev} className="flex items-center gap-2">
                        <StatusBadge label={sev} type="severity" />
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (count as number) / contaminationData.total * 100)}%` }} />
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-900 mb-3">By Cause</h2>
                  <div className="space-y-2">
                    {Object.entries(contaminationData.byCause).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([cause, count]) => (
                      <div key={cause} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 text-gray-600 truncate">{cause}</span>
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, (count as number) / contaminationData.total * 100)}%` }} />
                        </div>
                        <span className="text-gray-500 w-6 text-right">{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
