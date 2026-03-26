import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, CheckCircle, Clock,
         Zap, RotateCcw, AlertCircle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const TASK_TYPES = {
  watch:    { icon:'🎥', label:'Watch Video',   color:'#FF6B6B', bg:'rgba(255,107,107,0.08)' },
  read:     { icon:'📖', label:'Read Article',  color:'#4A9EFF', bg:'rgba(74,158,255,0.08)' },
  coding:   { icon:'💻', label:'Coding',        color:'#00FF94', bg:'rgba(0,255,148,0.08)' },
  practice: { icon:'🔨', label:'Practice',      color:'#7B61FF', bg:'rgba(123,97,255,0.08)' },
  test:     { icon:'📝', label:'Take Test',     color:'#FFB347', bg:'rgba(255,179,71,0.08)' },
  project:  { icon:'🚀', label:'Project',       color:'#FFD700', bg:'rgba(255,215,0,0.08)' },
};

const MIN_TIME_SECONDS = 180;

const TaskTimer = ({ taskId, onComplete, onStart }) => {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const handleStart = () => {
    setRunning(true);
    setStarted(true);
    if (onStart) onStart();
  };

  const handlePause = () => setRunning(false);
  const handleResume = () => setRunning(true);

  const handleComplete = () => {
    if (elapsed < MIN_TIME_SECONDS) {
      const remaining = MIN_TIME_SECONDS - elapsed;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      toast.error(
        `Work ${mins > 0 ? `${mins}m ` : ''}${secs}s more before completing!`
      );
      return;
    }
    setRunning(false);
    onComplete(Math.round(elapsed / 60));
  };

  const pct = Math.min(100, (elapsed / MIN_TIME_SECONDS) * 100);
  const ready = elapsed >= MIN_TIME_SECONDS;

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  if (!started) {
    return (
      <button onClick={handleStart}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
        style={{ background:'rgba(74,158,255,0.1)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,0.25)' }}>
        <Play size={11}/> Start Task
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      {/* Timer ring */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
          <circle cx="20" cy="20" r="16"
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3"/>
          <circle cx="20" cy="20" r="16"
            fill="none" strokeWidth="3"
            stroke={ready ? '#00FF94' : '#FFB347'}
            strokeLinecap="round"
            strokeDasharray={`${pct * 1.005} 100.5`}
            style={{ transition:'stroke-dasharray 0.5s, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold font-mono"
            style={{ color: ready ? '#00FF94' : '#FFB347', fontSize:'8px' }}>
            {formatTime(elapsed)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {running ? (
          <button onClick={handlePause}
            className="px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-warning transition-colors"
            style={{ border:'1px solid rgba(34,34,51,0.6)' }}>
            ⏸ Pause
          </button>
        ) : (
          <button onClick={handleResume}
            className="px-2 py-1 rounded-lg text-xs transition-all"
            style={{ background:'rgba(74,158,255,0.1)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,0.2)' }}>
            ▶ Resume
          </button>
        )}
        <button onClick={handleComplete}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={ready ? {
            background:'rgba(0,255,148,0.12)',
            color:'#00FF94',
            border:'1px solid rgba(0,255,148,0.3)',
            boxShadow:'0 0 10px rgba(0,255,148,0.15)',
          } : {
            background:'rgba(34,34,51,0.5)',
            color:'#444',
            border:'1px solid rgba(34,34,51,0.6)',
            cursor:'not-allowed',
          }}>
          <CheckCircle size={11}/>
          {ready ? 'Complete ✓' : `${formatTime(MIN_TIME_SECONDS - elapsed)} left`}
        </button>
      </div>
    </div>
  );
};

const Tasks = () => {
  const { profile, setProfile } = useStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('today');
  const [activeNode, setActiveNode] = useState(null);
  const [completedTimers, setCompletedTimers] = useState({});

  useEffect(() => {
    if (profile?.id) {
      fetchTasks();
      fetchActiveNode();
    }
  }, [profile?.id, activeTab]);

  const fetchActiveNode = async () => {
    try {
      const { data: rms } = await supabase
        .from('roadmaps').select('id')
        .eq('student_id', profile.id).limit(1);
      if (!rms?.length) return;

      const { data: nodes } = await supabase
        .from('roadmap_nodes').select('*')
        .eq('roadmap_id', rms[0].id)
        .neq('status', 'locked')
        .order('order_index', { ascending: true })
        .limit(1);

      if (nodes?.length) {
        setActiveNode(nodes[0]);
        return;
      }

      const { data: first } = await supabase
        .from('roadmap_nodes').select('*')
        .eq('roadmap_id', rms[0].id)
        .order('order_index', { ascending: true })
        .limit(1);
      if (first?.length) setActiveNode(first[0]);
    } catch(e) { console.error(e); }
  };

  const fetchTasks = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('tasks').select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) { setTasks([]); setLoading(false); return; }

      const all = data || [];
      if (activeTab === 'today') {
        setTasks(all.filter(t => !t.due_date || t.due_date === today));
      } else {
        setTasks(all);
      }
    } catch(e) { setTasks([]); }
    setLoading(false);
  };

  const generateTasks = async () => {
    if (!profile?.id) return;
    setGenerating(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('tasks').select('id')
        .eq('student_id', profile.id)
        .eq('due_date', today);

      if (existing?.length > 0) {
        toast('Today\'s tasks already generated! ✅');
        setGenerating(false);
        fetchTasks();
        return;
      }

      if (!activeNode) {
        toast.error('Generate your roadmap first!');
        setGenerating(false);
        return;
      }

      const hours = profile?.study_hours || 2;
      const taskCount = hours <= 1 ? 1 : hours === 2 ? 2 : hours === 3 ? 3 : 4;

      const templates = [
        {
          title: `🎥 Watch: ${activeNode.title}`,
          description: `Watch "${activeNode.video_title || activeNode.title}" on YouTube. Take notes on key concepts. Pause and replay difficult parts.${activeNode.video_url ? ` Link: ${activeNode.video_url}` : ''}`,
          type: 'watch',
          estimated_minutes: 60,
        },
        {
          title: `📖 Read: ${activeNode.article_title || activeNode.title + ' documentation'}`,
          description: `Read the article or documentation for ${activeNode.title}. Focus on understanding the core concepts and make notes.${activeNode.article_url ? ` Link: ${activeNode.article_url}` : ''}`,
          type: 'read',
          estimated_minutes: 30,
        },
        {
          title: `💻 Code: ${activeNode.mini_project || 'Practice ' + activeNode.title}`,
          description: `Apply ${activeNode.title} by building: ${activeNode.mini_project || 'a small working example'}. Push your code to GitHub when done.`,
          type: 'coding',
          estimated_minutes: 60,
        },
        {
          title: `🔨 Practice: ${activeNode.coding_resource_title || activeNode.title + ' exercises'}`,
          description: `Do hands-on practice on ${activeNode.coding_resource_title || activeNode.title}.${activeNode.coding_resource_url ? ` Link: ${activeNode.coding_resource_url}` : ''} Complete at least 3 exercises.`,
          type: 'practice',
          estimated_minutes: 45,
        },
      ];

      const toCreate = templates.slice(0, taskCount);

      const { error: insErr } = await supabase.from('tasks').insert(
        toCreate.map(t => ({
          student_id: profile.id,
          node_id: activeNode.id,
          title: t.title,
          description: t.description,
          type: t.type,
          status: 'pending',
          due_date: today,
          created_at: new Date().toISOString(),
        }))
      );

      if (insErr) {
        toast.error('Error: ' + insErr.message);
      } else {
        toast.success(`${toCreate.length} tasks ready for today! 🎯`);
        fetchTasks();
      }
    } catch(e) {
      console.error(e);
      toast.error('Failed to generate tasks');
    }
    setGenerating(false);
  };

  const completeTask = async (taskId, timeSpent) => {
    try {
      const { error } = await supabase.from('tasks').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        time_spent_minutes: timeSpent || 25,
        score_earned: 8,
      }).eq('id', taskId);

      if (!error) {
        const newScore = Math.min(1000, (profile.skill_score||0) + 8);
        await supabase.from('profiles').update({
          skill_score: newScore,
        }).eq('id', profile.id);

        const { data: fresh } = await supabase
          .from('profiles').select('*')
          .eq('id', profile.id).single();
        if (fresh) setProfile(fresh);

        setCompletedTimers(prev => ({ ...prev, [taskId]: true }));
        toast.success('Task completed! +8 Genois Score 🎯');
        fetchTasks();
      }
    } catch(e) {
      console.error(e);
      toast.error('Failed to complete task');
    }
  };

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday:'long', month:'long', day:'numeric'
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              ⚡ Daily Tasks
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{todayStr}</p>
          </div>
          <button onClick={generateTasks} disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
            style={{
              background: generating
                ? 'rgba(0,255,148,0.05)'
                : 'linear-gradient(135deg,#00FF94,#7B61FF)',
              color: '#050508',
              boxShadow: generating ? 'none' : '0 0 15px rgba(0,255,148,0.3)',
            }}>
            {generating ? (
              <>
                <div className="w-3 h-3 border-2 border-dark-900 border-t-transparent rounded-full animate-spin"/>
                Generating...
              </>
            ) : (
              <><Zap size={14}/> Generate Today's Tasks</>
            )}
          </button>
        </div>

        {/* Active node info */}
        {activeNode && (
          <div className="p-3 rounded-xl mb-4"
            style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.1)' }}>
            <p className="text-xs text-gray-400">
              📍 Currently on:
              <span className="text-primary font-semibold ml-1">
                Day {activeNode.day_number || activeNode.order_index+1}: {activeNode.title}
              </span>
            </p>
          </div>
        )}

        {/* Timer info */}
        <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl"
          style={{ background:'rgba(255,179,71,0.05)', border:'1px solid rgba(255,179,71,0.12)' }}>
          <AlertCircle size={12} className="text-warning flex-shrink-0"/>
          <p className="text-xs text-gray-500">
            <span className="text-warning font-semibold">Anti-cheat timer:</span>
            {' '}Each task requires minimum 3 minutes of work before completion.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id:'today', label:'Today' },
            { id:'all', label:'All Tasks' },
          ].map(tab => (
            <button key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={activeTab === tab.id ? {
                background:'#00FF94', color:'#050508',
              } : {
                background:'rgba(10,10,18,0.8)',
                color:'#555',
                border:'1px solid rgba(34,34,51,0.5)',
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Progress */}
        {totalCount > 0 && activeTab === 'today' && (
          <div className="p-3 rounded-xl mb-4"
            style={{ background:'rgba(10,10,18,0.8)', border:'1px solid rgba(34,34,51,0.5)' }}>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-500">Today's Progress</span>
              <span style={{ color:'#00FF94' }}>
                {completedCount}/{totalCount} done
              </span>
            </div>
            <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
              <motion.div
                animate={{ width:`${totalCount > 0 ? (completedCount/totalCount)*100 : 0}%` }}
                transition={{ duration:0.8 }}
                className="h-full rounded-full"
                style={{ background:'linear-gradient(90deg,#00FF94,#7B61FF)' }}
              />
            </div>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-24 rounded-2xl animate-pulse"
                style={{ background:'rgba(18,18,26,0.8)' }}/>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-bold text-white font-heading mb-2">
              No tasks yet
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {activeNode
                ? 'Click Generate to get your tasks for today'
                : 'Choose your domain and generate a roadmap first'}
            </p>
            {!activeNode ? (
              <a href="/explore-domains"
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
                style={{ background:'#00FF94' }}>
                Choose Domain →
              </a>
            ) : (
              <button onClick={generateTasks} disabled={generating}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900 disabled:opacity-50"
                style={{ background:'#00FF94', boxShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
                Generate Tasks ⚡
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const tc = TASK_TYPES[task.type] || TASK_TYPES['coding'];
              const isDone = task.status === 'completed';
              return (
                <motion.div key={task.id}
                  initial={{ opacity:0, y:8 }}
                  animate={{ opacity:1, y:0 }}
                  transition={{ delay:i*0.05 }}
                  className="p-4 rounded-2xl transition-all"
                  style={{
                    background: isDone
                      ? 'rgba(0,255,148,0.03)'
                      : 'rgba(10,10,18,0.9)',
                    border: isDone
                      ? '1px solid rgba(0,255,148,0.15)'
                      : '1px solid rgba(34,34,51,0.6)',
                    opacity: isDone ? 0.75 : 1,
                  }}>
                  <div className="flex items-start gap-3">

                    {/* Type icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                      style={{ background:tc.bg, border:`1px solid ${tc.color}20` }}>
                      {tc.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-semibold leading-tight ${
                          isDone ? 'line-through text-gray-500' : 'text-white'
                        }`}>
                          {task.title}
                        </h3>
                        {isDone && (
                          <CheckCircle size={15} className="text-primary flex-shrink-0 mt-0.5"/>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background:tc.bg, color:tc.color }}>
                          {tc.label}
                        </span>
                        {isDone && task.time_spent_minutes > 0 && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Clock size={10}/>
                            {task.time_spent_minutes} min spent
                          </span>
                        )}
                        {isDone && (
                          <span className="text-xs text-primary font-semibold">
                            +8 pts earned
                          </span>
                        )}
                      </div>

                      {/* Timer */}
                      {!isDone && (
                        <TaskTimer
                          taskId={task.id}
                          onStart={() => {}}
                          onComplete={(timeSpent) => completeTask(task.id, timeSpent)}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Bottom info */}
        {tasks.length > 0 && (
          <div className="mt-4 p-3 rounded-xl text-center"
            style={{ background:'rgba(10,10,18,0.5)', border:'1px solid rgba(34,34,51,0.4)' }}>
            <p className="text-xs text-gray-600">
              Each completed task gives
              <span className="text-primary font-bold mx-1">+8 Genois Score</span>
              · Minimum 3 minutes required · Anti-cheat enabled
            </p>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Tasks;
