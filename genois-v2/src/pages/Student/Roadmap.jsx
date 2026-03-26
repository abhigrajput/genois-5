import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Lock, PlayCircle,
         ExternalLink, Code, BookOpen,
         ChevronRight, Trophy, Zap } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const Roadmap = () => {
  const { profile, setProfile } = useStore();
  const [roadmap, setRoadmap] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [view, setView] = useState('roadmap');

  useEffect(() => {
    if (profile?.id) fetchRoadmap();
  }, [profile?.id]);

  const fetchRoadmap = async () => {
    setLoading(true);
    try {
      const { data: rms } = await supabase
        .from('roadmaps').select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!rms?.length) {
        setLoading(false);
        return;
      }

      const { data: nd } = await supabase
        .from('roadmap_nodes').select('*')
        .eq('roadmap_id', rms[0].id)
        .order('order_index', { ascending: true });

      setRoadmap(rms[0]);
      const all = nd || [];
      setNodes(all);
      const active = all.find(n => n.status === 'unlocked') || all[0];
      setSelected(active);
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const completeDay = async (node) => {
    if (completing) return;
    setCompleting(true);

    try {
      await supabase.from('roadmap_nodes')
        .update({ status:'completed', completed_at: new Date().toISOString() })
        .eq('id', node.id);

      const next = nodes.find(n => n.order_index === node.order_index + 1);
      if (next) {
        await supabase.from('roadmap_nodes')
          .update({ status:'unlocked' }).eq('id', next.id);
        toast.success(`Day ${next.day_number} unlocked! 🔓`);
      } else {
        toast.success('🎉 Roadmap complete! You are job-ready!');
      }

      const newScore = Math.min(1000, (profile.skill_score||0) + 15);
      const newDay = (profile.current_day||1) + 1;
      await supabase.from('profiles').update({
        skill_score: newScore,
        current_day: newDay,
      }).eq('id', profile.id);

      const { data: fresh } = await supabase
        .from('profiles').select('*')
        .eq('id', profile.id).single();
      if (fresh) setProfile(fresh);

      toast.success('+15 Genois Score! 🎯', { duration:1500 });
      fetchRoadmap();
    } catch(e) {
      console.error(e);
      toast.error('Failed to complete day');
    }
    setCompleting(false);
  };

  const done = nodes.filter(n => n.status === 'completed').length;
  const pct = nodes.length > 0 ? Math.round((done/nodes.length)*100) : 0;
  const projects = nodes.filter(n => n.project_brief);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-dark-600 border-t-primary rounded-full animate-spin"/>
      </div>
    </DashboardLayout>
  );

  if (!roadmap || nodes.length === 0) return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-bold text-white font-heading mb-3">
          No Roadmap Yet
        </h2>
        <p className="text-gray-400 text-sm mb-6">
          Choose your domain to generate your personalized day-by-day roadmap
          with YouTube resources, coding practice, and projects.
        </p>
        <a href="/explore-domains"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-dark-900"
          style={{ background:'#00FF94', boxShadow:'0 0 20px rgba(0,255,148,0.4)' }}>
          Choose Domain & Generate Roadmap →
        </a>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              🗺️ {roadmap.title}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Day {profile?.current_day||1} of {nodes.length} ·
              {done} complete · {pct}%
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id:'roadmap', label:'📅 Day Map' },
              { id:'projects', label:`🔨 Projects (${projects.length})` },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={view === v.id ? {
                  background:'#00FF94', color:'#050508',
                  boxShadow:'0 0 12px rgba(0,255,148,0.4)',
                } : {
                  background:'rgba(10,10,18,0.8)',
                  color:'#555',
                  border:'1px solid rgba(34,34,51,0.6)',
                }}>
                {v.label}
              </button>
            ))}
            <a href="/explore-domains"
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.25)' }}>
              Change Domain
            </a>
          </div>
        </div>

        {/* Progress bar */}
        <div className="p-3 rounded-xl mb-4"
          style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.1)' }}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-500">Overall Progress</span>
            <span style={{ color:'#00FF94' }}>{pct}% — {done} of {nodes.length} days</span>
          </div>
          <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${pct}%` }}
              transition={{ duration:1.5, ease:'easeOut' }}
              className="h-full rounded-full"
              style={{ background:'linear-gradient(90deg,#00FF94,#7B61FF)' }}
            />
          </div>
        </div>

        {/* ROADMAP VIEW */}
        {view === 'roadmap' && (
          <div className="flex gap-4">

            {/* Left: day list */}
            <div className="w-56 flex-shrink-0 space-y-1 overflow-y-auto"
              style={{ maxHeight:'70vh' }}>
              {nodes.map((node, i) => {
                const isSel = selected?.id === node.id;
                const col = node.status === 'completed' ? '#00FF94'
                  : node.status === 'unlocked' ? '#7B61FF'
                  : '#1A1A27';
                return (
                  <button key={node.id}
                    onClick={() => node.status !== 'locked' && setSelected(node)}
                    disabled={node.status === 'locked'}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: isSel
                        ? 'rgba(0,255,148,0.08)'
                        : 'rgba(10,10,18,0.8)',
                      border:`1px solid ${isSel
                        ? 'rgba(0,255,148,0.3)'
                        : 'rgba(34,34,51,0.5)'}`,
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background:`${col}15`, color:col, border:`1px solid ${col}25` }}>
                      {node.status === 'completed' ? '✓'
                        : node.status === 'locked' ? '🔒'
                        : node.day_number || i+1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white leading-tight truncate">
                        Day {node.day_number || i+1}
                      </p>
                      <p className="text-xs text-gray-600 truncate">{node.title}</p>
                    </div>
                    {node.project_brief && (
                      <span className="text-warning text-xs flex-shrink-0">🔨</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right: day detail */}
            {selected ? (
              <AnimatePresence mode="wait">
                <motion.div key={selected.id}
                  initial={{ opacity:0, x:10 }}
                  animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-10 }}
                  transition={{ duration:0.15 }}
                  className="flex-1 space-y-3 overflow-y-auto"
                  style={{ maxHeight:'70vh' }}>

                  {/* Day header */}
                  <div className="p-5 rounded-2xl"
                    style={{
                      background:'rgba(10,10,18,0.95)',
                      border:'1px solid rgba(0,255,148,0.15)',
                    }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base flex-shrink-0"
                        style={{
                          background:'rgba(0,255,148,0.1)',
                          color:'#00FF94',
                          border:'1px solid rgba(0,255,148,0.25)',
                          boxShadow:'0 0 12px rgba(0,255,148,0.15)',
                        }}>
                        {selected.day_number || selected.order_index+1}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">
                          Day {selected.day_number || selected.order_index+1}
                          {selected.topic && ` · ${selected.topic}`}
                        </p>
                        <h2 className="font-bold text-white font-heading">
                          {selected.title}
                        </h2>
                      </div>
                      {selected.status === 'completed' && (
                        <span className="px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
                          style={{ background:'rgba(0,255,148,0.12)', color:'#00FF94' }}>
                          ✅ Done
                        </span>
                      )}
                    </div>

                    {/* Skills */}
                    {selected.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {selected.skills.map((s,i) => (
                          <span key={i}
                            className="px-2 py-0.5 rounded-md text-xs font-medium"
                            style={{ background:'rgba(123,97,255,0.1)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.15)' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Today task */}
                    {selected.mini_project && (
                      <div className="p-3 rounded-xl mb-3"
                        style={{ background:'rgba(74,158,255,0.06)', border:'1px solid rgba(74,158,255,0.15)' }}>
                        <p className="text-xs font-bold text-blue-400 mb-1">
                          📝 Today's Mini Task
                        </p>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          {selected.mini_project}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    {selected.status === 'unlocked' && (
                      <button
                        onClick={() => completeDay(selected)}
                        disabled={completing}
                        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{
                          background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                          color:'#050508',
                          boxShadow:'0 0 20px rgba(0,255,148,0.3)',
                        }}>
                        {completing ? (
                          <div className="w-4 h-4 border-2 border-dark-900 border-t-transparent rounded-full animate-spin"/>
                        ) : (
                          <><CheckCircle size={14}/> Mark Day Complete — Unlock Next</>
                        )}
                      </button>
                    )}

                    {selected.status === 'locked' && (
                      <div className="w-full py-3 rounded-xl text-center text-xs text-gray-600"
                        style={{ background:'rgba(18,18,26,0.5)', border:'1px solid rgba(34,34,51,0.5)' }}>
                        🔒 Complete previous day to unlock this
                      </div>
                    )}

                    {selected.status === 'completed' && (
                      <div className="w-full py-3 rounded-xl text-center text-xs font-bold"
                        style={{ background:'rgba(0,255,148,0.06)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.2)' }}>
                        ✅ Day Completed! +15 points earned
                      </div>
                    )}
                  </div>

                  {/* RESOURCES SECTION */}
                  <div className="p-4 rounded-2xl space-y-3"
                    style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      📚 Learning Resources
                    </p>

                    {/* YouTube Video */}
                    {selected.video_url && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                          <PlayCircle size={11} className="text-danger"/> Video Lecture
                        </p>
                        <a href={selected.video_url}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 group"
                          style={{ background:'rgba(255,107,107,0.06)', border:'1px solid rgba(255,107,107,0.15)' }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background:'rgba(255,0,0,0.15)' }}>
                            <PlayCircle size={18} className="text-danger"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {selected.video_title}
                            </p>
                            <p className="text-xs text-danger mt-0.5">
                              YouTube · {selected.video_duration}
                            </p>
                          </div>
                          <ExternalLink size={12} className="text-gray-600 flex-shrink-0 group-hover:text-white transition-colors"/>
                        </a>
                      </div>
                    )}

                    {/* Article/Docs */}
                    {selected.article_url && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                          <BookOpen size={11} className="text-secondary"/> Article / Documentation
                        </p>
                        <a href={selected.article_url}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 group"
                          style={{ background:'rgba(123,97,255,0.06)', border:'1px solid rgba(123,97,255,0.15)' }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background:'rgba(123,97,255,0.15)' }}>
                            <BookOpen size={16} className="text-secondary"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {selected.article_title}
                            </p>
                            <p className="text-xs text-secondary mt-0.5">
                              Read · Documentation
                            </p>
                          </div>
                          <ExternalLink size={12} className="text-gray-600 flex-shrink-0 group-hover:text-white transition-colors"/>
                        </a>
                      </div>
                    )}

                    {/* Coding Resource */}
                    {selected.coding_resource_url && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1">
                          <Code size={11} className="text-primary"/> Coding Practice
                        </p>
                        <a href={selected.coding_resource_url}
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80 group"
                          style={{ background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.15)' }}>
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background:'rgba(0,255,148,0.15)' }}>
                            <Code size={16} className="text-primary"/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {selected.coding_resource_title}
                            </p>
                            <p className="text-xs text-primary mt-0.5">
                              Practice · Hands-on Coding
                            </p>
                          </div>
                          <ExternalLink size={12} className="text-gray-600 flex-shrink-0 group-hover:text-white transition-colors"/>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Project Brief */}
                  {selected.project_brief && (
                    <div className="p-4 rounded-2xl"
                      style={{ background:'rgba(255,179,71,0.05)', border:'1px solid rgba(255,179,71,0.25)' }}>
                      <p className="text-sm font-bold text-warning mb-3 flex items-center gap-2">
                        🔨 Project Challenge
                      </p>
                      <p className="text-xs text-gray-300 leading-relaxed mb-3">
                        {selected.project_brief}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <a href="https://github.com/new"
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.2)' }}>
                          📂 Create GitHub Repo
                        </a>
                        <a href="/student/projects"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.2)' }}>
                          ➕ Add to Profile
                        </a>
                      </div>
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-600 text-sm">
                  Select a day from the left to view content
                </p>
              </div>
            )}
          </div>
        )}

        {/* PROJECTS VIEW */}
        {view === 'projects' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl"
              style={{ background:'rgba(255,179,71,0.05)', border:'1px solid rgba(255,179,71,0.18)' }}>
              <p className="text-xs font-bold text-warning mb-1">
                🔨 Domain Projects — Build These From Scratch
              </p>
              <p className="text-xs text-gray-500">
                Build each project, push to GitHub, verify commits.
                Companies trust GitHub-verified projects over certificates.
              </p>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">
                  No projects in roadmap.
                  <a href="/explore-domains" className="text-primary ml-1">
                    Choose domain →
                  </a>
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {projects.map((node, i) => {
                  const unlocked = node.status !== 'locked';
                  const isDone = node.status === 'completed';
                  return (
                    <motion.div key={node.id}
                      initial={{ opacity:0, y:10 }}
                      animate={{ opacity:1, y:0 }}
                      transition={{ delay:i*0.08 }}
                      className="p-5 rounded-2xl"
                      style={{
                        background:'rgba(10,10,18,0.9)',
                        border: isDone
                          ? '1px solid rgba(0,255,148,0.3)'
                          : unlocked
                          ? '1px solid rgba(255,179,71,0.3)'
                          : '1px solid rgba(34,34,51,0.4)',
                        opacity: unlocked ? 1 : 0.5,
                        boxShadow: isDone
                          ? '0 0 15px rgba(0,255,148,0.06)'
                          : 'none',
                      }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
                            style={{ background:'rgba(255,179,71,0.1)', border:'1px solid rgba(255,179,71,0.2)', color:'#FFB347' }}>
                            {i+1}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              Project {i+1}
                            </p>
                            <p className="text-xs text-gray-600">
                              Day {node.day_number || node.order_index+1}
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isDone ? 'bg-success/15 text-success'
                            : unlocked ? 'bg-warning/15 text-warning'
                            : 'bg-dark-600 text-gray-600'
                        }`}>
                          {isDone ? '✅ Built'
                            : unlocked ? '🔨 Build Now'
                            : '🔒 Locked'}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-white mb-2">
                        {node.title}
                      </h3>

                      <div className="p-3 rounded-xl mb-3"
                        style={{ background:'rgba(255,179,71,0.04)', border:'1px solid rgba(255,179,71,0.1)' }}>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {node.project_brief}
                        </p>
                      </div>

                      {unlocked && (
                        <div className="flex gap-2">
                          <a href="https://github.com/new"
                            target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.15)' }}>
                            📂 GitHub
                          </a>
                          <a href="/student/projects"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                            style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.15)' }}>
                            ➕ Add to Profile
                          </a>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Roadmap;
