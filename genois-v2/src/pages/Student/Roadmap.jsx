import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import { getDomain } from '../../data/domains';
import DashboardLayout from '../../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  completed: { bg: 'rgba(0,255,148,0.12)', border: 'rgba(0,255,148,0.3)', color: '#00FF94', label: 'Done' },
  in_progress: { bg: 'rgba(123,97,255,0.12)', border: 'rgba(123,97,255,0.3)', color: '#7B61FF', label: 'In Progress' },
  pending: { bg: 'rgba(34,34,51,0.6)', border: 'rgba(34,34,51,0.8)', color: '#555', label: 'Pending' },
};

const TaskCard = ({ task, onStatusChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const st = STATUS_STYLES[task.status] || STATUS_STYLES.pending;
  const isProject = !!task.project_brief;

  const cycleStatus = async (e) => {
    e.stopPropagation();
    setUpdating(true);
    const next = task.status === 'pending' ? 'in_progress'
      : task.status === 'in_progress' ? 'completed' : 'pending';
    const { error } = await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    if (error) toast.error('Update failed');
    else onStatusChange(task.id, next);
    setUpdating(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(8,8,14,0.92)',
        border: `1px solid ${task.status === 'completed' ? 'rgba(0,255,148,0.18)' : isProject ? 'rgba(123,97,255,0.2)' : 'rgba(34,34,51,0.6)'}`,
        opacity: task.status === 'completed' ? 0.7 : 1,
      }}>

      {/* Card top */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}>

        {/* Day badge */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 font-mono"
          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
          {task.status === 'completed' ? '✓' : task.day}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-gray-600 font-mono">Day {task.day}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(0,255,148,0.08)', color: '#00FF94' }}>
              {task.topic}
            </span>
            {isProject && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(123,97,255,0.12)', color: '#7B61FF' }}>
                🏗️ PROJECT
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">{task.title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{task.mini_project}</p>
          {/* Skills */}
          <div className="flex flex-wrap gap-1 mt-2">
            {(task.skills || []).map(skill => (
              <span key={skill} className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'rgba(34,34,51,0.8)', color: '#888' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Status toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={cycleStatus}
            disabled={updating}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:opacity-80 disabled:opacity-50"
            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
            {updating ? '...' : st.label}
          </button>
          <span className="text-gray-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 pb-4 space-y-3 border-t"
          style={{ borderColor: 'rgba(34,34,51,0.5)' }}>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-3">
            {/* Video */}
            {task.video_url && (
              <a href={task.video_url} target="_blank" rel="noreferrer"
                className="flex items-start gap-2 p-3 rounded-xl group hover:opacity-90 transition-all"
                style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)' }}>
                <span className="text-lg flex-shrink-0">▶️</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-red-400 group-hover:underline truncate">{task.video_title}</div>
                  <div className="text-xs text-gray-600">{task.video_duration}</div>
                </div>
              </a>
            )}

            {/* Article */}
            {task.article_url && (
              <a href={task.article_url} target="_blank" rel="noreferrer"
                className="flex items-start gap-2 p-3 rounded-xl group hover:opacity-90 transition-all"
                style={{ background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.15)' }}>
                <span className="text-lg flex-shrink-0">📖</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-blue-400 group-hover:underline truncate">{task.article_title}</div>
                  <div className="text-xs text-gray-600">Read</div>
                </div>
              </a>
            )}

            {/* Practice */}
            {task.coding_resource_url && (
              <a href={task.coding_resource_url} target="_blank" rel="noreferrer"
                className="flex items-start gap-2 p-3 rounded-xl group hover:opacity-90 transition-all"
                style={{ background: 'rgba(0,255,148,0.06)', border: '1px solid rgba(0,255,148,0.15)' }}>
                <span className="text-lg flex-shrink-0">💻</span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-primary group-hover:underline truncate">{task.coding_resource_title}</div>
                  <div className="text-xs text-gray-600">Practice</div>
                </div>
              </a>
            )}
          </div>

          {/* Project Brief */}
          {task.project_brief && (
            <div className="p-3 rounded-xl"
              style={{ background: 'rgba(123,97,255,0.06)', border: '1px solid rgba(123,97,255,0.2)' }}>
              <div className="text-xs font-bold text-secondary mb-2">🏗️ Project Brief</div>
              <p className="text-xs text-gray-400 leading-relaxed">{task.project_brief}</p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

const Roadmap = () => {
  const { user, profile } = useStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const domain = profile?.domain_id ? getDomain(profile.domain_id) : null;

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('day', { ascending: true });
      setTasks(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const handleStatusChange = (id, newStatus) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const projects = tasks.filter(t => t.project_brief);
  const pct = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const filtered = filter === 'all' ? tasks
    : filter === 'projects' ? tasks.filter(t => t.project_brief)
    : tasks.filter(t => t.status === filter);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-dark-500 border-t-primary rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  if (tasks.length === 0) return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-xl font-bold text-white font-heading mb-2">No Roadmap Yet</h2>
        <p className="text-gray-500 text-sm mb-6">Pick your domain and we'll generate your personalized learning path.</p>
        <Link to="/explore-domains" className="btn-neon px-8 py-3 rounded-xl font-bold text-sm">
          Explore Domains →
        </Link>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white mb-1"
              style={{ textShadow: '0 0 15px rgba(0,255,148,0.2)' }}>
              {domain ? `${domain.icon} ${domain.name}` : 'My Roadmap'}
            </h1>
            <p className="text-gray-500 text-sm">
              {completed}/{tasks.length} days completed · {inProgress} in progress
              {projects.length > 0 && ` · ${projects.length} projects`}
            </p>
          </div>
          <Link to="/explore-domains"
            className="text-xs text-gray-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg"
            style={{ border: '1px solid rgba(34,34,51,0.6)' }}>
            Change Domain
          </Link>
        </div>

        {/* Progress bar */}
        <div className="p-4 rounded-2xl mb-6"
          style={{ background: 'rgba(8,8,14,0.9)', border: '1px solid rgba(34,34,51,0.6)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">Overall Progress</span>
            <span className="text-sm font-bold text-primary font-mono">{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(34,34,51,0.8)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #00FF94, #7B61FF)' }} />
          </div>
          {/* Stats row */}
          <div className="flex gap-4 mt-3">
            {[
              { label: 'Completed', value: completed, color: '#00FF94' },
              { label: 'In Progress', value: inProgress, color: '#7B61FF' },
              { label: 'Remaining', value: tasks.length - completed - inProgress, color: '#555' },
              { label: 'Projects', value: projects.length, color: '#FFB347' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-sm font-bold font-mono" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-gray-600">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {[
            { id: 'all', label: `All (${tasks.length})` },
            { id: 'pending', label: `Pending (${tasks.filter(t=>t.status==='pending').length})` },
            { id: 'in_progress', label: `In Progress (${inProgress})` },
            { id: 'completed', label: `Done (${completed})` },
            { id: 'projects', label: `Projects (${projects.length})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
              style={{
                background: filter === f.id ? 'rgba(0,255,148,0.1)' : 'rgba(10,10,18,0.9)',
                border: `1px solid ${filter === f.id ? 'rgba(0,255,148,0.35)' : 'rgba(34,34,51,0.6)'}`,
                color: filter === f.id ? '#00FF94' : '#666',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">No tasks in this filter.</div>
          ) : (
            filtered.map((task, i) => (
              <TaskCard key={task.id || i} task={task} onStatusChange={handleStatusChange} />
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Roadmap;
