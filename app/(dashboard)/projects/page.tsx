'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ExternalLink, Briefcase, X, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Project, ProjectStatus, Manager } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import AddProjectModal from '@/components/dashboard/AddProjectModal';

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  active:    { label: 'Active',     color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  paused:    { label: 'Paused',     color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
  completed: { label: 'Completed',  color: 'text-slate-500',   bg: 'bg-slate-100 dark:bg-slate-800' },
};

const MANAGER_COLORS: Record<Manager, string> = {
  Luka:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  Samvit: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30',
  Both:   'bg-slate-100 text-slate-700 dark:bg-slate-800',
};

const DEFAULT_FORM = {
  client_name: '', site_url: '', description: '', retainer_fee: '',
  monthly_payment: '', hosting_cost: '', manager: 'Both' as Manager,
  status: 'active' as ProjectStatus, start_date: new Date().toISOString().split('T')[0],
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const fetchProjects = useCallback(async () => {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (!error && data) setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
    const channel = supabase
      .channel('projects-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProjects]);

  const openAdd = () => setShowAddModal(true);

  const handleCloseProject = async (p: Project) => {
    const { error } = await supabase.from('projects').update({
      monthly_payment: 0,
      status: 'completed',
    }).eq('id', p.id);
    if (error) toast.error('Failed to close project');
    else { toast.success(`${p.client_name} closed — monthly fee zeroed, retainer kept`); fetchProjects(); }
  };

  const openEdit = (p: Project) => {
    setEditProject(p);
    setForm({
      client_name: p.client_name,
      site_url: p.site_url ?? '',
      description: p.description ?? '',
      retainer_fee: p.retainer_fee ? String(p.retainer_fee) : '',
      monthly_payment: p.monthly_payment ? String(p.monthly_payment) : '',
      hosting_cost: String(p.hosting_cost),
      manager: p.manager,
      status: p.status,
      start_date: p.start_date ?? DEFAULT_FORM.start_date,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast.error('Client name required'); return; }
    setSaving(true);

    const payload = {
      client_name: form.client_name,
      site_url: form.site_url || null,
      description: form.description || null,
      retainer_fee: parseFloat(form.retainer_fee) || 0,
      monthly_payment: parseFloat(form.monthly_payment) || 0,
      hosting_cost: parseFloat(form.hosting_cost) || 0,
      manager: form.manager,
      status: form.status,
      start_date: form.start_date || null,
    };
    const hosting = payload.hosting_cost;
    const today = form.start_date || new Date().toISOString().split('T')[0];

    if (editProject) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editProject.id);
      if (!error && hosting !== editProject.hosting_cost) {
        const { data: existing } = await supabase.from('transactions').select('id').eq('project_id', editProject.id).eq('category', 'hosting').maybeSingle();
        if (existing) {
          hosting > 0
            ? await supabase.from('transactions').update({ amount: hosting, description: `Hosting — ${form.client_name}` }).eq('id', existing.id)
            : await supabase.from('transactions').delete().eq('id', existing.id);
        } else if (hosting > 0) {
          await supabase.from('transactions').insert({ type: 'expense', category: 'hosting', amount: hosting, description: `Hosting — ${form.client_name}`, date: today, project_id: editProject.id });
        }
      }
      setSaving(false);
      if (error) toast.error('Failed to save');
      else { toast.success('Project updated'); fetchProjects(); setShowModal(false); }
    } else {
      const { data: newProject, error } = await supabase.from('projects').insert(payload).select().single();
      if (!error && newProject && hosting > 0) {
        await supabase.from('transactions').insert({ type: 'expense', category: 'hosting', amount: hosting, description: `Hosting — ${form.client_name}`, date: today, project_id: newProject.id });
      }
      setSaving(false);
      if (error) toast.error('Failed to save');
      else { toast.success('Project added'); fetchProjects(); setShowModal(false); }
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('projects').delete().eq('id', id);
    fetchProjects();
    toast.success('Project deleted');
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const totalMRR = activeProjects.reduce((s, p) => s + p.monthly_payment + (p.retainer_fee ?? 0), 0);
  const totalHosting = activeProjects.reduce((s, p) => s + p.hosting_cost, 0);
  const netMRR = totalMRR - totalHosting;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Active Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">{projects.length} total projects</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {/* MRR Summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total MRR', value: totalMRR, color: 'text-emerald-600' },
            { label: 'Hosting Costs', value: totalHosting, color: 'text-red-500' },
            { label: 'Net MRR', value: netMRR, color: 'text-primary' },
          ].map(({ label, value, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4 shadow-card"
            >
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{formatCurrency(value)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Projects grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 skeleton rounded-xl" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-12 text-center">
          <Briefcase size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No projects yet</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary font-medium cursor-pointer">+ Add first project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p, i) => {
            const s = STATUS_CONFIG[p.status];
            const net = p.monthly_payment - p.hosting_cost;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-card hover:shadow-card-hover transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{p.client_name}</h3>
                    {p.site_url && (
                      <a href={p.site_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-slate-400 hover:text-primary transition-colors mt-0.5 cursor-pointer">
                        <ExternalLink size={11} /> {p.site_url.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ml-2 ${s.color} ${s.bg}`}>{s.label}</span>
                </div>

                {p.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{p.description}</p>
                )}

                <div className={`grid gap-2 mb-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-3 ${p.retainer_fee > 0 && p.monthly_payment > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {p.retainer_fee > 0 && (
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Retainer</p>
                      <p className="text-sm font-semibold text-violet-600">{formatCurrency(p.retainer_fee)}</p>
                    </div>
                  )}
                  {p.monthly_payment > 0 && (
                    <div className={`text-center ${p.retainer_fee > 0 ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}>
                      <p className="text-xs text-slate-400">/mo</p>
                      <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.monthly_payment)}</p>
                    </div>
                  )}
                  <div className="text-center border-l border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400">Hosting</p>
                    <p className="text-sm font-semibold text-red-500">{formatCurrency(p.hosting_cost)}</p>
                  </div>
                  <div className="text-center border-l border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400">Net/mo</p>
                    <p className={`text-sm font-semibold ${net >= 0 ? 'text-primary' : 'text-red-500'}`}>{formatCurrency(net)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MANAGER_COLORS[p.manager]}`}>{p.manager}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {p.status === 'active' && (
                      <button
                        onClick={() => handleCloseProject(p)}
                        title="Close project — zeroes monthly fee, keeps retainer"
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer transition-colors"
                      >
                        <XCircle size={13} /> Close
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg cursor-pointer">
                      <Edit2 size={14} className="text-blue-500" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer">
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
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
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
                <h2 className="font-semibold text-slate-900 dark:text-white">{editProject ? 'Edit Project' : 'New Project'}</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {[
                  { label: 'Client Name *', field: 'client_name', placeholder: 'Smith Roofing' },
                  { label: 'Site URL', field: 'site_url', placeholder: 'https://smithroofing.com' },
                  { label: 'Description', field: 'description', placeholder: 'Local roofing company website' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input
                      value={(form as any)[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Upfront Retainer ($) <span className="text-slate-400 font-normal">optional</span></label>
                    <input type="number" min="0" step="0.01" value={form.retainer_fee}
                      onChange={e => setForm(f => ({ ...f, retainer_fee: e.target.value }))}
                      placeholder="0" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Monthly Fee ($) <span className="text-slate-400 font-normal">optional</span></label>
                    <input type="number" min="0" step="0.01" value={form.monthly_payment}
                      onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                      placeholder="0" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hosting Cost ($)</label>
                  <input type="number" min="0" step="0.01" value={form.hosting_cost}
                    onChange={e => setForm(f => ({ ...f, hosting_cost: e.target.value }))}
                    placeholder="0" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Manager</label>
                    <select value={form.manager} onChange={e => setForm(f => ({ ...f, manager: e.target.value as Manager }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                      {(['Luka', 'Samvit', 'Both'] as Manager[]).map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProjectStatus }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                      {(['active', 'paused', 'completed'] as ProjectStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
                    {saving ? 'Saving…' : editProject ? 'Save Changes' : 'Add Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); fetchProjects(); }}
        />
      )}
    </div>
  );
}
