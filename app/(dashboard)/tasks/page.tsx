'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, X, Edit2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Task, TaskStatus, TaskPriority, AssignedTo } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_COLS: { status: TaskStatus; label: string; color: string; bg: string }[] = [
  { status: 'todo',        label: 'To Do',       color: 'text-slate-600',   bg: 'bg-slate-100 dark:bg-slate-800' },
  { status: 'in_progress', label: 'In Progress',  color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
  { status: 'done',        label: 'Done',         color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high:   { label: 'High',   color: 'text-red-500' },
  medium: { label: 'Medium', color: 'text-amber-500' },
  low:    { label: 'Low',    color: 'text-slate-400' },
};

const ASSIGNEE_COLORS: Record<AssignedTo, string> = {
  Luka:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  Samvit: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30',
  Both:   'bg-slate-100 text-slate-600 dark:bg-slate-800',
};

const DEFAULT_FORM = {
  title: '', assigned_to: 'Both' as AssignedTo,
  due_date: '', priority: 'medium' as TaskPriority, status: 'todo' as TaskStatus,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<AssignedTo | 'All'>('All');
  const supabase = createClient();

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true, nullsFirst: false });
    if (!error && data) setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
    const channel = supabase
      .channel('tasks-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTasks)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTasks]);

  const openAdd = () => {
    setEditTask(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({ title: t.title, assigned_to: t.assigned_to, due_date: t.due_date ?? '', priority: t.priority, status: t.status });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Task title required'); return; }
    setSaving(true);

    const payload = {
      title: form.title,
      assigned_to: form.assigned_to,
      due_date: form.due_date || null,
      priority: form.priority,
      status: form.status,
    };

    const { error } = editTask
      ? await supabase.from('tasks').update(payload).eq('id', editTask.id)
      : await supabase.from('tasks').insert(payload);

    setSaving(false);
    if (error) toast.error('Failed to save');
    else { toast.success(editTask ? 'Task updated' : 'Task added'); fetchTasks(); setShowModal(false); }
  };

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    await supabase.from('tasks').update({ status }).eq('id', id);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
    toast.success('Task deleted');
  };

  const filteredTasks = tasks.filter(t => filterAssignee === 'All' || t.assigned_to === filterAssignee);

  const isOverdue = (t: Task) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Tasks & Deadlines</h1>
          <p className="text-sm text-slate-500 mt-0.5">{tasks.filter(t => t.status !== 'done').length} open tasks</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer shadow-sm">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Assignee filter */}
      <div className="flex gap-2">
        {(['All', 'Luka', 'Samvit', 'Both'] as const).map(a => (
          <button
            key={a}
            onClick={() => setFilterAssignee(a)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              filterAssignee === a
                ? 'bg-primary text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLS.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.status);
            return (
              <div key={col.status} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
                <div className={`px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} ${col.bg}`}>{col.label}</span>
                  </div>
                  <span className="text-xs font-medium text-slate-400">{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-2 min-h-[200px]">
                  {colTasks.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-xs text-slate-400">No tasks here</p>
                    </div>
                  )}
                  {colTasks.map((task, i) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-3 rounded-xl border transition-all group cursor-pointer ${
                        isOverdue(task)
                          ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                          {task.title}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => openEdit(task)} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer">
                            <Edit2 size={12} className="text-blue-500" />
                          </button>
                          <button onClick={() => handleDelete(task.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded cursor-pointer">
                            <Trash2 size={12} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${PRIORITY_CONFIG[task.priority].color}`}>
                            {PRIORITY_CONFIG[task.priority].label}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ASSIGNEE_COLORS[task.assigned_to]}`}>
                            {task.assigned_to}
                          </span>
                        </div>
                        {task.due_date && (
                          <span className={`text-xs ${isOverdue(task) ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                            {isOverdue(task) ? 'Overdue · ' : ''}{formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                      {/* Status quick-change */}
                      <div className="mt-2 flex gap-1">
                        {STATUS_COLS.filter(s => s.status !== col.status).map(s => (
                          <button
                            key={s.status}
                            onClick={() => handleStatusChange(task.id, s.status)}
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${s.color} ${s.bg} hover:opacity-80`}
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-semibold text-slate-900 dark:text-white">{editTask ? 'Edit Task' : 'New Task'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Task Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Update homepage copy"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assigned To</label>
                    <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value as AssignedTo }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                      {(['Luka', 'Samvit', 'Both'] as AssignedTo[]).map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                      {(['high', 'medium', 'low'] as TaskPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
                    <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                      {STATUS_COLS.map(s => <option key={s.status} value={s.status}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
                    {saving ? 'Saving…' : editTask ? 'Save' : 'Add Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
