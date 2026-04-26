'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface Script {
  id: string;
  type: 'opener' | 'objection';
  trigger_text: string;
  response_text: string;
  sort_order: number;
  created_at: string;
}

const BLANK_OPENER = { trigger_text: '', response_text: '' };
const BLANK_OBJECTION = { trigger_text: '', response_text: '' };

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [openerIndex, setOpenerIndex] = useState(0);
  const [expandedObjection, setExpandedObjection] = useState<string | null>(null);

  const [showAddOpener, setShowAddOpener] = useState(false);
  const [editOpener, setEditOpener] = useState<Script | null>(null);
  const [openerForm, setOpenerForm] = useState(BLANK_OPENER);
  const [savingOpener, setSavingOpener] = useState(false);

  const [showAddObjection, setShowAddObjection] = useState(false);
  const [objectionForm, setObjectionForm] = useState(BLANK_OBJECTION);
  const [addResponseTo, setAddResponseTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [savingObjection, setSavingObjection] = useState(false);

  const supabase = createClient();

  const fetchScripts = useCallback(async () => {
    const { data } = await supabase.from('scripts').select('*').order('sort_order').order('created_at');
    if (data) setScripts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchScripts();
    const channel = supabase
      .channel('scripts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scripts' }, fetchScripts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchScripts]);

  const openers = scripts.filter(s => s.type === 'opener');
  const objectionGroups = scripts
    .filter(s => s.type === 'objection')
    .reduce<Record<string, Script[]>>((acc, s) => {
      (acc[s.trigger_text] = acc[s.trigger_text] || []).push(s);
      return acc;
    }, {});
  const objectionKeys = Object.keys(objectionGroups);
  const safeIndex = Math.min(openerIndex, Math.max(openers.length - 1, 0));

  // ── Opener actions ──────────────────────────────────────────
  const handleSaveOpener = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openerForm.trigger_text.trim() || !openerForm.response_text.trim()) {
      toast.error('Fill in all fields'); return;
    }
    setSavingOpener(true);
    if (editOpener) {
      const { error } = await supabase.from('scripts')
        .update({ trigger_text: openerForm.trigger_text, response_text: openerForm.response_text })
        .eq('id', editOpener.id);
      if (error) toast.error('Failed to save');
      else { toast.success('Opener updated'); setEditOpener(null); fetchScripts(); }
    } else {
      const { error } = await supabase.from('scripts').insert({
        type: 'opener', trigger_text: openerForm.trigger_text,
        response_text: openerForm.response_text, sort_order: openers.length,
      });
      if (error) toast.error('Failed to save');
      else { toast.success('Opener added'); setShowAddOpener(false); setOpenerForm(BLANK_OPENER); fetchScripts(); }
    }
    setSavingOpener(false);
  };

  const handleDeleteOpener = async (id: string) => {
    await supabase.from('scripts').delete().eq('id', id);
    setOpenerIndex(0);
    fetchScripts();
    toast.success('Opener deleted');
  };

  const openEditOpener = (s: Script) => {
    setEditOpener(s);
    setOpenerForm({ trigger_text: s.trigger_text, response_text: s.response_text });
    setShowAddOpener(false);
  };

  // ── Objection actions ───────────────────────────────────────
  const handleAddObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectionForm.trigger_text.trim() || !objectionForm.response_text.trim()) {
      toast.error('Fill in all fields'); return;
    }
    setSavingObjection(true);
    const { error } = await supabase.from('scripts').insert({
      type: 'objection', trigger_text: objectionForm.trigger_text,
      response_text: objectionForm.response_text, sort_order: 0,
    });
    setSavingObjection(false);
    if (error) toast.error('Failed to save');
    else {
      const saved = objectionForm.trigger_text;
      toast.success('Objection added');
      setObjectionForm(BLANK_OBJECTION);
      setShowAddObjection(false);
      setExpandedObjection(saved);
      fetchScripts();
    }
  };

  const handleAddResponse = async (e: React.FormEvent, trigger: string) => {
    e.preventDefault();
    if (!responseText.trim()) { toast.error('Enter a response'); return; }
    const { error } = await supabase.from('scripts').insert({
      type: 'objection', trigger_text: trigger,
      response_text: responseText, sort_order: objectionGroups[trigger]?.length ?? 0,
    });
    if (error) toast.error('Failed to save');
    else { toast.success('Response added'); setResponseText(''); setAddResponseTo(null); fetchScripts(); }
  };

  const handleDeleteResponse = async (id: string) => {
    await supabase.from('scripts').delete().eq('id', id);
    fetchScripts();
  };

  const handleDeleteObjection = async (trigger: string) => {
    const ids = (objectionGroups[trigger] ?? []).map(s => s.id);
    await Promise.all(ids.map(id => supabase.from('scripts').delete().eq('id', id)));
    if (expandedObjection === trigger) setExpandedObjection(null);
    fetchScripts();
    toast.success('Objection deleted');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Scripts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Openers and objection handlers</p>
      </div>

      {/* ── OPENERS ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Openers</h2>
            <p className="text-xs text-slate-400 mt-0.5">{openers.length} script{openers.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => { setShowAddOpener(true); setEditOpener(null); setOpenerForm(BLANK_OPENER); }}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
          >
            <Plus size={14} /> Add opener
          </button>
        </div>

        {/* Add / Edit form */}
        <AnimatePresence>
          {(showAddOpener || editOpener) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100 dark:border-slate-800"
            >
              <form onSubmit={handleSaveOpener} className="p-6 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <input
                  placeholder="Title (e.g. The Direct Opener)"
                  value={openerForm.trigger_text}
                  onChange={e => setOpenerForm(f => ({ ...f, trigger_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  placeholder="Script text…"
                  rows={5}
                  value={openerForm.response_text}
                  onChange={e => setOpenerForm(f => ({ ...f, response_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingOpener} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
                    {savingOpener ? 'Saving…' : editOpener ? 'Save Changes' : 'Add Opener'}
                  </button>
                  <button type="button" onClick={() => { setShowAddOpener(false); setEditOpener(null); }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carousel */}
        {loading ? (
          <div className="m-6 h-48 skeleton rounded-xl" />
        ) : openers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No openers yet — add your first script above</div>
        ) : (
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={safeIndex}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.18 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 min-h-44"
              >
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-base">
                  {openers[safeIndex].trigger_text}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {openers[safeIndex].response_text}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpenerIndex(i => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 px-2 tabular-nums">{safeIndex + 1} / {openers.length}</span>
                <button
                  onClick={() => setOpenerIndex(i => Math.min(openers.length - 1, i + 1))}
                  disabled={safeIndex === openers.length - 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditOpener(openers[safeIndex])} className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
                  <Edit2 size={15} className="text-blue-500" />
                </button>
                <button onClick={() => handleDeleteOpener(openers[safeIndex].id)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors">
                  <Trash2 size={15} className="text-red-400" />
                </button>
              </div>
            </div>

            {/* Dot indicators */}
            {openers.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {openers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setOpenerIndex(i)}
                    className={`rounded-full transition-all cursor-pointer ${i === safeIndex ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── OBJECTION HANDLER ───────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Objection Handler</h2>
            <p className="text-xs text-slate-400 mt-0.5">{objectionKeys.length} objection{objectionKeys.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowAddObjection(v => !v)}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
          >
            <Plus size={14} /> Add objection
          </button>
        </div>

        {/* Add objection form */}
        <AnimatePresence>
          {showAddObjection && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100 dark:border-slate-800"
            >
              <form onSubmit={handleAddObjection} className="p-6 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <input
                  placeholder="Objection (e.g. The price is too high)"
                  value={objectionForm.trigger_text}
                  onChange={e => setObjectionForm(f => ({ ...f, trigger_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <textarea
                  placeholder="First response…"
                  rows={3}
                  value={objectionForm.response_text}
                  onChange={e => setObjectionForm(f => ({ ...f, response_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingObjection} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
                    {savingObjection ? 'Saving…' : 'Add Objection'}
                  </button>
                  <button type="button" onClick={() => { setShowAddObjection(false); setObjectionForm(BLANK_OBJECTION); }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Objection list */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[0, 1, 2].map(i => <div key={i} className="h-12 skeleton rounded-xl" />)}
          </div>
        ) : objectionKeys.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No objections yet — add your first above</div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {objectionKeys.map(trigger => {
              const responses = objectionGroups[trigger];
              const isOpen = expandedObjection === trigger;
              return (
                <div key={trigger}>
                  {/* Objection header row */}
                  <div
                    className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group select-none"
                    onClick={() => setExpandedObjection(isOpen ? null : trigger)}
                  >
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={16} className="text-slate-400" />
                      </motion.div>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{trigger}</span>
                      <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {responses.length} response{responses.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteObjection(trigger); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>

                  {/* Responses panel */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                          {responses.map((r, i) => (
                            <div key={r.id} className="px-6 py-3.5 flex items-start gap-3 group border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              <p className="flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{r.response_text}</p>
                              <button
                                onClick={() => handleDeleteResponse(r.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer flex-shrink-0 mt-0.5"
                              >
                                <Trash2 size={13} className="text-red-400" />
                              </button>
                            </div>
                          ))}

                          {/* Add response inline */}
                          {addResponseTo === trigger ? (
                            <form onSubmit={e => handleAddResponse(e, trigger)} className="px-6 py-3 flex gap-2">
                              <input
                                autoFocus
                                placeholder="Type a response…"
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                              <button type="submit" className="p-2 bg-primary text-white rounded-xl cursor-pointer hover:bg-primary-600 transition-colors">
                                <Check size={15} />
                              </button>
                              <button type="button" onClick={() => { setAddResponseTo(null); setResponseText(''); }}
                                className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <X size={15} className="text-slate-500" />
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={() => { setAddResponseTo(trigger); setResponseText(''); }}
                              className="w-full px-6 py-3 text-xs text-primary font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer text-left"
                            >
                              + Add response
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
