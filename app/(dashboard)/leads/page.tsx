'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Check, X, Phone, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Lead, LeadStatus } from '@/types';
import { formatDate, formatRelative } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; darkBg: string }> = {
  to_call:         { label: 'To Call',        color: 'text-amber-600',   bg: 'bg-amber-50',   darkBg: 'dark:bg-amber-900/20' },
  called_no_answer:{ label: 'No Answer',      color: 'text-blue-600',    bg: 'bg-blue-50',    darkBg: 'dark:bg-blue-900/20' },
  yes:             { label: 'Closed!',         color: 'text-emerald-600', bg: 'bg-emerald-50', darkBg: 'dark:bg-emerald-900/20' },
  no:              { label: 'No',              color: 'text-red-500',     bg: 'bg-red-50',     darkBg: 'dark:bg-red-900/20' },
  recall:          { label: 'Recall',          color: 'text-orange-600',  bg: 'bg-orange-50',  darkBg: 'dark:bg-orange-900/20' },
};

const STATUSES = Object.keys(STATUS_CONFIG) as LeadStatus[];

interface EditingLead extends Lead {
  isNew?: boolean;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EditingLead | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel('leads-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const filtered = leads.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search && !`${l.business_name} ${l.contact_person} ${l.phone}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSave = async (lead: EditingLead) => {
    if (!lead.business_name.trim()) { toast.error('Business name required'); return; }
    if (lead.isNew) {
      const { error } = await supabase.from('leads').insert({
        business_name: lead.business_name,
        contact_person: lead.contact_person,
        phone: lead.phone,
        notes: lead.notes,
        status: lead.status,
      });
      if (error) toast.error('Failed to add lead');
      else { toast.success('Lead added'); fetchLeads(); }
    } else {
      const { error } = await supabase.from('leads').update({
        business_name: lead.business_name,
        contact_person: lead.contact_person,
        phone: lead.phone,
        notes: lead.notes,
        status: lead.status,
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id);
      if (error) toast.error('Failed to update');
      else { toast.success('Lead updated'); fetchLeads(); }
    }
    setEditing(null);
    setShowAddModal(false);
  };

  const handleStatusChange = async (id: string, status: LeadStatus) => {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    fetchLeads();
    toast.success('Status updated');
  };

  const handleDelete = async (id: string) => {
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
    toast.success('Lead removed');
  };

  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Leads CRM</h1>
          <p className="text-sm text-slate-500 mt-0.5">{leads.length} leads total</p>
        </div>
        <button
          onClick={() => {
            setEditing({ id: '', business_name: '', contact_person: '', phone: '', notes: '', status: 'to_call', created_at: '', updated_at: '', isNew: true });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer shadow-sm"
        >
          <Plus size={16} />
          New Lead
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
          }`}
        >
          All ({leads.length})
        </button>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
              filter === s ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
            }`}
          >
            {STATUS_CONFIG[s].label} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search leads…"
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Phone size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {search || filter !== 'all' ? 'No leads match your filter' : 'No leads yet'}
            </p>
            {!search && filter === 'all' && (
              <button
                onClick={() => {
                  setEditing({ id: '', business_name: '', contact_person: '', phone: '', notes: '', status: 'to_call', created_at: '', updated_at: '', isNew: true });
                  setShowAddModal(true);
                }}
                className="mt-3 text-sm text-primary font-medium cursor-pointer"
              >
                + Add first lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  {['Business', 'Contact', 'Phone', 'Status', 'Notes', 'Added', 'Updated', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filtered.map((lead, i) => {
                  const s = STATUS_CONFIG[lead.status];
                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-medium text-sm text-slate-900 dark:text-white whitespace-nowrap">{lead.business_name}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{lead.contact_person ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-400">{lead.phone ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <select
                            value={lead.status}
                            onChange={e => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                            className={`appearance-none pr-6 pl-2 py-1 rounded-full text-xs font-semibold cursor-pointer border-0 focus:ring-2 focus:ring-primary/30 ${s.color} ${s.bg} ${s.darkBg}`}
                          >
                            {STATUSES.map(st => (
                              <option key={st} value={st}>{STATUS_CONFIG[st].label}</option>
                            ))}
                          </select>
                          <ChevronDown size={10} className={`absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${s.color}`} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500 max-w-[200px] truncate">{lead.notes ?? '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-400 whitespace-nowrap">{formatRelative(lead.updated_at)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditing(lead)}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} className="text-blue-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                          >
                            <X size={14} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {(editing || showAddModal) && editing && (
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
                <h2 className="font-semibold text-slate-900 dark:text-white">{editing.isNew ? 'New Lead' : 'Edit Lead'}</h2>
                <button onClick={() => { setEditing(null); setShowAddModal(false); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {[
                  { label: 'Business Name *', field: 'business_name', placeholder: 'Smith Roofing' },
                  { label: 'Contact Person', field: 'contact_person', placeholder: 'John Smith' },
                  { label: 'Phone', field: 'phone', placeholder: '(555) 123-4567' },
                ].map(({ label, field, placeholder }) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input
                      value={(editing as any)[field] ?? ''}
                      onChange={e => setEditing(prev => prev ? { ...prev, [field]: e.target.value } : prev)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                  <select
                    value={editing.status}
                    onChange={e => setEditing(prev => prev ? { ...prev, status: e.target.value as LeadStatus } : prev)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</label>
                  <textarea
                    value={editing.notes ?? ''}
                    onChange={e => setEditing(prev => prev ? { ...prev, notes: e.target.value } : prev)}
                    placeholder="Any notes about this lead…"
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setEditing(null); setShowAddModal(false); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button onClick={() => handleSave(editing)} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer">
                    {editing.isNew ? 'Add Lead' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
