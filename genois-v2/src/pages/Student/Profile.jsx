import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ExternalLink, Edit,
         MapPin, GraduationCap, Shield,
         Award, Target, CheckCircle,
         AlertCircle, Save, X, Plus,
         Zap, Trophy } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const BADGES = [
  { id:'first_step',      icon:'🎯', name:'First Step',      desc:'First task done',      rarity:'common',    color:'#4A9EFF', check:(d) => d.tasks >= 1 },
  { id:'consistent',      icon:'🔥', name:'Consistent',      desc:'7-day streak',          rarity:'rare',      color:'#FF6B6B', check:(d) => d.streak >= 7 },
  { id:'fast_learner',    icon:'⚡', name:'Fast Learner',    desc:'Passed 3 tests',        rarity:'rare',      color:'#FFB347', check:(d) => d.tests >= 3 },
  { id:'project_builder', icon:'💻', name:'Project Builder', desc:'Added 2+ projects',     rarity:'epic',      color:'#7B61FF', check:(d) => d.projects >= 2 },
  { id:'high_score',      icon:'🏆', name:'High Score',      desc:'Score above 300',       rarity:'epic',      color:'#FFD700', check:(d) => d.score >= 300 },
  { id:'verified_dev',    icon:'✅', name:'Verified Dev',    desc:'GitHub project verified',rarity:'epic',      color:'#00FF94', check:(d) => d.verified >= 1 },
  { id:'roadmap_runner',  icon:'🗺️', name:'Roadmap Runner',  desc:'Completed 5 days',      rarity:'rare',      color:'#00D68F', check:(d) => d.nodes >= 5 },
  { id:'elite',           icon:'👑', name:'Elite',           desc:'Score above 600',       rarity:'legendary', color:'#FFD700', check:(d) => d.score >= 600 },
];

const TIER = (s) => {
  if (s >= 801) return { label:'Elite',      color:'#FFD700', glow:'rgba(255,215,0,0.2)' };
  if (s >= 601) return { label:'Advanced',   color:'#7B61FF', glow:'rgba(123,97,255,0.2)' };
  if (s >= 401) return { label:'Proficient', color:'#00FF94', glow:'rgba(0,255,148,0.2)' };
  if (s >= 201) return { label:'Developing', color:'#4A9EFF', glow:'rgba(74,158,255,0.2)' };
  return               { label:'Beginner',   color:'#555',    glow:'rgba(85,85,85,0.1)'  };
};

const Profile = () => {
  const { profile, setProfile } = useStore();
  const [projects, setProjects] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [editForm, setEditForm] = useState({
    full_name:'', email:'', college:'', year:'',
    branch:'', phone:'', github_username:'',
    target_role:'', bio:'', graduation_year:'',
    study_hours:2, learning_speed:'normal',
  });
  const [projectForm, setProjectForm] = useState({
    title:'', description:'', tech_stack:'',
    github_url:'', live_url:'',
  });

  useEffect(() => {
    if (profile?.id) {
      fetchAll();
      setEditForm({
        full_name: profile.full_name || '',
        email: profile.email || '',
        college: profile.college || '',
        year: profile.year || '',
        branch: profile.branch || '',
        phone: profile.phone || '',
        github_username: profile.github_username || '',
        target_role: profile.target_role || '',
        bio: profile.bio || '',
        graduation_year: profile.graduation_year || '',
        study_hours: profile.study_hours || 2,
        learning_speed: profile.learning_speed || 'normal',
      });
    }
  }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    const [projRes, nodeRes, attRes, taskRes] = await Promise.all([
      supabase.from('projects').select('*').eq('student_id', profile.id),
      supabase.from('roadmap_nodes')
        .select('*, roadmaps!inner(student_id)')
        .eq('roadmaps.student_id', profile.id),
      supabase.from('tests').select('*').eq('student_id', profile.id),
      supabase.from('tasks').select('id,status').eq('student_id', profile.id),
    ]);

    const projData = projRes.data || [];
    const nodeData = nodeRes.data || [];
    const attData  = attRes.data  || [];
    const taskData = taskRes.data || [];

    setProjects(projData);
    setNodes(nodeData);
    setAttempts(attData);
    setTasks(taskData);

    const badgeData = {
      tasks: taskData.filter(t => t.status === 'completed').length,
      streak: profile?.streak_count || 0,
      tests: attData.filter(a => a.passed).length,
      projects: projData.length,
      score: Math.round(profile?.skill_score || 0),
      verified: projData.filter(p => p.verified).length,
      nodes: nodeData.filter(n => n.status === 'completed').length,
    };
    setEarnedBadges(BADGES.filter(b => b.check(badgeData)));
    setLoading(false);
  };

  const saveProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        email: editForm.email,
        college: editForm.college,
        year: editForm.year,
        branch: editForm.branch,
        phone: editForm.phone,
        github_username: editForm.github_username,
        target_role: editForm.target_role,
        bio: editForm.bio,
        graduation_year: editForm.graduation_year
          ? parseInt(editForm.graduation_year) : null,
        study_hours: parseInt(editForm.study_hours) || 2,
        learning_speed: editForm.learning_speed || 'normal',
      })
      .eq('id', profile.id)
      .select().single();

    if (!error && data) {
      setProfile(data);
      setEditing(false);
      toast.success('Profile saved! ✅');
    } else {
      toast.error('Save failed: ' + error?.message);
    }
  };

  const addProject = async () => {
    if (!projectForm.title.trim()) {
      toast.error('Title required');
      return;
    }
    const { error } = await supabase.from('projects').insert({
      student_id: profile.id,
      domain_id: profile.domain_id,
      title: projectForm.title,
      description: projectForm.description,
      tech_stack: projectForm.tech_stack
        .split(',').map(t => t.trim()).filter(Boolean),
      github_url: projectForm.github_url,
      live_url: projectForm.live_url,
    });
    if (!error) {
      toast.success('Project added! 🚀');
      setProjectForm({ title:'', description:'',
        tech_stack:'', github_url:'', live_url:'' });
      setAddingProject(false);
      fetchAll();
    } else {
      toast.error('Failed: ' + error.message);
    }
  };

  const verifyGitHub = async (project) => {
    if (!project.github_url) {
      toast.error('Add GitHub URL first');
      return;
    }
    toast.loading('Verifying...', { id:'v' });
    try {
      const parts = project.github_url
        .replace('https://github.com/','').split('/');
      const [owner, repo] = parts;
      if (!owner || !repo) {
        toast.error('Invalid GitHub URL', { id:'v' });
        return;
      }
      const repoRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}`
      );
      const repoData = await repoRes.json();
      if (repoData.message === 'Not Found') {
        toast.error('Repo not found or private', { id:'v' });
        return;
      }
      const commitsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`
      );
      const commits = await commitsRes.json();
      const count = Array.isArray(commits) ? commits.length : 0;
      const verified = count >= 3;

      await supabase.from('projects').update({
        verified,
        commit_count: count,
        language: repoData.language,
        difficulty: count > 20 ? 'advanced'
          : count > 8 ? 'intermediate' : 'beginner',
        metadata: {
          stars: repoData.stargazers_count,
          verified_at: new Date().toISOString(),
        }
      }).eq('id', project.id);

      toast[verified ? 'success' : 'error'](
        verified
          ? `✅ Verified! ${count} commits · ${repoData.language}`
          : `Need 3+ commits. Found ${count}.`,
        { id:'v' }
      );
      fetchAll();
    } catch(e) {
      toast.error('Verification failed', { id:'v' });
    }
  };

  const score = Math.round(profile?.skill_score || 0);
  const tier = TIER(score);
  const completedNodes = nodes.filter(n => n.status === 'completed').length;
  const passedTests = attempts.filter(a => a.passed).length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const scoreComp = Math.min(30, (score/1000)*30);
  const roadmapComp = nodes.length > 0
    ? Math.min(30, (completedNodes/nodes.length)*30) : 0;
  const projComp = Math.min(20,
    (projects.filter(p=>p.verified).length*8) + (projects.length*2)
  );
  const testComp = attempts.length > 0
    ? Math.min(20, (passedTests/attempts.length)*20) : 0;
  const jobReady = Math.min(100,
    Math.round(scoreComp+roadmapComp+projComp+testComp)
  );
  const jobStatus = jobReady>=80
    ? { label:'Interview Ready 🏆', color:'#FFD700' }
    : jobReady>=60
    ? { label:'Job Ready ✅', color:'#00FF94' }
    : jobReady>=30
    ? { label:'Learning 📈', color:'#4A9EFF' }
    : { label:'Beginner 🌱', color:'#7B61FF' };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-dark-600 border-t-primary rounded-full animate-spin"/>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              🪪 Skill Identity
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Your verified profile — share instead of resume
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.25)' }}>
              <Edit size={12}/>
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/u/${profile?.id}`
                );
                toast.success('Profile link copied! 🔗');
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{ background:'rgba(10,10,18,0.8)', color:'#555', border:'1px solid rgba(34,34,51,0.5)' }}>
              🔗 Share Profile
            </button>
          </div>
        </div>

        {/* HERO CARD */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background:`linear-gradient(135deg, ${tier.glow} 0%, rgba(10,10,18,0.98) 100%)`,
            border:`1px solid ${tier.color}20`,
          }}>
          <div className="p-5">
            {editing ? (
              <div className="space-y-3">
                <p className="text-xs font-bold text-primary mb-3">
                  ✏️ Edit Profile
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key:'full_name',    label:'Full Name',     placeholder:'Your full name' },
                    { key:'email',        label:'Email',         placeholder:'your@email.com' },
                    { key:'college',      label:'College',       placeholder:'KLEIT, VTU...' },
                    { key:'branch',       label:'Branch',        placeholder:'Computer Science' },
                    { key:'year',         label:'Year',          placeholder:'3rd Year' },
                    { key:'graduation_year', label:'Grad Year',  placeholder:'2026' },
                    { key:'phone',        label:'Phone',         placeholder:'+91 9876543210' },
                    { key:'github_username', label:'GitHub',     placeholder:'username' },
                    { key:'target_role',  label:'Target Role',  placeholder:'Full Stack Developer' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-500 mb-1 block">
                        {f.label}
                      </label>
                      <input
                        value={editForm[f.key]}
                        onChange={e => setEditForm(p => ({...p, [f.key]:e.target.value}))}
                        placeholder={f.placeholder}
                        className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600"/>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Study Hours/Day
                    </label>
                    <select
                      value={editForm.study_hours}
                      onChange={e => setEditForm(p => ({...p, study_hours:e.target.value}))}
                      className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100">
                      <option value={1}>1 hour (light)</option>
                      <option value={2}>2 hours (normal)</option>
                      <option value={3}>3 hours (intensive)</option>
                      <option value={4}>4 hours (full focus)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Learning Speed
                    </label>
                    <select
                      value={editForm.learning_speed}
                      onChange={e => setEditForm(p => ({...p, learning_speed:e.target.value}))}
                      className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100">
                      <option value="slow">🌱 Slow (easy questions)</option>
                      <option value="normal">⚡ Normal (medium)</option>
                      <option value="fast">🔥 Fast (hard questions)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Bio</label>
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(p => ({...p, bio:e.target.value}))}
                    placeholder="Tell companies about yourself..."
                    rows={2}
                    className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none"/>
                </div>
                <button onClick={saveProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
                  style={{ background:'#00FF94', boxShadow:'0 0 12px rgba(0,255,148,0.3)' }}>
                  <Save size={13}/> Save Profile
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-5 flex-wrap">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
                    style={{
                      background:`linear-gradient(135deg, ${tier.color}30, ${tier.color}60)`,
                      border:`2px solid ${tier.color}40`,
                      boxShadow:`0 0 20px ${tier.glow}`,
                    }}>
                    {profile?.full_name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-dark-900 neon-pulse"/>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white font-heading">
                    {profile?.full_name || 'Add your name'}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {profile?.target_role || 'Add target role'}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    {profile?.college && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <GraduationCap size={11}/> {profile.college}
                      </span>
                    )}
                    {profile?.branch && (
                      <span className="text-xs text-gray-500">
                        📚 {profile.branch}
                      </span>
                    )}
                    {profile?.year && (
                      <span className="text-xs text-gray-500">
                        📅 {profile.year}
                      </span>
                    )}
                    {profile?.email && (
                      <span className="text-xs text-gray-500">
                        ✉️ {profile.email}
                      </span>
                    )}
                    {profile?.phone && (
                      <span className="text-xs text-gray-500">
                        📱 {profile.phone}
                      </span>
                    )}
                  </div>
                  {profile?.bio && (
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                      style={{ background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.18)' }}>
                      <Shield size={11} className="text-primary"/>
                      <span className="text-xs text-primary font-bold">
                        VERIFIED BY GENOIS AI
                      </span>
                    </div>
                    {profile?.github_username && (
                      <a href={`https://github.com/${profile.github_username}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all hover:text-white"
                        style={{ background:'rgba(10,10,18,0.8)', color:'#555', border:'1px solid rgba(34,34,51,0.5)' }}>
                        <GitBranch size={11}/> {profile.github_username}
                      </a>
                    )}
                  </div>
                </div>

                {/* Score ring */}
                <div className="text-center flex-shrink-0">
                  <div className="relative w-24 h-24">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40"
                        fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
                      <motion.circle cx="50" cy="50" r="40"
                        fill="none" strokeWidth="8"
                        stroke={tier.color} strokeLinecap="round"
                        initial={{ strokeDasharray:'0 251.2' }}
                        animate={{ strokeDasharray:`${(score/1000)*251.2} 251.2` }}
                        transition={{ duration:1.5, ease:'easeOut' }}
                        style={{ filter:`drop-shadow(0 0 6px ${tier.color})` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold font-heading"
                        style={{ color:tier.color }}>
                        {score}
                      </span>
                      <span className="text-xs text-gray-600">/1000</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold mt-1" style={{ color:tier.color }}>
                    {tier.label}
                  </div>
                  <div className="text-xs text-gray-600">Genois Score™</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { icon:'📅', label:'Current Day',  value:`Day ${profile?.current_day||1}` },
            { icon:'🔥', label:'Streak',        value:`${profile?.streak_count||0}d` },
            { icon:'✅', label:'Tasks Done',    value:completedTasks },
            { icon:'📝', label:'Tests Passed',  value:passedTests },
            { icon:'🗺️', label:'Nodes Done',    value:completedNodes },
          ].map((s, i) => (
            <div key={i}
              className="p-3 rounded-xl text-center"
              style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
              <div className="text-xl mb-1">{s.icon}</div>
              <div className="text-base font-bold text-white font-heading">
                {s.value}
              </div>
              <div className="text-xs text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        {/* JOB READINESS */}
        <div className="p-5 rounded-2xl"
          style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white font-heading text-sm flex items-center gap-2">
              <Target size={14} className="text-primary"/>
              Job Readiness
            </h2>
            <div className="text-right">
              <div className="text-xl font-bold font-heading"
                style={{ color:jobStatus.color }}>
                {jobReady}%
              </div>
              <div className="text-xs font-bold" style={{ color:jobStatus.color }}>
                {jobStatus.label}
              </div>
            </div>
          </div>
          <div className="h-3 bg-dark-600 rounded-full overflow-hidden">
            <motion.div
              initial={{ width:0 }}
              animate={{ width:`${jobReady}%` }}
              transition={{ duration:1.5 }}
              className="h-full rounded-full"
              style={{ background:`linear-gradient(90deg,${jobStatus.color}60,${jobStatus.color})` }}
            />
          </div>
        </div>

        {/* WEAK + STRONG */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-xs font-bold text-success mb-3 flex items-center gap-1.5">
              <CheckCircle size={12}/> Strong Topics
            </h3>
            {(profile?.strong_topics||[]).length === 0 ? (
              <p className="text-xs text-gray-600">
                Pass tests to discover strengths
              </p>
            ) : (profile.strong_topics||[]).slice(0,4).map((t,i) => (
              <div key={i}
                className="flex items-center gap-2 mb-1.5 p-2 rounded-lg"
                style={{ background:'rgba(0,255,148,0.05)' }}>
                <span className="text-xs">💪</span>
                <span className="text-xs text-white">{t}</span>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
            <h3 className="text-xs font-bold text-warning mb-3 flex items-center gap-1.5">
              <AlertCircle size={12}/> Weak Topics
            </h3>
            {(profile?.weak_topics||[]).length === 0 ? (
              <p className="text-xs text-gray-600">No weak areas yet</p>
            ) : (profile.weak_topics||[]).slice(0,4).map((t,i) => (
              <div key={i}
                className="flex items-center justify-between mb-1.5 p-2 rounded-lg"
                style={{ background:'rgba(255,179,71,0.05)' }}>
                <span className="text-xs text-white">{t}</span>
                <a href="/student/notes"
                  className="text-xs text-warning hover:underline">
                  Study →
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* PROJECTS */}
        <div className="p-5 rounded-2xl"
          style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white font-heading text-sm">
              💻 Projects ({projects.length})
            </h2>
            <button onClick={() => setAddingProject(!addingProject)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.25)' }}>
              <Plus size={11}/>
              {addingProject ? 'Cancel' : 'Add Project'}
            </button>
          </div>

          {addingProject && (
            <motion.div
              initial={{ opacity:0, y:-8 }}
              animate={{ opacity:1, y:0 }}
              className="p-4 rounded-xl mb-4 space-y-3"
              style={{ background:'rgba(18,18,26,0.8)', border:'1px solid rgba(34,34,51,0.6)' }}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key:'title',      label:'Title *',           placeholder:'My Awesome Project' },
                  { key:'tech_stack', label:'Tech (comma sep)',   placeholder:'React, Node.js, MongoDB' },
                  { key:'github_url', label:'GitHub URL',        placeholder:'https://github.com/...' },
                  { key:'live_url',   label:'Live URL',          placeholder:'https://myapp.vercel.app' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                    <input
                      value={projectForm[f.key]}
                      onChange={e => setProjectForm(p => ({...p, [f.key]:e.target.value}))}
                      placeholder={f.placeholder}
                      className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600"/>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={e => setProjectForm(p => ({...p, description:e.target.value}))}
                  placeholder="What does this project do?"
                  rows={2}
                  className="w-full bg-dark-600 border border-dark-500 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none"/>
              </div>
              <button onClick={addProject}
                className="px-5 py-2 rounded-xl font-bold text-sm text-dark-900"
                style={{ background:'#00FF94' }}>
                Add Project 🚀
              </button>
            </motion.div>
          )}

          {projects.length === 0 && !addingProject ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">💻</div>
              <p className="text-xs text-gray-600 mb-3">No projects yet</p>
              <button onClick={() => setAddingProject(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold"
                style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.2)' }}>
                Add Your First Project
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {projects.map((project, i) => (
                <div key={project.id}
                  className="p-4 rounded-xl"
                  style={{ background:'rgba(18,18,26,0.8)', border:'1px solid rgba(34,34,51,0.5)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {project.title}
                      </h3>
                      {project.verified && (
                        <span className="text-xs text-primary font-bold">
                          ✅ GitHub Verified
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      {project.github_url && (
                        <a href={project.github_url}
                          target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg bg-dark-600 text-gray-500 hover:text-white">
                          <GitBranch size={12}/>
                        </a>
                      )}
                      {project.live_url && (
                        <a href={project.live_url}
                          target="_blank" rel="noreferrer"
                          className="p-1.5 rounded-lg bg-dark-600 text-gray-500 hover:text-white">
                          <ExternalLink size={12}/>
                        </a>
                      )}
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-xs text-gray-500 mb-2 leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  {project.tech_stack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {project.tech_stack.map((tech, j) => (
                        <span key={j}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ background:'rgba(0,255,148,0.06)', color:'#00FF94' }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.commit_count > 0 && (
                    <p className="text-xs text-gray-600 mb-2">
                      {project.commit_count} commits
                      {project.language && ` · ${project.language}`}
                      {project.difficulty && ` · ${project.difficulty}`}
                    </p>
                  )}
                  {!project.verified && project.github_url && (
                    <button onClick={() => verifyGitHub(project)}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold"
                      style={{ background:'rgba(74,158,255,0.08)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,0.2)' }}>
                      🔍 Verify on GitHub
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BADGES */}
        <div className="p-5 rounded-2xl"
          style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
          <h2 className="font-bold text-white font-heading text-sm mb-4 flex items-center gap-2">
            <Award size={14} className="text-warning"/>
            Badges ({earnedBadges.length}/{BADGES.length} earned)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BADGES.map((badge, i) => {
              const earned = earnedBadges.find(b => b.id === badge.id);
              return (
                <div key={badge.id}
                  className="p-3 rounded-xl text-center transition-all"
                  style={{
                    background: earned ? `${badge.color}08` : 'rgba(10,10,18,0.5)',
                    border:`1px solid ${earned ? badge.color+'20' : 'rgba(34,34,51,0.4)'}`,
                    opacity: earned ? 1 : 0.35,
                  }}>
                  <div className="text-2xl mb-1.5">
                    {earned ? badge.icon : '🔒'}
                  </div>
                  <p className="text-xs font-bold text-white mb-0.5">
                    {badge.name}
                  </p>
                  <p className="text-xs text-gray-600 leading-tight">
                    {badge.desc}
                  </p>
                  {earned && (
                    <span className="mt-1.5 inline-block text-xs px-1.5 py-0.5 rounded-full font-semibold capitalize"
                      style={{
                        background:`${badge.color}15`,
                        color:badge.color,
                      }}>
                      {badge.rarity}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PUBLIC LINK */}
        <div className="p-4 rounded-xl flex items-center justify-between flex-wrap gap-3"
          style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.12)' }}>
          <div>
            <p className="text-sm font-semibold text-white">
              🔗 Your Public Skill Identity
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {window.location.origin}/u/{profile?.id?.substring(0,8)}...
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/u/${profile?.id}`} target="_blank"
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background:'rgba(10,10,18,0.8)', color:'#555', border:'1px solid rgba(34,34,51,0.5)' }}>
              Preview →
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/u/${profile?.id}`
                );
                toast.success('Copied! 🔗');
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.2)' }}>
              Copy Link
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Profile;
