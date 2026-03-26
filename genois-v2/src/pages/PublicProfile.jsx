import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitBranch, ExternalLink, Shield,
         Award, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TIER = (s) => {
  if (s >= 801) return { label:'Elite',      color:'#FFD700', glow:'rgba(255,215,0,0.2)' };
  if (s >= 601) return { label:'Advanced',   color:'#7B61FF', glow:'rgba(123,97,255,0.2)' };
  if (s >= 401) return { label:'Proficient', color:'#00FF94', glow:'rgba(0,255,148,0.2)' };
  if (s >= 201) return { label:'Developing', color:'#4A9EFF', glow:'rgba(74,158,255,0.2)' };
  return               { label:'Beginner',   color:'#555',    glow:'rgba(85,85,85,0.1)' };
};

const PublicProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from('profiles').select('*')
        .eq('id', id).single();

      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfile(p);

      const [projRes, nodeRes, attRes] = await Promise.all([
        supabase.from('projects').select('*').eq('student_id', id),
        supabase.from('roadmap_nodes')
          .select('*, roadmaps!inner(student_id)')
          .eq('roadmaps.student_id', id),
        supabase.from('tests').select('*').eq('student_id', id),
      ]);

      setProjects(projRes.data || []);
      setNodes(nodeRes.data || []);
      setAttempts(attRes.data || []);
    } catch(e) {
      console.error(e);
      setNotFound(true);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen cyber-grid flex items-center justify-center"
      style={{ background:'#050508' }}>
      <div className="text-center">
        <div className="text-3xl font-bold logo-glow font-heading mb-3">
          GENOIS AI
        </div>
        <div className="w-8 h-8 border-2 border-dark-600 border-t-primary rounded-full animate-spin mx-auto"/>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen cyber-grid flex items-center justify-center"
      style={{ background:'#050508' }}>
      <div className="text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-white font-heading mb-2">
          Profile Not Found
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          This profile does not exist or has been removed
        </p>
        <Link to="/"
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
          style={{ background:'#00FF94' }}>
          Go Home →
        </Link>
      </div>
    </div>
  );

  const score = Math.round(profile.skill_score || 0);
  const tier = TIER(score);
  const completedNodes = nodes.filter(n => n.status === 'completed').length;
  const passedTests = attempts.filter(a => a.passed).length;
  const verifiedProjects = projects.filter(p => p.verified);

  const scoreComp = Math.min(30, (score/1000)*30);
  const roadmapComp = nodes.length > 0
    ? Math.min(30, (completedNodes/nodes.length)*30) : 0;
  const projComp = Math.min(20,
    (verifiedProjects.length*8) + (projects.length*2)
  );
  const testComp = attempts.length > 0
    ? Math.min(20, (passedTests/attempts.length)*20) : 0;
  const jobReady = Math.min(100,
    Math.round(scoreComp+roadmapComp+projComp+testComp)
  );

  const jobStatus = jobReady >= 80
    ? { label:'Interview Ready 🏆', color:'#FFD700' }
    : jobReady >= 60
    ? { label:'Job Ready ✅', color:'#00FF94' }
    : jobReady >= 30
    ? { label:'Learning 📈', color:'#4A9EFF' }
    : { label:'Beginner 🌱', color:'#7B61FF' };

  return (
    <div className="min-h-screen cyber-grid py-8 px-4"
      style={{ background:'#050508' }}>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Brand header */}
        <div className="text-center mb-2">
          <Link to="/" className="text-sm logo-glow font-heading font-bold">
            GENOIS AI
          </Link>
          <p className="text-xs text-gray-600 mt-0.5">
            Verified Skill Identity
          </p>
        </div>

        {/* Hero */}
        <div className="p-6 rounded-2xl"
          style={{
            background:`linear-gradient(135deg, ${tier.glow} 0%, rgba(10,10,18,0.98) 100%)`,
            border:`1px solid ${tier.color}20`,
          }}>
          <div className="flex items-start gap-5 flex-wrap">

            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold"
                style={{
                  background:`linear-gradient(135deg, ${tier.color}30, ${tier.color}60)`,
                  border:`2px solid ${tier.color}40`,
                  boxShadow:`0 0 20px ${tier.glow}`,
                }}>
                {profile.full_name?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success border-2 border-dark-900"/>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white font-heading">
                {profile.full_name || 'Anonymous'}
              </h1>
              <p className="text-sm text-gray-400">
                {profile.target_role || profile.domain_id || 'Engineering Student'}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {profile.college && (
                  <span className="text-xs text-gray-500">
                    🎓 {profile.college}
                  </span>
                )}
                {profile.branch && (
                  <span className="text-xs text-gray-500">
                    📚 {profile.branch}
                  </span>
                )}
                {profile.year && (
                  <span className="text-xs text-gray-500">
                    📅 {profile.year}
                  </span>
                )}
              </div>
              {profile.bio && (
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
                  style={{ background:'rgba(0,255,148,0.06)', border:'1px solid rgba(0,255,148,0.2)' }}>
                  <Shield size={10} className="text-primary"/>
                  <span className="text-xs text-primary font-bold">
                    VERIFIED BY GENOIS AI
                  </span>
                </div>
                {profile.github_username && (
                  <a href={`https://github.com/${profile.github_username}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-500 hover:text-white transition-colors"
                    style={{ border:'1px solid rgba(34,34,51,0.5)' }}>
                    <GitBranch size={10}/> {profile.github_username}
                  </a>
                )}
              </div>
            </div>

            {/* Score ring */}
            <div className="text-center flex-shrink-0">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none"
                    stroke="rgba(255,255,255,0.04)" strokeWidth="8"/>
                  <motion.circle cx="50" cy="50" r="40" fill="none"
                    strokeWidth="8" stroke={tier.color} strokeLinecap="round"
                    initial={{ strokeDasharray:'0 251.2' }}
                    animate={{ strokeDasharray:`${(score/1000)*251.2} 251.2` }}
                    transition={{ duration:1.5, ease:'easeOut' }}
                    style={{ filter:`drop-shadow(0 0 4px ${tier.color})` }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold font-heading"
                    style={{ color:tier.color }}>
                    {score}
                  </span>
                  <span className="text-xs text-gray-600">/1000</span>
                </div>
              </div>
              <div className="text-xs font-bold mt-1" style={{ color:tier.color }}>
                {tier.label}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon:'📅', label:'Study Day',     value:`Day ${profile.current_day||1}` },
            { icon:'🔥', label:'Streak',         value:`${profile.streak_count||0}d` },
            { icon:'📝', label:'Tests Passed',   value:passedTests },
            { icon:'🗺️', label:'Days Complete',  value:completedNodes },
          ].map((s, i) => (
            <div key={i} className="p-3 rounded-xl text-center"
              style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
              <div className="text-lg mb-1">{s.icon}</div>
              <div className="text-base font-bold text-white font-heading">
                {s.value}
              </div>
              <div className="text-xs text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Job readiness */}
        <div className="p-5 rounded-2xl"
          style={{
            background:`linear-gradient(135deg, ${jobStatus.color}06, rgba(10,10,18,0.95))`,
            border:`1px solid ${jobStatus.color}20`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white font-heading text-sm flex items-center gap-2">
              <Target size={14} style={{ color:jobStatus.color }}/>
              Job Readiness
            </h2>
            <div className="text-right">
              <div className="text-2xl font-bold font-heading"
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

        {/* Verified Projects */}
        {verifiedProjects.length > 0 && (
          <div>
            <h2 className="font-bold text-white font-heading text-sm mb-3">
              💻 GitHub Verified Projects ({verifiedProjects.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {verifiedProjects.map((project, i) => (
                <div key={project.id}
                  className="p-4 rounded-xl"
                  style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(0,255,148,0.2)' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {project.title}
                      </h3>
                      <p className="text-xs text-primary font-bold">
                        ✅ {project.commit_count || '3'}+ commits verified
                        {project.language && ` · ${project.language}`}
                      </p>
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
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  {project.tech_stack?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.tech_stack.map((tech, j) => (
                        <span key={j}
                          className="px-1.5 py-0.5 rounded text-xs"
                          style={{ background:'rgba(0,255,148,0.06)', color:'#00FF94' }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak/Strong */}
        <div className="grid md:grid-cols-2 gap-3">
          {(profile.strong_topics||[]).length > 0 && (
            <div className="p-4 rounded-xl"
              style={{ background:'rgba(0,255,148,0.04)', border:'1px solid rgba(0,255,148,0.15)' }}>
              <p className="text-xs font-bold text-primary mb-2">
                💪 Strong Areas
              </p>
              {(profile.strong_topics||[]).slice(0,3).map((t,i) => (
                <div key={i}
                  className="text-xs text-white py-1 px-2 rounded mb-1"
                  style={{ background:'rgba(0,255,148,0.05)' }}>
                  {t}
                </div>
              ))}
            </div>
          )}
          {(profile.weak_topics||[]).length > 0 && (
            <div className="p-4 rounded-xl"
              style={{ background:'rgba(255,107,107,0.04)', border:'1px solid rgba(255,107,107,0.15)' }}>
              <p className="text-xs font-bold text-danger mb-2">
                📈 Improving
              </p>
              {(profile.weak_topics||[]).slice(0,3).map((t,i) => (
                <div key={i}
                  className="text-xs text-white py-1 px-2 rounded mb-1"
                  style={{ background:'rgba(255,107,107,0.05)' }}>
                  {t}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-2 border-t border-dark-600">
          <p className="text-xs text-gray-600 mb-2">
            This profile is verified by Genois AI — scores built from real daily activity
          </p>
          <Link to="/register"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
            style={{ background:'linear-gradient(135deg,#00FF94,#7B61FF)', boxShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
            Build Your Skill Identity — Free 🚀
          </Link>
        </div>

      </div>
    </div>
  );
};

export default PublicProfile;
