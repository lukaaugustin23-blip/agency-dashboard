'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Lead } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

const CHART_COLORS = ['#3C50E0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface WorkSession {
  id: string;
  person: 'Luka' | 'Samvit';
  date: string;
  hours: number;
  notes: string | null;
}

const DEFAULT_SESSION = {
  person: 'Luka' as 'Luka' | 'Samvit',
  date: new Date().toISOString().split('T')[0],
  hours: '',
  notes: '',
};

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<{ hosting_cost: number; status: string }[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionForm, setSessionForm] = useState(DEFAULT_SESSION);
  const [loggingSession, setLoggingSession] = useState(false);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [{ data: txns }, { data: leadsData }, { data: projectsData }, { data: sessionsData }] = await Promise.all([
      supabase.from('transactions').select('*').order('date'),
      supabase.from('leads').select('*'),
      supabase.from('projects').select('hosting_cost, status'),
      supabase.from('work_sessions').select('*').order('date', { ascending: false }),
    ]);
    if (txns) setTransactions(txns);
    if (leadsData) setLeads(leadsData);
    if (projectsData) setProjects(projectsData);
    if (sessionsData) setSessions(sessionsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Net profit from April 2025 to current month
  const now = new Date();
  const totalMonths = (now.getFullYear() - 2025) * 12 + (now.getMonth() - 3) + 1;
  const monthlyData = Array.from({ length: Math.max(totalMonths, 1) }, (_, i) => {
    const date = new Date(2025, 3 + i, 1);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();
    const income = transactions.filter(t => t.type === 'income' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
    return { month: format(date, 'MMM yy'), profit: income - expenses };
  });

  // Leads funnel
  const leadCounts = {
    total: leads.length,
    called: leads.filter(l => l.status !== 'to_call').length,
    answered: leads.filter(l => ['yes', 'no', 'recall'].includes(l.status)).length,
    closed: leads.filter(l => l.status === 'yes').length,
  };
  const funnelData = [
    { name: 'Total Leads', value: leadCounts.total },
    { name: 'Called', value: leadCounts.called },
    { name: 'Answered', value: leadCounts.answered },
    { name: 'Closed', value: leadCounts.closed },
  ];

  // Expense breakdown — hosting from projects
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense' && t.category !== 'hosting')
    .reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] ?? 0) + t.amount; return acc; }, {});
  const projectHostingTotal = projects.filter(p => p.status === 'active' && p.hosting_cost > 0).reduce((s, p) => s + p.hosting_cost, 0);
  if (projectHostingTotal > 0) expenseByCategory['hosting'] = projectHostingTotal;
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const totalExpenses = pieData.reduce((s, d) => s + d.value, 0);

  const categoryLabels: Record<string, string> = {
    hosting: 'Hosting', claude: 'AI Tools', tools: 'Software', investment: 'Investment', misc: 'Other',
  };

  // Hours stats
  const lukaHours = sessions.filter(s => s.person === 'Luka').reduce((sum, s) => sum + s.hours, 0);
  const samvitHours = sessions.filter(s => s.person === 'Samvit').reduce((sum, s) => sum + s.hours, 0);
  const totalHours = lukaHours + samvitHours;
  const totalRevenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const revenuePerHour = totalHours > 0 ? totalRevenue / totalHours : 0;

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const hrs = parseFloat(sessionForm.hours);
    if (!hrs || hrs <= 0) { toast.error('Enter valid hours'); return; }
    setLoggingSession(true);
    const { error } = await supabase.from('work_sessions').insert({
      person: sessionForm.person,
      date: sessionForm.date,
      hours: hrs,
      notes: sessionForm.notes || null,
    });
    setLoggingSession(false);
    if (error) toast.error('Failed to log session');
    else { toast.success('Session logged'); setSessionForm(DEFAULT_SESSION); fetchData(); }
  };

  const handleDeleteSession = async (id: string) => {
    await supabase.from('work_sessions').delete().eq('id', id);
    fetchData();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-lg text-sm">
        <p className="font-semibold text-slate-900 dark:text-white mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {formatCurrency(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue trends and lead performance</p>
      </div>

      {/* Net Profit Trend — full width, April 2025 → now */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-4"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white mb-0.5">Net Profit Trend</h2>
        <p className="text-xs text-slate-400 mb-3">April 2025 — present</p>
        {loading ? <div className="h-36 skeleton rounded-xl" /> : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Leads + Expense 50/50 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-4"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white mb-0.5">Leads Funnel</h2>
          <p className="text-xs text-slate-400 mb-3">Conversion pipeline</p>
          {loading ? <div className="h-36 skeleton rounded-xl" /> : (
            <div className="space-y-2.5">
              {funnelData.map(({ name, value }, i) => {
                const pct = leadCounts.total > 0 ? (value / leadCounts.total) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{name}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{value} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 + 0.3 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: CHART_COLORS[i] }}
                      />
                    </div>
                  </div>
                );
              })}
              {leadCounts.total > 0 && (
                <p className="text-xs text-slate-400 pt-1">
                  Close rate: <span className="font-semibold text-primary">{((leadCounts.closed / leadCounts.total) * 100).toFixed(1)}%</span>
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Expense pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-4"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white mb-0.5">Expense Categories</h2>
          <p className="text-xs text-slate-400 mb-3">All time</p>
          {loading ? (
            <div className="h-36 skeleton rounded-xl" />
          ) : pieData.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-xs text-slate-400">No expense data</div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-full flex items-center justify-center" style={{ height: 140 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 leading-none mb-0.5">Total</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{formatCurrency(totalExpenses)}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                {pieData.map(({ name }, i) => (
                  <div key={name} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-slate-500">{categoryLabels[name] ?? name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Hours Logged */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Hours Logged</h2>
          <p className="text-xs text-slate-400 mt-0.5">Work sessions — all time</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
          {[
            { label: 'Luka', value: `${lukaHours.toFixed(1)} hrs`, color: 'text-blue-600' },
            { label: 'Samvit', value: `${samvitHours.toFixed(1)} hrs`, color: 'text-violet-600' },
            { label: 'Revenue / hr', value: formatCurrency(revenuePerHour), color: 'text-emerald-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-6 py-4 text-center">
              <p className="text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Log form */}
        <form onSubmit={handleLogSession} className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Who</label>
            <select
              value={sessionForm.person}
              onChange={e => setSessionForm(f => ({ ...f, person: e.target.value as 'Luka' | 'Samvit' }))}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option>Luka</option>
              <option>Samvit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
            <input
              type="date" value={sessionForm.date}
              onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Hours</label>
            <input
              type="number" min="0.25" step="0.25" placeholder="2.5"
              value={sessionForm.hours}
              onChange={e => setSessionForm(f => ({ ...f, hours: e.target.value }))}
              className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <input
              type="text" placeholder="What you worked on…"
              value={sessionForm.notes}
              onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit" disabled={loggingSession}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            {loggingSession ? 'Saving…' : 'Log'}
          </button>
        </form>

        {/* Sessions list */}
        {loading ? (
          <div className="p-6 space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No sessions logged yet</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-60 overflow-y-auto">
            {sessions.map(s => (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.person === 'Luka' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30'}`}>
                    {s.person}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{s.hours}h</span>
                  {s.notes && <span className="text-sm text-slate-500 truncate max-w-xs">{s.notes}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{s.date}</span>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer"
                  >
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
