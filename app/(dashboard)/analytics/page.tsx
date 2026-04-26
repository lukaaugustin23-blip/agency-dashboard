'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell, Sector
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { Transaction, Lead } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const CHART_COLORS = ['#3C50E0', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [{ data: txns }, { data: leadsData }] = await Promise.all([
      supabase.from('transactions').select('*').order('date'),
      supabase.from('leads').select('*'),
    ]);
    if (txns) setTransactions(txns);
    if (leadsData) setLeads(leadsData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Last 6 months revenue vs expenses
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const start = startOfMonth(date).toISOString();
    const end = endOfMonth(date).toISOString();
    const income = transactions.filter(t => t.type === 'income' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense' && t.date >= start && t.date <= end).reduce((s, t) => s + t.amount, 0);
    return { month: format(date, 'MMM'), revenue: income, expenses, profit: income - expenses };
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

  // Expense breakdown (all time)
  const expenseByCategory = transactions
    .filter(t => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => { acc[t.category] = (acc[t.category] ?? 0) + t.amount; return acc; }, {});

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));

  const categoryLabels: Record<string, string> = {
    hosting: 'Hosting', claude: 'AI Tools', tools: 'Software', investment: 'Investment', misc: 'Other',
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Revenue trends and lead performance</p>
      </div>

      {/* Revenue chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-6"
      >
        <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Revenue vs Expenses</h2>
        <p className="text-xs text-slate-400 mb-5">Last 6 months</p>
        {loading ? (
          <div className="h-64 skeleton rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
              <Bar dataKey="revenue" name="Revenue" fill="#3C50E0" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Profit line + Leads funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-6"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Net Profit Trend</h2>
          <p className="text-xs text-slate-400 mb-5">Last 6 months</p>
          {loading ? <div className="h-48 skeleton rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#10B981" strokeWidth={2.5} dot={{ fill: '#10B981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Leads funnel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-6"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Leads Funnel</h2>
          <p className="text-xs text-slate-400 mb-5">Conversion pipeline</p>
          {loading ? <div className="h-48 skeleton rounded-xl" /> : (
            <div className="space-y-3">
              {funnelData.map(({ name, value }, i) => {
                const pct = leadCounts.total > 0 ? (value / leadCounts.total) * 100 : 0;
                return (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600 dark:text-slate-400">{name}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{value} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                <p className="text-xs text-slate-400 pt-2">
                  Close rate: <span className="font-semibold text-primary">{((leadCounts.closed / leadCounts.total) * 100).toFixed(1)}%</span>
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Expense pie */}
      {!loading && pieData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card p-6"
        >
          <h2 className="font-semibold text-slate-900 dark:text-white mb-1">Expense Categories</h2>
          <p className="text-xs text-slate-400 mb-5">All time breakdown</p>
          <div className="flex items-center gap-8">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map(({ name, value }, i) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{categoryLabels[name] ?? name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
