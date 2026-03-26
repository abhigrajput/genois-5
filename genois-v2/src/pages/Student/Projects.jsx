import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, ExternalLink, Plus,
         CheckCircle, Lock, Zap } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const STEPS = [
  { key:'step_read',    icon:'📖', label:'Read Brief',    points:5  },
  { key:'step_code',    icon:'💻', label:'Write Code',    points:10 },
  { key:'step_test',    icon:'🧪', label:'Test It',       points:5  },
  { key:'step_submit',  icon:'🚀', label:'Push to GitHub', points:10 },
];

const Projects = () => {
  const { profile, setProfile } = useStore();
  const [projects, setProjects] = useState([]);
  const [roadmapProjects, setRoadmapProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingProject, setAddingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({
    title:'', description:'', tech_stack:'',
    github_url:'', live_url:'',
  });

  useEffect(() => {
    if (profile?.id) fetchAll();
  }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [projRes, rmRes] = await Promise.all([
        supabase.from('projects').select('*')
          .eq('student_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase.from('roadmaps').select('id')
          .eq('student_id', profile.id).limit(1),
      ]);

      setProjects(projRes.data || []);

      if (rmRes.data?.length > 0) {
        const { data: nodes } = await supabase
          .from('roadmap_nodes').select('*')
          .eq('roadmap_id', rmRes.data[0].id)
          .not('project_brief', 'is', null)
          .order('order_index', { ascending: true });
        setRoadmapProjects(nodes || []);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
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

  const updateStep = async (projectId, stepKey, currentValue) => {
    const { error } = await supabase
      .from('projects')
      .update({ [stepKey]: !currentValue })
      .eq('id', projectId);
    if (!error) {
      const step = STEPS.find(s => s.key === stepKey);
      if (!currentValue && step) {
        const newScore = Math.min(1000,
          (profile.skill_score||0) + step.points
        );
        await supabase.from('profiles')
          .update({ skill_score: newScore })
          .eq('id', profile.id);
        const { data: fresh } = await supabase
          .from('profiles').select('*')
          .eq('id', profile.id).single();
        if (fresh) setProfile(fresh);
        toast.success(`${step.label} done! +${step.points} pts 🎯`);
      }
      fetchAll();
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
      }).eq('id', project.id);

      toast[verified ? 'success' : 'error'](
        verified
          ? `Verified! ${count} commits · ${repoData.language}`
          : `Need 3+ commits. Found ${count}.`,
        { id:'v' }
      );
      fetchAll();
    } catch(e) {
      toast.error('Verification failed', { id:'v' });
    }
  };

  const getStepsDone = (project) =>
    STEPS.filter(s => project[s.key]).length;

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

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-heading text-white"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              🔨 Projects
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Build real projects · Push to GitHub · Get verified
            </p>
          </div>
          <button onClick={() => setAddingProject(!addingProject)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-dark-900"
            style={{ background:'#00FF94', boxShadow:'0 0 12px rgba(0,255,148,0.3)' }}>
            <Plus size={14}/>
            {addingProject ? 'Cancel' : 'Add Project'}
          </button>
        </div>

        {/* Add project form */}
        {addingProject && (
          <motion.div
            initial={{ opacity:0, y:-8 }}
            animate={{ opacity:1, y:0 }}
            className="p-5 rounded-2xl space-y-3"
            style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(0,255,148,0.15)' }}>
            <p className="text-sm font-bold text-primary">
              + New Project
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key:'title',      label:'Title *',          placeholder:'My Awesome Project' },
                { key:'tech_stack', label:'Tech Stack',        placeholder:'React, Node.js, MongoDB' },
                { key:'github_url', label:'GitHub URL',       placeholder:'https://github.com/you/repo' },
                { key:'live_url',   label:'Live Demo URL',    placeholder:'https://myapp.vercel.app' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 mb-1 block">
                    {f.label}
                  </label>
                  <input
                    value={projectForm[f.key]}
                    onChange={e => setProjectForm(p => ({...p,[f.key]:e.target.value}))}
                    placeholder={f.placeholder}
                    className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600"/>
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Description
              </label>
              <textarea
                value={projectForm.description}
                onChange={e => setProjectForm(p => ({...p,description:e.target.value}))}
                placeholder="What does this project do? What problem does it solve?"
                rows={2}
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-600 resize-none"/>
            </div>
            <button onClick={addProject}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
              style={{ background:'#00FF94', boxShadow:'0 0 12px rgba(0,255,148,0.3)' }}>
              Add Project 🚀
            </button>
          </motion.div>
        )}

        {/* Roadmap projects */}
        {roadmapProjects.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              📍 From Your Roadmap
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {roadmapProjects.map((node, i) => {
                const unlocked = node.status !== 'locked';
                const done = node.status === 'completed';
                return (
                  <div key={node.id}
                    className="p-4 rounded-2xl"
                    style={{
                      background:'rgba(10,10,18,0.9)',
                      border:`1px solid ${done
                        ? 'rgba(0,255,148,0.25)'
                        : unlocked
                        ? 'rgba(255,179,71,0.25)'
                        : 'rgba(34,34,51,0.4)'}`,
                      opacity: unlocked ? 1 : 0.5,
                    }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {done ? '✅' : unlocked ? '🔨' : '🔒'}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Day {node.day_number} Project
                          </p>
                          <p className="text-xs text-gray-600">
                            {node.title}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        done ? 'bg-success/15 text-success'
                          : unlocked ? 'bg-warning/15 text-warning'
                          : 'bg-dark-600 text-gray-600'
                      }`}>
                        {done ? 'Done' : unlocked ? 'Build Now' : 'Locked'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-3">
                      {node.project_brief}
                    </p>
                    {unlocked && (
                      <div className="flex gap-2">
                        <a href="https://github.com/new"
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background:'rgba(0,255,148,0.08)', color:'#00FF94', border:'1px solid rgba(0,255,148,0.2)' }}>
                          <GitBranch size={11}/> Create Repo
                        </a>
                        <button
                          onClick={() => setAddingProject(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.2)' }}>
                          <Plus size={11}/> Add to Profile
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* My projects */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            💻 My Projects ({projects.length})
          </p>

          {projects.length === 0 ? (
            <div className="text-center py-12 rounded-2xl"
              style={{ background:'rgba(10,10,18,0.6)', border:'1px solid rgba(34,34,51,0.5)' }}>
              <div className="text-5xl mb-3">💻</div>
              <h2 className="font-bold text-white font-heading mb-2">
                No projects yet
              </h2>
              <p className="text-gray-500 text-sm mb-4">
                Build projects from your roadmap and add them here
              </p>
              <button onClick={() => setAddingProject(true)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-dark-900"
                style={{ background:'#00FF94' }}>
                Add First Project
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project, i) => {
                const stepsDone = getStepsDone(project);
                const allDone = stepsDone === STEPS.length;
                return (
                  <motion.div key={project.id}
                    initial={{ opacity:0, y:8 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ delay:i*0.06 }}
                    className="p-5 rounded-2xl"
                    style={{
                      background:'rgba(10,10,18,0.9)',
                      border:`1px solid ${allDone
                        ? 'rgba(0,255,148,0.25)'
                        : 'rgba(34,34,51,0.6)'}`,
                      boxShadow: allDone
                        ? '0 0 15px rgba(0,255,148,0.06)'
                        : 'none',
                    }}>

                    {/* Project header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <h3 className="text-sm font-bold text-white truncate">
                          {project.title}
                        </h3>
                        {project.verified ? (
                          <span className="text-xs text-primary font-bold">
                            ✅ GitHub Verified ·
                            {project.commit_count > 0 && ` ${project.commit_count} commits`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600">
                            Not verified yet
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        {project.github_url && (
                          <a href={project.github_url}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg bg-dark-600 text-gray-500 hover:text-white transition-colors">
                            <GitBranch size={12}/>
                          </a>
                        )}
                        {project.live_url && (
                          <a href={project.live_url}
                            target="_blank" rel="noreferrer"
                            className="p-1.5 rounded-lg bg-dark-600 text-gray-500 hover:text-white transition-colors">
                            <ExternalLink size={12}/>
                          </a>
                        )}
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
                        {project.description}
                      </p>
                    )}

                    {/* Tech stack */}
                    {project.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.tech_stack.map((tech, j) => (
                          <span key={j}
                            className="px-1.5 py-0.5 rounded text-xs"
                            style={{ background:'rgba(0,255,148,0.06)', color:'#00FF94' }}>
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress steps */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span style={{ color:'#00FF94' }}>
                          {stepsDone}/{STEPS.length} steps
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {STEPS.map(step => {
                          const done = project[step.key];
                          return (
                            <button key={step.key}
                              onClick={() => updateStep(project.id, step.key, done)}
                              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center"
                              style={{
                                background: done
                                  ? 'rgba(0,255,148,0.1)'
                                  : 'rgba(18,18,26,0.8)',
                                border:`1px solid ${done
                                  ? 'rgba(0,255,148,0.3)'
                                  : 'rgba(34,34,51,0.5)'}`,
                              }}>
                              <span className="text-sm">{step.icon}</span>
                              <span className="text-xs leading-tight"
                                style={{ color: done ? '#00FF94' : '#555', fontSize:'9px' }}>
                                {step.label}
                              </span>
                              {done && (
                                <CheckCircle size={10} className="text-primary"/>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Verify button */}
                    {!project.verified && project.github_url && (
                      <button onClick={() => verifyGitHub(project)}
                        className="w-full py-2 rounded-xl text-xs font-bold transition-all"
                        style={{ background:'rgba(74,158,255,0.08)', color:'#4A9EFF', border:'1px solid rgba(74,158,255,0.2)' }}>
                        🔍 Verify on GitHub (need 3+ commits)
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Projects;
