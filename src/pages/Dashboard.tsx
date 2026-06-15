import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers, ClipboardList, AlertTriangle, Sprout,
  Scissors, FlaskConical, Clock, CheckCircle2, XCircle,
  ArrowRight, Activity, ScanLine, QrCode,
  Thermometer, CheckCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { navigate } from '../hooks/useRoute';
import { StatusBadge } from '../components/StatusBadge';
import { PageLoader } from '../components/LoadingSpinner';
import { formatRelativeTime, getOverdueDuration, getAlertTypeLabel, getAlertTypeColor, canManage } from '../lib/utils';
import type { Batch, Task, EnvironmentalAlert } from '../lib/types';

interface Stats {
  activeBatches: number;
  tasksDueToday: number;
  overdueTasks: number;
  criticalTasks: number;
  incubatingBatches: number;
  fruitingBatches: number;
  contaminatedThisWeek: number;
  harvestThisMonth: number;
}

const PIPELINE_STAGES = [
  { key: 'agar', label: 'Culture', icon: FlaskConical, color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { key: 'liquid_culture', label: 'LC', icon: FlaskConical, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { key: 'grain_spawn', label: 'Spawn', icon: Layers, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { key: 'substrate', label: 'Substrate', icon: Layers, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { key: 'fruiting_block', label: 'Fruiting', icon: Sprout, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [upcomingHarvest, setUpcomingHarvest] = useState<Batch[]>([]);
  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [qrStats, setQrStats] = useState({ scansToday: 0, failedToday: 0, activeQrCodes: 0 });
  const [alerts, setAlerts] = useState<EnvironmentalAlert[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        batchesRes,
        todayTasksRes,
        overdueTasksRes,
        contaminationRes,
        harvestRes,
        upcomingRes,
        qrScansRes,
        qrActiveRes,
        alertsRes,
      ] = await Promise.all([
        supabase.from('batches').select('id, batch_type, status, health_status, current_stage').not('status', 'in', '("Closed","Discarded","Spent")'),
        supabase.from('tasks').select('*, batch:batches(batch_code), assignee:profiles!tasks_assigned_to_fkey(full_name)').gte('due_at', todayStart).lt('due_at', todayEnd).not('status', 'in', '("Completed","Approved","Cancelled")').order('due_at').limit(20),
        supabase.from('tasks').select('*, batch:batches(batch_code), assignee:profiles!tasks_assigned_to_fkey(full_name)').lt('due_at', now.toISOString()).not('status', 'in', '("Completed","Approved","Cancelled")').order('due_at').limit(20),
        supabase.from('contamination_reports').select('id').gte('created_at', weekAgo),
        supabase.from('harvests').select('grade_a_weight, grade_b_weight').gte('harvested_at', monthStart),
        supabase.from('batches').select('*, species:species(name), strain:strains(strain_name), room:rooms(name)').in('status', ['Pinning', 'Ready to Harvest', 'Fruiting']).limit(10),
        supabase.from('qr_scan_logs').select('id, result').gte('scanned_at', todayStart).lt('scanned_at', todayEnd),
        supabase.from('qr_codes').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
        supabase.from('environmental_alerts').select('*, room:rooms(name), device:iot_devices(device_name)').is('resolved_at', null).order('created_at', { ascending: false }).limit(10),
      ]);

      const batches = batchesRes.data ?? [];
      const active = batches.filter(b => !['Closed', 'Discarded', 'Spent'].includes(b.status));
      const incubating = batches.filter(b => b.status === 'Incubating' || b.current_stage === 'Incubation').length;
      const fruiting = batches.filter(b => ['Fruiting', 'Pinning', 'Ready to Harvest'].includes(b.status) || b.current_stage === 'Fruiting').length;

      const allToday = todayTasksRes.data ?? [];
      const allOverdue = overdueTasksRes.data ?? [];
      const critical = [...allToday, ...allOverdue].filter(t => t.priority === 'Critical').length;

      const totalHarvest = (harvestRes.data ?? []).reduce((s, h) => s + (h.grade_a_weight || 0) + (h.grade_b_weight || 0), 0);

      const pipelineCounts: Record<string, number> = {};
      for (const type of ['agar', 'liquid_culture', 'grain_spawn', 'substrate', 'fruiting_block']) {
        pipelineCounts[type] = batches.filter(b => b.batch_type === type).length;
      }

      setStats({
        activeBatches: active.length,
        tasksDueToday: allToday.length,
        overdueTasks: allOverdue.length,
        criticalTasks: critical,
        incubatingBatches: incubating,
        fruitingBatches: fruiting,
        contaminatedThisWeek: (contaminationRes.data ?? []).length,
        harvestThisMonth: Math.round(totalHarvest * 10) / 10,
      });
      setTodayTasks(allToday as Task[]);
      setOverdueTasks(allOverdue as Task[]);
      setUpcomingHarvest(upcomingRes.data as Batch[] ?? []);
      setPipeline(pipelineCounts);
      const qrScans = qrScansRes.data ?? [];
      setQrStats({
        scansToday: qrScans.length,
        failedToday: qrScans.filter(s => s.result !== 'Success').length,
        activeQrCodes: qrActiveRes.count ?? 0,
      });
      setAlerts(alertsRes.data as EnvironmentalAlert[] ?? []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-sm text-gray-500">
          {t('dashboard.greeting', {
            timeOfDay: new Date().getHours() < 12 ? t('dashboard.morning') : new Date().getHours() < 17 ? t('dashboard.afternoon') : t('dashboard.evening'),
            name: user?.full_name?.split(' ')[0]
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers} label={t('dashboard.activeBatches')} value={stats?.activeBatches ?? 0} color="bg-blue-50 text-blue-600" onClick={() => navigate('/batches')} />
        <StatCard icon={ClipboardList} label={t('dashboard.dueToday')} value={stats?.tasksDueToday ?? 0} color="bg-amber-50 text-amber-600" onClick={() => navigate('/tasks')} />
        <StatCard icon={AlertTriangle} label={t('dashboard.overdueTasks')} value={stats?.overdueTasks ?? 0} color={stats?.overdueTasks ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'} onClick={() => navigate('/tasks', { filter: 'overdue' })} />
        <StatCard icon={Activity} label={t('dashboard.criticalTasks')} value={stats?.criticalTasks ?? 0} color={stats?.criticalTasks ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'} onClick={() => navigate('/tasks', { priority: 'Critical' })} />
        <StatCard icon={FlaskConical} label={t('dashboard.incubating')} value={stats?.incubatingBatches ?? 0} color="bg-violet-50 text-violet-600" onClick={() => navigate('/batches')} />
        <StatCard icon={Sprout} label={t('dashboard.fruitingBatches')} value={stats?.fruitingBatches ?? 0} color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/batches', { type: 'fruiting_block' })} />
        <StatCard icon={AlertTriangle} label={t('dashboard.contaminationWeek')} value={stats?.contaminatedThisWeek ?? 0} color={stats?.contaminatedThisWeek ? 'bg-orange-50 text-orange-600' : 'bg-gray-50 text-gray-400'} onClick={() => navigate('/contamination')} />
        <StatCard icon={Scissors} label={t('dashboard.harvestMonth')} value={`${stats?.harvestThisMonth ?? 0}kg`} color="bg-teal-50 text-teal-600" onClick={() => navigate('/harvest')} />
      </div>

      {/* QR Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={ScanLine} label={t('dashboard.qrScansToday')} value={qrStats.scansToday} color="bg-emerald-50 text-emerald-600" onClick={() => navigate('/qr')} />
        <StatCard icon={XCircle} label={t('dashboard.failedScansToday')} value={qrStats.failedToday} color={qrStats.failedToday > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'} onClick={() => navigate('/qr')} />
        <StatCard icon={QrCode} label={t('dashboard.activeQrCodes')} value={qrStats.activeQrCodes} color="bg-blue-50 text-blue-600" onClick={() => navigate('/qr')} />
      </div>

      {/* Environmental Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl border border-red-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50/30 rounded-t-xl">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Thermometer size={15} className="text-red-500" />
              {t('dashboard.environmentalAlerts')} ({alerts.length})
            </h2>
            {canManage(user?.role ?? '') && (
              <button onClick={() => navigate('/devices')} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                {t('dashboard.manageDevices')} <ArrowRight size={11} />
              </button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.slice(0, 5).map(alert => (
              <AlertRow key={alert.id} alert={alert} onAcknowledge={async () => {
                if (!user) return;
                await supabase.from('environmental_alerts').update({ acknowledged_by: user.id, acknowledged_at: new Date().toISOString() }).eq('id', alert.id);
                fetchDashboardData();
              }} />
            ))}
          </div>
        </div>
      )}

      {/* Production Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity size={16} className="text-emerald-600" />
          {t('dashboard.productionPipeline')}
        </h2>
        <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, i) => (
            <React.Fragment key={stage.key}>
              <button
                onClick={() => navigate('/batches', { type: stage.key })}
                className={`flex-1 min-w-[90px] rounded-xl border p-3 text-center hover:shadow-md transition-all ${stage.color}`}
              >
                <stage.icon size={20} className="mx-auto mb-1 opacity-70" />
                <p className="text-xs font-semibold">{stage.label}</p>
                <p className="text-2xl font-bold mt-1">{pipeline[stage.key] ?? 0}</p>
                <p className="text-xs opacity-70 mt-0.5">{t('dashboard.batches')}</p>
              </button>
              {i < PIPELINE_STAGES.length - 1 && (
                <div className="flex items-center text-gray-300">
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={15} className="text-amber-500" />
              {t('dashboard.tasksDueToday')} ({todayTasks.length})
            </h2>
            <button onClick={() => navigate('/tasks')} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              {t('common.viewAll')} <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {todayTasks.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-8 text-center justify-center">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <p className="text-sm text-gray-400">{t('dashboard.noTasksDueToday')}</p>
              </div>
            ) : todayTasks.slice(0, 8).map(task => (
              <button
                key={task.id}
                onClick={() => navigate('/tasks/' + task.id)}
                className="w-full flex items-start gap-3 px-5 py-3 hover:bg-gray-50 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(task as any).batch?.batch_code ?? 'No batch'} · {(task as any).assignee?.full_name ?? 'Unassigned'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge label={task.priority} type="priority" />
                  <span className="text-xs text-gray-400">{new Date(task.due_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <XCircle size={15} className="text-red-500" />
              {t('dashboard.overdueTasksPanel')} ({overdueTasks.length})
            </h2>
            <button onClick={() => navigate('/tasks', { filter: 'overdue' })} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              {t('common.viewAll')} <ArrowRight size={11} />
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {overdueTasks.length === 0 ? (
              <div className="flex items-center gap-2 px-5 py-8 justify-center">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <p className="text-sm text-gray-400">{t('dashboard.noOverdueTasks')}</p>
              </div>
            ) : overdueTasks.slice(0, 8).map(task => (
              <button
                key={task.id}
                onClick={() => navigate('/tasks/' + task.id)}
                className="w-full flex items-start gap-3 px-5 py-3 hover:bg-red-50/50 text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {(task as any).batch?.batch_code ?? 'No batch'} · {(task as any).assignee?.full_name ?? 'Unassigned'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <StatusBadge label={task.priority} type="priority" />
                  <span className="text-xs text-red-500 font-medium">{getOverdueDuration(task.due_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Harvest */}
      {upcomingHarvest.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Scissors size={15} className="text-teal-500" />
              {t('dashboard.upcomingHarvest')}
            </h2>
            <button onClick={() => navigate('/batches', { type: 'fruiting_block' })} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
              {t('dashboard.viewFruiting')} <ArrowRight size={11} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-500">{t('dashboard.batch')}</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{t('dashboard.species')}</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{t('dashboard.location')}</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcomingHarvest.map(batch => (
                  <tr key={batch.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate('/batches/' + batch.id)}>
                    <td className="px-5 py-3 font-medium text-gray-900">{batch.batch_code}</td>
                    <td className="px-3 py-3 text-gray-600">{(batch as any).species?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-500">{(batch as any).room?.name ?? '—'}</td>
                    <td className="px-3 py-3"><StatusBadge label={batch.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-gray-300 transition-all group"
    >
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">{label}</p>
    </button>
  );
}

function AlertRow({ alert, onAcknowledge }: { alert: EnvironmentalAlert; onAcknowledge: () => void }) {
  const { t } = useTranslation();
  const roomName = (alert as any).room?.name ?? 'Unknown Room';
  const deviceName = (alert as any).device?.device_name;

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-red-50/30 transition-colors">
      <div className={`px-2 py-1 rounded text-xs font-medium ${getAlertTypeColor(alert.alert_type)}`}>
        {getAlertTypeLabel(alert.alert_type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{roomName}</p>
        <p className="text-xs text-gray-500">
          {alert.measured_value} ({t('alerts.threshold')}: {alert.threshold_value})
          {deviceName && <> &middot; {deviceName}</>}
          &middot; {formatRelativeTime(alert.created_at)}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {alert.auto_task_id && (
          <button onClick={() => navigate('/tasks/' + alert.auto_task_id)}
            className="text-xs text-emerald-600 hover:underline">{t('dashboard.viewTask')}</button>
        )}
        {!alert.acknowledged_at ? (
          <button onClick={onAcknowledge}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors">
            <CheckCircle size={12} /> {t('dashboard.acknowledge')}
          </button>
        ) : (
          <span className="text-xs text-gray-400">{t('dashboard.acknowledged')}</span>
        )}
      </div>
    </div>
  );
}
