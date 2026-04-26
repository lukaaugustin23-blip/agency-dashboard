'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Check, X } from 'lucide-react';
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

const BLANK_OPENER    = { trigger_text: '', response_text: '' };
const BLANK_OBJECTION = { trigger_text: '', response_text: '' };

export default function ScriptsPage() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  // Opener state
  const [openerIndex, setOpenerIndex] = useState(0);
  const [openerSlide, setOpenerSlide] = useState(1);
  const [showAddOpener, setShowAddOpener] = useState(false);
  const [editOpener, setEditOpener] = useState<Script | null>(null);
  const [openerForm, setOpenerForm] = useState(BLANK_OPENER);
  const [savingOpener, setSavingOpener] = useState(false);

  // Objection state
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);
  const [responseIndex, setResponseIndex] = useState(0);
  const [responseSlide, setResponseSlide] = useState(1);
  const [showAddObjection, setShowAddObjection] = useState(false);
  const [objectionForm, setObjectionForm] = useState(BLANK_OBJECTION);
  const [savingObjection, setSavingObjection] = useState(false);
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [newResponseText, setNewResponseText] = useState('');

  const responseRef = useRef<HTMLDivElement>(null);
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
  const safeOpenerIndex = Math.min(openerIndex, Math.max(openers.length - 1, 0));
  const currentResponses = selectedObjection ? (objectionGroups[selectedObjection] ?? []) : [];
  const safeResponseIndex = Math.min(responseIndex, Math.max(currentResponses.length - 1, 0));

  const selectObjection = (trigger: string) => {
    setSelectedObjection(trigger);
    setResponseIndex(0);
    setShowAddResponse(false);
    setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  // ── Opener actions ──────────────────────────────────────────────
  const handleSaveOpener = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openerForm.trigger_text.trim() || !openerForm.response_text.trim()) { toast.error('Fill in all fields'); return; }
    setSavingOpener(true);
    if (editOpener) {
      const { error } = await supabase.from('scripts')
        .update({ trigger_text: openerForm.trigger_text, response_text: openerForm.response_text })
        .eq('id', editOpener.id);
      if (error) toast.error(error.message);
      else { toast.success('Opener updated'); setEditOpener(null); fetchScripts(); }
    } else {
      const { error } = await supabase.from('scripts').insert({
        type: 'opener', trigger_text: openerForm.trigger_text,
        response_text: openerForm.response_text, sort_order: openers.length,
      });
      if (error) toast.error(error.message);
      else { toast.success('Opener added'); setShowAddOpener(false); setOpenerForm(BLANK_OPENER); fetchScripts(); }
    }
    setSavingOpener(false);
  };

  const navOpener = (dir: 1 | -1) => {
    setOpenerSlide(dir);
    setOpenerIndex(i => Math.min(Math.max(0, i + dir), openers.length - 1));
  };

  const handleDeleteOpener = async (id: string) => {
    await supabase.from('scripts').delete().eq('id', id);
    setOpenerIndex(0);
    fetchScripts();
    toast.success('Opener deleted');
  };

  // ── Objection actions ───────────────────────────────────────────
  const handleAddObjection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objectionForm.trigger_text.trim() || !objectionForm.response_text.trim()) { toast.error('Fill in all fields'); return; }
    setSavingObjection(true);
    const { error } = await supabase.from('scripts').insert({
      type: 'objection', trigger_text: objectionForm.trigger_text,
      response_text: objectionForm.response_text, sort_order: 0,
    });
    setSavingObjection(false);
    if (error) toast.error(error.message);
    else {
      const saved = objectionForm.trigger_text;
      toast.success('Objection added');
      setObjectionForm(BLANK_OBJECTION);
      setShowAddObjection(false);
      fetchScripts();
      selectObjection(saved);
    }
  };

  const handleAddResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResponseText.trim() || !selectedObjection) return;
    const { error } = await supabase.from('scripts').insert({
      type: 'objection', trigger_text: selectedObjection,
      response_text: newResponseText, sort_order: currentResponses.length,
    });
    if (error) toast.error(error.message);
    else { toast.success('Response added'); setNewResponseText(''); setShowAddResponse(false); fetchScripts(); }
  };

  const handleDeleteResponse = async (id: string) => {
    await supabase.from('scripts').delete().eq('id', id);
    setResponseIndex(0);
    fetchScripts();
  };

  const handleDeleteObjection = async (trigger: string) => {
    const ids = (objectionGroups[trigger] ?? []).map(s => s.id);
    await Promise.all(ids.map(id => supabase.from('scripts').delete().eq('id', id)));
    if (selectedObjection === trigger) setSelectedObjection(null);
    fetchScripts();
    toast.success('Objection deleted');
  };

  const navResponse = (dir: 1 | -1) => {
    setResponseSlide(dir);
    setResponseIndex(i => Math.min(Math.max(0, i + dir), currentResponses.length - 1));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Scripts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Openers and objection handlers</p>
      </div>

      {/* ── OPENERS ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Openers</h2>
            <p className="text-xs text-slate-400 mt-0.5">{openers.length} script{openers.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => { setShowAddOpener(true); setEditOpener(null); setOpenerForm(BLANK_OPENER); }}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer">
            <Plus size={14} /> Add opener
          </button>
        </div>

        <AnimatePresence>
          {(showAddOpener || editOpener) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100 dark:border-slate-800">
              <form onSubmit={handleSaveOpener} className="p-6 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <input placeholder="Title (e.g. The Direct Opener)" value={openerForm.trigger_text}
                  onChange={e => setOpenerForm(f => ({ ...f, trigger_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <textarea placeholder="Script text…" rows={5} value={openerForm.response_text}
                  onChange={e => setOpenerForm(f => ({ ...f, response_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingOpener}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
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

        {loading ? (
          <div className="m-6 h-48 skeleton rounded-xl" />
        ) : openers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No openers yet</div>
        ) : (
          <div className="p-6">
            <AnimatePresence mode="wait" custom={openerSlide}>
              <motion.div key={safeOpenerIndex}
                custom={openerSlide}
                variants={{ enter: d => ({ opacity: 0, x: d * 48 }), center: { opacity: 1, x: 0 }, exit: d => ({ opacity: 0, x: d * -48 }) }}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.2 }}
                className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 min-h-44">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-base">{openers[safeOpenerIndex].trigger_text}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{openers[safeOpenerIndex].response_text}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <button onClick={() => navOpener(-1)} disabled={safeOpenerIndex === 0}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors">
                  <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
                <span className="text-xs text-slate-400 px-2 tabular-nums">{safeOpenerIndex + 1} / {openers.length}</span>
                <button onClick={() => navOpener(1)} disabled={safeOpenerIndex === openers.length - 1}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors">
                  <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                </button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setEditOpener(openers[safeOpenerIndex]); setOpenerForm({ trigger_text: openers[safeOpenerIndex].trigger_text, response_text: openers[safeOpenerIndex].response_text }); setShowAddOpener(false); }}
                  className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer transition-colors">
                  <Edit2 size={15} className="text-blue-500" />
                </button>
                <button onClick={() => handleDeleteOpener(openers[safeOpenerIndex].id)}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors">
                  <Trash2 size={15} className="text-red-400" />
                </button>
              </div>
            </div>

            {openers.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {openers.map((_, i) => (
                  <button key={i} onClick={() => { setOpenerSlide(i > safeOpenerIndex ? 1 : -1); setOpenerIndex(i); }}
                    className={`rounded-full transition-all cursor-pointer ${i === safeOpenerIndex ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'}`} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── OBJECTION HANDLER ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Objection Handler</h2>
            <p className="text-xs text-slate-400 mt-0.5">{objectionKeys.length} objections</p>
          </div>
          <button onClick={() => setShowAddObjection(v => !v)}
            className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer">
            <Plus size={14} /> Add objection
          </button>
        </div>

        {/* Add objection form */}
        <AnimatePresence>
          {showAddObjection && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-slate-100 dark:border-slate-800">
              <form onSubmit={handleAddObjection} className="p-6 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <input placeholder="Objection (e.g. The price is too high)" value={objectionForm.trigger_text}
                  onChange={e => setObjectionForm(f => ({ ...f, trigger_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <textarea placeholder="First response…" rows={3} value={objectionForm.response_text}
                  onChange={e => setObjectionForm(f => ({ ...f, response_text: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <div className="flex gap-2">
                  <button type="submit" disabled={savingObjection}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors cursor-pointer disabled:opacity-60">
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

        {loading ? (
          <div className="p-6 space-y-3">{[0,1,2].map(i => <div key={i} className="h-10 skeleton rounded-xl" />)}</div>
        ) : objectionKeys.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400">No objections yet</div>
        ) : (
          <div>
            {/* Objection buttons grid */}
            <div className="p-4 flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800">
              {objectionKeys.map(trigger => (
                <button
                  key={trigger}
                  onClick={() => selectObjection(trigger)}
                  className={`group relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    selectedObjection === trigger
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
                  }`}
                >
                  <span className="truncate max-w-[200px]">{trigger}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    selectedObjection === trigger ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {objectionGroups[trigger].length}
                  </span>
                  <span
                    onClick={e => { e.stopPropagation(); handleDeleteObjection(trigger); }}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${selectedObjection === trigger ? 'text-white/70 hover:text-white' : 'text-slate-400 hover:text-red-500'}`}
                  >
                    <X size={13} />
                  </span>
                </button>
              ))}
            </div>

            {/* Response carousel */}
            <AnimatePresence mode="wait">
              {selectedObjection && (
                <motion.div
                  ref={responseRef}
                  key={selectedObjection}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  {/* Response card */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Response {safeResponseIndex + 1} of {currentResponses.length}</p>
                      <button onClick={() => handleDeleteResponse(currentResponses[safeResponseIndex].id)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg cursor-pointer transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>

                    <AnimatePresence mode="wait" custom={responseSlide}>
                      <motion.p
                        key={`${selectedObjection}-${safeResponseIndex}`}
                        custom={responseSlide}
                        variants={{
                          enter: d => ({ opacity: 0, x: d * 32 }),
                          center: { opacity: 1, x: 0 },
                          exit: d => ({ opacity: 0, x: d * -32 }),
                        }}
                        initial="enter" animate="center" exit="exit"
                        transition={{ duration: 0.18 }}
                        className="px-5 py-5 text-sm text-slate-700 dark:text-slate-200 leading-relaxed min-h-24"
                      >
                        {currentResponses[safeResponseIndex]?.response_text}
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Navigation + actions */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => navResponse(-1)} disabled={safeResponseIndex === 0}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors">
                        <ChevronLeft size={16} className="text-slate-600 dark:text-slate-400" />
                      </button>
                      {currentResponses.length > 1 && (
                        <div className="flex gap-1.5 px-1">
                          {currentResponses.map((_, i) => (
                            <button key={i} onClick={() => { setResponseSlide(i > safeResponseIndex ? 1 : -1); setResponseIndex(i); }}
                              className={`rounded-full transition-all cursor-pointer ${i === safeResponseIndex ? 'w-4 h-2 bg-primary' : 'w-2 h-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'}`} />
                          ))}
                        </div>
                      )}
                      <button onClick={() => navResponse(1)} disabled={safeResponseIndex === currentResponses.length - 1}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer transition-colors">
                        <ChevronRight size={16} className="text-slate-600 dark:text-slate-400" />
                      </button>
                    </div>

                    {/* Add response */}
                    {showAddResponse ? (
                      <form onSubmit={handleAddResponse} className="flex gap-2 flex-1 ml-4">
                        <input autoFocus placeholder="Type a response…" value={newResponseText}
                          onChange={e => setNewResponseText(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        <button type="submit" className="p-2 bg-primary text-white rounded-xl cursor-pointer hover:bg-primary-600 transition-colors">
                          <Check size={15} />
                        </button>
                        <button type="button" onClick={() => { setShowAddResponse(false); setNewResponseText(''); }}
                          className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <X size={15} className="text-slate-500" />
                        </button>
                      </form>
                    ) : (
                      <button onClick={() => setShowAddResponse(true)}
                        className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer ml-4">
                        <Plus size={13} /> Add response
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!selectedObjection && (
              <div className="px-6 py-8 text-center text-sm text-slate-400">
                Click an objection above to see responses
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
