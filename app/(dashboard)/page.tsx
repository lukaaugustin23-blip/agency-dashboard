'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign, TrendingDown, Wallet, PiggyBank, Gem,
  Plus, Trash2, Briefcase, XCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import MetricCard from '@/components/dashboard/MetricCard';
import GoalRing from '@/components/dashboard/GoalRing';
import { Transaction, Project } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import AddTransactionModal from '@/components/dashboard/AddTransactionModal';

const MONTHLY_GOAL = 10000;

export default function OverviewPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTxModal, setShowTxModal] = useState(false);
  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    const [{ data: txns }, { data: projs }] = await Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }),
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
    ]);
    if (txns) setTransactions(txns);
    if (projs) setProjects(projs);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();

    // Subscribe to both tables — changes on either page update overview
    const channel = supabase
      .channel('overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0);

  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && t.date >= monthStart)
    .reduce((s, t) => s + t.amount, 0);

  const netProfit = monthlyIncome - monthlyExpenses;
  const allTimeRevenue = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const pocketed = transactions.filter(t => t.type === 'income' && t.category === 'withdrawal').reduce((s, t) => s + t.amount, 0);
  const invested = transactions.filter(t => t.type === 'expense' && t.category === 'investment').reduce((s, t) => s + t.amount, 0);

  const expenses = transactions.filter(t => t.type === 'expense' && t.date >= monthStart);
  const expensesByCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount;
    return acc;
  }, {});

  const websitesSold = transactions.filter(t => t.type === 'income' && t.category === 'website_sale');

  // Active projects MRR (from projects table — source of truth for recurring)
  const activeProjects = projects.filter(p => p.status === 'active');
  const mrr = activeProjects.reduce((s, p) => s + (p.monthly_payment ?? 0), 0);

  const handleDeleteTx = async (id: string) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Transaction deleted'); fetchAll(); }
  };

  const handleCloseProject = async (p: Project) => {
    // Zero out monthly fee; keep retainer in transactions. Status → completed.
    const { error } = await supabase.from('projects').update({
      monthly_payment: 0,
      status: 'completed',
    }).eq('id', p.id);
    if (error) toast.error('Failed to close project');
    else { toast.success(`${p.client_name} closed — monthly fee removed`); fetchAll(); }
  };

  const categoryLabels: Record<string, string> = {
    hosting: 'Hosting', claude: 'Claude / AI', tools: 'Tools & Software',
    investment: 'Investment', misc: 'Miscellaneous', website_sale: 'Website Sale',
    withdrawal: 'Withdrawal', retainer: 'Retainer',
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    paused: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    completed: 'text-slate-500 bg-slate-100 dark:bg-slate-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Financial Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer shadow-sm"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Metrics + Goal ring */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 h-32 skeleton" />
            ))
          ) : (
            <>
              <MetricCard label="Gross Revenue" value={monthlyIncome} icon={DollarSign} index={0} iconColor="text-primary" iconBg="bg-primary/10" />
              <MetricCard label="Total Expenses" value={monthlyExpenses} icon={TrendingDown} index={1} iconColor="text-red-500" iconBg="bg-red-50 dark:bg-red-900/20" />
              <MetricCard label="Net Profit" value={netProfit} icon={Wallet} index={2} iconColor="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-900/20" />
              <MetricCard label="Money Pocketed" value={pocketed} icon={PiggyBank} index={3} iconColor="text-amber-500" iconBg="bg-amber-50 dark:bg-amber-900/20" />
              <MetricCard label="Invested / Saved" value={invested} icon={Gem} index={4} iconColor="text-violet-600" iconBg="bg-violet-50 dark:bg-violet-900/20" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-card"
              >
                <p className="text-sm text-slate-500 mb-1">MRR (Active Projects)</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(mrr)}</p>
                <p className="text-xs text-slate-400 mt-1">{activeProjects.length} active clients</p>
              </motion.div>
            </>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-6 shadow-card flex items-center justify-center"
        >
          {loading
            ? <div className="w-40 h-40 rounded-full skeleton" />
            : <GoalRing current={netProfit} goal={MONTHLY_GOAL} />
          }
        </motion.div>
      </div>

      {/* Active Projects quick view */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Projects</h2>
            <p className="text-xs text-slate-400 mt-0.5">All clients — realtime</p>
          </div>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center">
            <Briefcase size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No projects yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {['Client', 'Retainer', 'Monthly', 'Hosting', 'Net/mo', 'Manager', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {projects.map((p, i) => {
                  const net = (p.monthly_payment ?? 0) - (p.hosting_cost ?? 0);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-4 py-3 font-medium text-sm text-slate-900 dark:text-white">{p.client_name}</td>
                      <td className="px-4 py-3 text-sm text-violet-600 font-medium">
                        {(p.retainer_fee ?? 0) > 0 ? formatCurrency(p.retainer_fee) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                        {(p.monthly_payment ?? 0) > 0 ? formatCurrency(p.monthly_payment) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-500">{formatCurrency(p.hosting_cost ?? 0)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-primary">{formatCurrency(net)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{p.manager}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'active' && (
                          <button
                            onClick={() => handleCloseProject(p)}
                            title="Close project (zeroes monthly fee, keeps retainer)"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-all cursor-pointer px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <XCircle size={14} /> Close
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Expense breakdown + Websites sold */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Expense Breakdown</h2>
            <p className="text-xs text-slate-400 mt-0.5">This month</p>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 skeleton rounded-lg" />)}</div>
          ) : Object.keys(expensesByCategory).length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No expenses this month</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800">
              {Object.entries(expensesByCategory).map(([cat, amt]) => {
                const pct = monthlyExpenses > 0 ? (amt / monthlyExpenses) * 100 : 0;
                return (
                  <div key={cat} className="px-6 py-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{categoryLabels[cat] ?? cat}</span>
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{formatCurrency(amt)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%`, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Websites Sold</h2>
              <p className="text-xs text-slate-400 mt-0.5">All time</p>
            </div>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{websitesSold.length} total</span>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
          ) : websitesSold.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No websites sold yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {websitesSold.map(t => (
                <div key={t.id} className="px-6 py-3 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.description ?? 'Website'}</p>
                    <p className="text-xs text-slate-400">{formatDate(t.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600">{formatCurrency(t.amount)}</span>
                    <button onClick={() => handleDeleteTx(t.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* All transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-sm">All Transactions</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No transactions yet</p>
            <button onClick={() => setShowTxModal(true)} className="mt-3 text-sm text-primary font-medium cursor-pointer">+ Add first transaction</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {transactions.map(t => (
                  <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm text-slate-800 dark:text-slate-200">{t.description ?? '—'}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {categoryLabels[t.category] ?? t.category}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-500">{formatDate(t.date)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <button onClick={() => handleDeleteTx(t.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {showTxModal && (
        <AddTransactionModal onClose={() => setShowTxModal(false)} onSaved={() => { setShowTxModal(false); fetchAll(); }} />
      )}
    </div>
  );
}
