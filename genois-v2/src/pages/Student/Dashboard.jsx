import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Target, Zap,
         CheckCircle, AlertCircle,
         ChevronRight, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import {
  AreaChart, Area, XAxis, YAxis,
  Tooltip, ResponsiveContainer
} from 'recharts';

const TIER = (s) => {
  if (s >= 801) return { label:'Elite',      color:'#FFD700', glow:'rgba(255,215,0,0.3)' };
  if (s >= 601) return { label:'Advanced',   color:'#7B61FF', glow:'rgba(123,97,255,0.3)' };
  if (s >= 401) return { label:'Proficient', color:'#00FF94', glow:'rgba(0,255,148,0.3)' };
  if (s >= 201) return { label:'Developing', color:'#4A9EFF', glow:'rgba(74,158,255,0.3)' };
  return               { label:'Beginner',   color:'#555',    glow:'rgba(85,85,85,0.1)' };
};

const Dashboard = () => {
  const { profile, setProfile } = useStore();
  const [stats, setStats] = useState({
    tasksToday: 0,
    tasksDone: 0,
    testsTotal: 0,
    testsPassed: 0,
    nodesTotal: 0,
    nodesDone: 0,
    projectsTotal: 0,
    projectsVerified: 0,
  });
  const [scoreHistory, setScoreHistory] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [activeNode, setActiveNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchAll();
      updateStreak();
    }
  }, [profile?.id]);

  const updateStreak = async () => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = profile?.last_active_date;
    if (lastActive === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = lastActive === yesterdayStr
      ? (profile.streak_count || 0) + 1
      : 1;

    const longest = Math.max(newStreak, profile.longest_streak || 0);

    await supabase.from('profiles').update({
      streak_count: newStreak,
      longest_streak: longest,
      last_active_date: today,
    }).eq('id', profile.id);

    const { data: fresh } = await supabase
      .from('profiles').select('*')
      .eq('id', profile.id).single();
    if (fresh) setProfile(fresh);
  };

  const fetchAll = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      const [
        taskRes, testRes, nodeRes,
        projRes, histRes,
      ] = await Promise.all([
        supabase.from('tasks').select('*')
          .eq('student_id', profile.id)
          .eq('due_date', today),
        supabase.from('tests').select('*')
          .eq('student_id', profile.id),
        supabase.from('roadmap_nodes')
          .select('*, roadmaps!inner(student_id)')
          .eq('roadmaps.student_id', profile.id),
        supabase.from('projects').select('*')
          .eq('student_id', profile.id),
        supabase.from('score_history').select('*')
          .eq('student_id', profile.id)
          .order('recorded_at', { ascending: true })
          .limit(14),
      ]);

      const tasks = taskRes.data || [];
      const tests = testRes.data || [];
      const nodes = nodeRes.data || [];
      const projects = projRes.data || [];

      const tasksDone = tasks.filter(t => t.status === 'completed').length;
      const testsPassed = tests.filter(t => t.passed).length;
      const nodesDone = nodes.filter(n => n.status === 'completed').length;
      const projectsVerified = projects.filter(p => p.verified).length;

      setStats({
        tasksToday: tasks.length,
        tasksDone,
        testsTotal: tests.length,
        testsPassed,
        nodesTotal: nodes.length,
        nodesDone,
        projectsTotal: projects.length,
        projectsVerified,
      });

      setTodayTasks(tasks.slice(0, 3));
      setRecentTests(tests.slice(0, 3));

      // Score history graph
      const hist = histRes.data || [];
      const score = Math.round(profile?.skill_score || 0);
      if (hist.length > 0) {
        setScoreHistory(hist.map(h => ({
          day: new Date(h.recorded_at).toLocaleDateString('en-IN', {
            month:'short', day:'numeric'
          }),
          score: h.score,
        })));
      } else {
        setScoreHistory([
          { day:'Day 1', score: 0 },
          { day:'Day 3', score: Math.round(score * 0.3) },
          { day:'Day 7', score: Math.round(score * 0.6) },
          { day:'Today', score },
        ]);
      }

      // Save score to history
      await supabase.from('score_history').upsert({
        student_id: profile.id,
        score: Math.round(profile.skill_score || 0),
        tasks_done: tasksDone,
        tests_passed: testsPassed,
        projects_done: projects.length,
        recorded_at: today,
      }, { onConflict: 'student_id,recorded_at' });

      // Active node
      const unlocked = nodes.find(n => n.status === 'unlocked');
      setActiveNode(unlocked || null);

    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  };

  const score = Math.round(profile?.skill_score || 0);
  const tier = TIER(score);

  // Job readiness calculation
  const scoreComp = Math.min(30, (score/1000)*30);
  const roadmapComp = stats.nodesTotal > 0
    ? Math.min(30, (stats.nodesDone/stats.nodesTotal)*30)
    : 0;
  const projComp = Math.min(20,
    (stats.projectsVerified*8) + (stats.projectsTotal*2)
  );
  const testComp = stats.testsTotal > 0
    ? Math.min(20, (stats.testsPassed/stats.testsTotal)*20)
    : 0;
  const jobReady = Math.min(100,
    Math.round(scoreComp + roadmapComp + projComp + testComp)
  );

  const jobStatus = jobReady >= 80
    ? { label:'Interview Ready 🏆', color:'#FFD700' }
    : jobReady >= 60
    ? { label:'Job Ready ✅', color:'#00FF94' }
    : jobReady >= 30
    ? { label:'Learning 📈', color:'#4A9EFF' }
    : { label:'Beginner 🌱', color:'#7B61FF' };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Still grinding';
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-dark-600 border-t-primary rounded-full animate-spin"/>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Greeting */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading"
              style={{
                background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
              }}>
              {greeting()}, {firstName} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Day {profile?.current_day || 1} of your journey
              {profile?.domain_id && ` · ${profile.domain_id}`}
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:`${tier.color}10`, border:`1px solid ${tier.color}25` }}>
            <span className="text-lg font-bold font-heading" style={{ color:tier.color }}>
              {score}
            </span>
            <div>
              <p className="text-xs font-bold" style={{ color:tier.color }}>
                {tier.label}
              </p>
              <p className="text-xs text-gray-600">Genois Score</p>
            </div>
          </div>
        </div>

        {/* JOB READINESS METER - PROMINENT */}
        <motion.div
          initial={{ opacity:0, y:10 }}
          animate={{ opacity:1, y:0 }}
          className="p-5 rounded-2xl"
          style={{
            background:`linear-gradient(135deg, ${jobStatus.color}06, rgba(10,10,18,0.95))`,
            border:`1px solid ${jobStatus.color}20`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-white font-heading flex items-center gap-2">
                <Target size={16} style={{ color:jobStatus.color }}/>
                Job Readiness Meter
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Score 30% + Roadmap 30% + Projects 20% + Tests 20%
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-heading"
                style={{ color:jobStatus.color, textShadow:`0 0 20px ${jobStatus.color}50` }}>
                {jobReady}%
              </div>
              <div className="text-xs font-bold" style={{ color:jobStatus.color }}>
                {jobStatus.label}
              </div>
            </div>
          </div>

          {/* Main progress bar */}
          <div className="h-4 bg-dark-600 rounded-full overflow-hidden relative mb-2">
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${jobReady}%` }}
              transition={{ duration:1.5, ease:'easeOut' }}
              className="h-full rounded-full"
              style={{
                background:`linear-gradient(90deg, ${jobStatus.color}60, ${jobStatus.color})`,
                boxShadow:`0 0 10px ${jobStatus.color}40`,
              }}
            />
            {/* Level markers */}
            {[30, 60, 80].map(m => (
              <div key={m}
                className="absolute top-0 bottom-0 w-px bg-dark-900 opacity-60"
                style={{ left:`${m}%` }}
              />
            ))}
          </div>

          {/* Level labels */}
          <div className="flex justify-between text-xs">
            {[
              { label:'Beginner', at:0,  color:'#7B61FF' },
              { label:'Learning', at:30, color:'#4A9EFF' },
              { label:'Ready',    at:60, color:'#00FF94' },
              { label:'Interview',at:80, color:'#FFD700' },
            ].map((lvl, i) => (
              <span key={i} style={{
                color: jobReady >= lvl.at ? lvl.color : '#333',
                fontWeight: jobReady >= lvl.at ? '600' : '400',
              }}>
                {lvl.label} {jobReady >= lvl.at ? '✓' : ''}
              </span>
            ))}
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label:'Score',   value:Math.round(scoreComp),   max:30, color:'#00FF94' },
              { label:'Roadmap', value:Math.round(roadmapComp), max:30, color:'#4A9EFF' },
              { label:'Projects',value:Math.round(projComp),    max:20, color:'#7B61FF' },
              { label:'Tests',   value:Math.round(testComp),    max:20, color:'#FFB347' },
            ].map((item, i) => (
              <div key={i} className="p-2 rounded-xl text-center"
                style={{ background:`${item.color}08`, border:`1px solid ${item.color}15` }}>
                <div className="text-sm font-bold font-mono" style={{ color:item.color }}>
                  {item.value}/{item.max}
                </div>
                <div className="text-xs text-gray-600">{item.label}</div>
                <div className="h-1 bg-dark-600 rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width:`${(item.value/item.max)*100}%`,
                      background:item.color,
                    }}/>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon:'📅', label:'Current Day',   value:`Day ${profile?.current_day||1}`,      color:'#00FF94' },
            { icon:'🔥', label:'Streak',         value:`${profile?.streak_count||0} days`,    color:'#FF6B6B' },
            { icon:'✅', label:'Tasks Today',    value:`${stats.tasksDone}/${stats.tasksToday}`, color:'#4A9EFF' },
            { icon:'📝', label:'Tests Passed',   value:`${stats.testsPassed}/${stats.testsTotal}`, color:'#7B61FF' },
            { icon:'🗺️', label:'Days Complete',  value:`${stats.nodesDone}/${stats.nodesTotal}`, color:'#FFB347' },
          ].map((stat, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:10 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.05 }}
              className="p-4 rounded-2xl text-center card-hover"
              style={{ background:'rgba(10,10,18,0.9)', border:`1px solid ${stat.color}15` }}>
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-base font-bold font-heading"
                style={{ color:stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* SCORE HISTORY + ACTIVE NODE */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Score graph */}
          <div className="p-4 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-sm font-bold text-white font-heading mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-primary"/>
              Score Growth
            </h3>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={scoreHistory}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF94" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day"
                  tick={{ fill:'#444', fontSize:10 }}
                  axisLine={false} tickLine={false}/>
                <YAxis domain={[0,'auto']}
                  tick={{ fill:'#444', fontSize:10 }}
                  axisLine={false} tickLine={false}
                  width={30}/>
                <Tooltip contentStyle={{
                  background:'#0A0A0F',
                  border:'1px solid rgba(0,255,148,0.2)',
                  borderRadius:'8px', fontSize:'11px',
                }}/>
                <Area type="monotone" dataKey="score"
                  stroke="#00FF94" strokeWidth={2}
                  fill="url(#sg)"
                  dot={{ fill:'#00FF94', r:3 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Active day */}
          <div className="p-4 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-sm font-bold text-white font-heading mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-secondary"/>
              Today's Focus
            </h3>
            {activeNode ? (
              <div>
                <div className="p-3 rounded-xl mb-3"
                  style={{ background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.15)' }}>
                  <p className="text-xs text-gray-500 mb-1">
                    Day {activeNode.day_number || activeNode.order_index+1}
                  </p>
                  <p className="text-sm font-bold text-white">
                    {activeNode.title}
                  </p>
                  {activeNode.mini_project && (
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      📝 {activeNode.mini_project}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Link to="/student/roadmap"
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.18)' }}>
                    <span>🗺️ View Roadmap + Resources</span>
                    <ChevronRight size={13}/>
                  </Link>
                  <Link to="/student/tasks"
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background:'rgba(0,255,148,0.06)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.15)' }}>
                    <span>⚡ Generate Today's Tasks</span>
                    <ChevronRight size={13}/>
                  </Link>
                  <Link to="/student/tests"
                    className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all hover:opacity-80"
                    style={{ background:'rgba(74,158,255,0.06)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,0.15)' }}>
                    <span>📝 Take Daily Test</span>
                    <ChevronRight size={13}/>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-3xl mb-2">🗺️</div>
                <p className="text-xs text-gray-500 mb-3">
                  No active roadmap day found
                </p>
                <Link to="/explore-domains"
                  className="text-xs font-bold text-primary hover:underline">
                  Choose Domain →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* WEAK + STRONG TOPICS */}
        {((profile?.weak_topics?.length || 0) > 0 ||
          (profile?.strong_topics?.length || 0) > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {(profile?.weak_topics?.length || 0) > 0 && (
              <div className="p-4 rounded-2xl"
                style={{ background:'rgba(255,107,107,0.04)', border:'1px solid rgba(255,107,107,0.15)' }}>
                <h3 className="text-xs font-bold text-danger mb-3 flex items-center gap-1.5">
                  <AlertCircle size={12}/> Weak Areas — Focus Here
                </h3>
                {profile.weak_topics.slice(0,3).map((t,i) => (
                  <div key={i}
                    className="flex items-center justify-between mb-1.5 p-2 rounded-lg"
                    style={{ background:'rgba(255,107,107,0.05)' }}>
                    <span className="text-xs text-white">{t}</span>
                    <Link to="/student/notes"
                      className="text-xs text-danger hover:underline">
                      Study →
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {(profile?.strong_topics?.length || 0) > 0 && (
              <div className="p-4 rounded-2xl"
                style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.15)' }}>
                <h3 className="text-xs font-bold text-primary mb-3 flex items-center gap-1.5">
                  <CheckCircle size={12}/> Strong Areas
                </h3>
                {profile.strong_topics.slice(0,3).map((t,i) => (
                  <div key={i}
                    className="flex items-center gap-2 mb-1.5 p-2 rounded-lg"
                    style={{ background:'rgba(0,255,148,0.05)' }}>
                    <span className="text-xs">💪</span>
                    <span className="text-xs text-white">{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to:'/student/roadmap',    icon:'🗺️', label:'Roadmap',    color:'#00FF94' },
            { to:'/student/tasks',      icon:'⚡', label:'Tasks',      color:'#4A9EFF' },
            { to:'/student/tests',      icon:'📝', label:'Tests',      color:'#7B61FF' },
            { to:'/student/notes',      icon:'📚', label:'Notes',      color:'#FFB347' },
            { to:'/student/mentor',     icon:'🧠', label:'AI Mentor',  color:'#FF6B6B' },
            { to:'/student/chat',       icon:'💬', label:'2AM Chat',   color:'#00D68F' },
            { to:'/student/projects',   icon:'🔨', label:'Projects',   color:'#FFD700' },
            { to:'/student/leaderboard',icon:'🏆', label:'Leaderboard',color:'#FF6EFF' },
          ].map((item, i) => (
            <Link key={i} to={item.to}
              className="flex items-center gap-3 p-3 rounded-xl card-hover transition-all"
              style={{ background:'rgba(10,10,18,0.9)', border:`1px solid ${item.color}15` }}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-semibold text-white">{item.label}</span>
              <ChevronRight size={12} className="text-gray-600 ml-auto"/>
            </Link>
          ))}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
