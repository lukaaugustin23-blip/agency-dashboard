'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Manager, ProjectStatus } from '@/types';

interface AddProjectModalProps {
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULT_FORM = {
  client_name: '', site_url: '', description: '', retainer_fee: '',
  monthly_payment: '', hosting_cost: '', manager: 'Both' as Manager,
  status: 'active' as ProjectStatus, start_date: new Date().toISOString().split('T')[0],
};

export default function AddProjectModal({ onClose, onSaved }: AddProjectModalProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name.trim()) { toast.error('Client name required'); return; }
    setSaving(true);

    const retainer = parseFloat(form.retainer_fee) || 0;
    const monthly = parseFloat(form.monthly_payment) || 0;
    const hosting = parseFloat(form.hosting_cost) || 0;
    const today = form.start_date || new Date().toISOString().split('T')[0];

    const { data: project, error } = await supabase.from('projects').insert({
      client_name: form.client_name,
      site_url: form.site_url || null,
      description: form.description || null,
      retainer_fee: retainer,
      monthly_payment: monthly,
      hosting_cost: hosting,
      manager: form.manager,
      status: form.status,
      start_date: form.start_date || null,
    }).select().single();

    if (!error && project) {
      const txns = [];
      if (retainer > 0) txns.push({ type: 'income', category: 'retainer', amount: retainer, description: `Retainer — ${form.client_name}`, date: today, project_id: project.id });
      if (hosting > 0) txns.push({ type: 'expense', category: 'hosting', amount: hosting, description: `Hosting — ${form.client_name}`, date: today, project_id: project.id });
      if (txns.length > 0) await supabase.from('transactions').insert(txns);
    }

    setSaving(false);
    if (error) toast.error('Failed to save project');
    else {
      toast.success(retainer > 0
        ? `Project added + $${retainer} retainer recorded as income`
        : 'Project added'
      );
      onSaved();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="font-semibold text-slate-900 dark:text-white">Add Project</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
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
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Upfront Retainer ($) <span className="text-slate-400 font-normal">optional</span>
              </label>
              <input type="number" min="0" step="0.01" value={form.retainer_fee}
                onChange={e => setForm(f => ({ ...f, retainer_fee: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {form.retainer_fee && parseFloat(form.retainer_fee) > 0 && (
                <p className="text-xs text-violet-500 mt-1">Auto-recorded as income</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Monthly Fee ($) <span className="text-slate-400 font-normal">optional</span>
              </label>
              <input type="number" min="0" step="0.01" value={form.monthly_payment}
                onChange={e => setForm(f => ({ ...f, monthly_payment: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
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
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Date</label>
            <input type="date" value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm cursor-pointer hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
              {saving ? 'Saving…' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
