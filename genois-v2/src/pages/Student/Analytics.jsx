import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, Calendar } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

const Analytics = () => {
  const { profile } = useStore();
  const [scoreHistory, setScoreHistory] = useState([]);
  const [testHistory, setTestHistory] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) fetchAll();
  }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    const [histRes, testRes, taskRes] = await Promise.all([
      supabase.from('score_history').select('*')
        .eq('student_id', profile.id)
        .order('recorded_at', { ascending: true })
        .limit(30),
      supabase.from('tests').select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('tasks').select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    const score = Math.round(profile?.skill_score || 0);
    const hist = histRes.data || [];

    if (hist.length > 1) {
      setScoreHistory(hist.map(h => ({
        day: new Date(h.recorded_at).toLocaleDateString('en-IN', {
          month:'short', day:'numeric'
        }),
        score: h.score,
        tasks: h.tasks_done || 0,
      })));
    } else {
      setScoreHistory([
        { day:'Week 1', score:0,                tasks:0 },
        { day:'Week 2', score:Math.round(score*0.2), tasks:2 },
        { day:'Week 3', score:Math.round(score*0.5), tasks:5 },
        { day:'Week 4', score:Math.round(score*0.8), tasks:8 },
        { day:'Today',  score,                  tasks:10 },
      ]);
    }

    const tests = testRes.data || [];
    setTestHistory(tests.map((t, i) => ({
      name: `Test ${tests.length - i}`,
      score: t.percentage || 0,
      type: t.type || 'daily',
      passed: t.passed,
    })).reverse());

    const tasks = taskRes.data || [];
    const byType = {};
    tasks.forEach(t => {
      byType[t.type] = (byType[t.type] || 0) + 1;
    });
    setTaskHistory(Object.entries(byType).map(([type, count]) => ({
      type, count,
    })));

    setLoading(false);
  };

  const score = Math.round(profile?.skill_score || 0);
  const passedTests = testHistory.filter(t => t.passed).length;
  const avgScore = testHistory.length > 0
    ? Math.round(testHistory.reduce((a, t) => a + t.score, 0) / testHistory.length)
    : 0;

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

        <div>
          <h1 className="text-2xl font-bold font-heading text-white"
            style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
            📊 Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Your learning progress over time
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon:'⚡', label:'Genois Score',   value:`${score}/1000`, color:'#00FF94' },
            { icon:'📝', label:'Tests Passed',   value:passedTests,     color:'#4A9EFF' },
            { icon:'🎯', label:'Avg Test Score', value:`${avgScore}%`,  color:'#7B61FF' },
            { icon:'🔥', label:'Best Streak',    value:`${profile?.longest_streak||0} days`, color:'#FF6B6B' },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-2xl text-center card-hover"
              style={{ background:'rgba(10,10,18,0.9)', border:`1px solid ${stat.color}18` }}>
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-xl font-bold font-heading"
                style={{ color:stat.color }}>
                {stat.value}
              </div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Score History Graph */}
        <div className="p-5 rounded-2xl"
          style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
          <h3 className="text-sm font-bold text-white font-heading mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-primary"/>
            Genois Score Growth
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreHistory}>
              <defs>
                <linearGradient id="sg2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00FF94" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00FF94" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="day"
                tick={{ fill:'#555', fontSize:11 }}
                axisLine={false} tickLine={false}/>
              <YAxis domain={[0,'auto']}
                tick={{ fill:'#555', fontSize:11 }}
                axisLine={false} tickLine={false}
                width={35}/>
              <Tooltip contentStyle={{
                background:'#0A0A0F',
                border:'1px solid rgba(0,255,148,0.2)',
                borderRadius:'8px', fontSize:'12px',
              }}/>
              <Area type="monotone" dataKey="score"
                stroke="#00FF94" strokeWidth={2}
                fill="url(#sg2)"
                dot={{ fill:'#00FF94', r:3 }}
                name="Score"/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Test Performance */}
        {testHistory.length > 0 && (
          <div className="p-5 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-sm font-bold text-white font-heading mb-4 flex items-center gap-2">
              <Target size={14} className="text-secondary"/>
              Test Performance
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={testHistory.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="name"
                  tick={{ fill:'#555', fontSize:10 }}
                  axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]}
                  tick={{ fill:'#555', fontSize:10 }}
                  axisLine={false} tickLine={false}
                  width={30}/>
                <Tooltip contentStyle={{
                  background:'#0A0A0F',
                  border:'1px solid rgba(123,97,255,0.2)',
                  borderRadius:'8px', fontSize:'12px',
                }}/>
                <Bar dataKey="score" name="Score %"
                  radius={[4,4,0,0]}
                  fill="#7B61FF"/>
                <Bar dataKey="60" name="Pass mark"
                  radius={[4,4,0,0]}
                  fill="rgba(0,255,148,0.15)"/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recent tests list */}
        {testHistory.length > 0 && (
          <div className="p-5 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-sm font-bold text-white font-heading mb-4">
              📝 Recent Test History
            </h3>
            <div className="space-y-2">
              {testHistory.slice(-8).reverse().map((test, i) => (
                <div key={i}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background:'rgba(18,18,26,0.8)', border:'1px solid rgba(34,34,51,0.5)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {test.type === 'daily' ? '⚡'
                        : test.type === 'weekly' ? '📅' : '📆'}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white capitalize">
                        {test.type} Test
                      </p>
                      <p className="text-xs text-gray-600">{test.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold font-mono"
                      style={{ color: test.passed ? '#00FF94' : '#FF6B6B' }}>
                      {test.score}%
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      test.passed
                        ? 'bg-success/15 text-success'
                        : 'bg-danger/15 text-danger'
                    }`}>
                      {test.passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Analytics;
