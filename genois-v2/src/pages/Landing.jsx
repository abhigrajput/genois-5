import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Day-by-Day Roadmap',
    desc: 'Personalized learning path for your domain with YouTube resources, articles, and coding practice for every single day.',
    color: '#00FF94',
  },
  {
    icon: '⚡',
    title: 'Daily Tasks + Timer',
    desc: 'Anti-cheat timer ensures you actually study. Complete tasks to earn Genois Score. No shortcuts.',
    color: '#4A9EFF',
  },
  {
    icon: '📝',
    title: 'Daily + Weekly Tests',
    desc: 'Knowledge tests after every topic. Weakness detection tells you exactly what to revisit.',
    color: '#7B61FF',
  },
  {
    icon: '🧠',
    title: 'AI Mentor',
    desc: 'Your personal AI tutor knows your domain, progress, and weak areas. Explains like a friend, not a textbook.',
    color: '#FFB347',
  },
  {
    icon: '💻',
    title: 'GitHub Verified Projects',
    desc: 'Build real projects, push to GitHub, get verified. Companies trust commit history over certificates.',
    color: '#FF6B6B',
  },
  {
    icon: '🎯',
    title: 'Job Ready Meter',
    desc: 'Live score showing exactly how job-ready you are. Breakdown of score, roadmap, projects, and tests.',
    color: '#FFD700',
  },
  {
    icon: '🏆',
    title: 'Skill Identity',
    desc: 'A verified public profile you share instead of a resume. Your score is built from real daily activity.',
    color: '#00D68F',
  },
  {
    icon: '💬',
    title: '2AM Anxiety Chat',
    desc: 'Feeling overwhelmed at night? Talk to an AI that understands engineering student pressure. In Hinglish.',
    color: '#FF6EFF',
  },
];

const DOMAINS = [
  { icon:'🌐', name:'Full Stack Dev',   color:'#00FF94' },
  { icon:'🧠', name:'DSA',              color:'#7B61FF' },
  { icon:'🤖', name:'AI/ML',            color:'#4A9EFF' },
  { icon:'🔐', name:'Cybersecurity',    color:'#FF6B6B' },
  { icon:'☁️', name:'DevOps',           color:'#FFB347' },
  { icon:'📱', name:'Mobile Dev',       color:'#00D68F' },
  { icon:'📊', name:'Data Science',     color:'#FF6EFF' },
  { icon:'⛓️', name:'Blockchain',       color:'#F7931A' },
  { icon:'🎮', name:'Game Dev',         color:'#00CFFF' },
  { icon:'🏗️', name:'System Design',   color:'#AAFF00' },
];

const STATS = [
  { value:'10+', label:'CS Domains' },
  { value:'30',  label:'Days per Domain' },
  { value:'300+', label:'Daily Resources' },
  { value:'Free', label:'14-Day Trial' },
];

const Landing = () => {
  const { user } = useStore();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (user) navigate('/student/dashboard');
  }, [user]);

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.4 + 0.1,
    }));

    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,255,148,${p.a})`;
        ctx.fill();
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-screen"
      style={{ background:'#050508', color:'#E2E2F0' }}>

      {/* Particle canvas */}
      <canvas ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity:0.4 }}/>

      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:`
            radial-gradient(ellipse 80% 50% at 20% 0%,
              rgba(0,255,148,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 100%,
              rgba(123,97,255,0.06) 0%, transparent 60%)
          `,
        }}/>

      {/* Cyber grid */}
      <div className="fixed inset-0 pointer-events-none z-0 cyber-grid" style={{ opacity:0.4 }}/>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background:'rgba(5,5,8,0.8)',
          borderBottom:'1px solid rgba(0,255,148,0.08)',
          backdropFilter:'blur(20px)',
        }}>
        <div className="logo-glow text-xl font-bold font-heading">
          GENOIS AI
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl"
            style={{ border:'1px solid rgba(34,34,51,0.6)' }}>
            Login
          </Link>
          <Link to="/register"
            className="text-sm font-bold text-dark-900 px-4 py-2 rounded-xl transition-all"
            style={{ background:'#00FF94', boxShadow:'0 0 15px rgba(0,255,148,0.4)' }}>
            Start Free →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <div className="text-center max-w-4xl mx-auto">

          {/* Badge */}
          <motion.div
            initial={{ opacity:0, y:-20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-xs font-bold"
            style={{ background:'rgba(0,255,148,0.08)', border:'1px solid rgba(0,255,148,0.25)', color:'#00FF94' }}>
            ✨ India's First Career OS for Engineering Students
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.1 }}
            className="text-5xl md:text-7xl font-bold font-heading leading-tight mb-6">
            <span style={{
              background:'linear-gradient(135deg, #00FF94 0%, #7B61FF 50%, #4A9EFF 100%)',
              WebkitBackgroundClip:'text',
              WebkitTextFillColor:'transparent',
              filter:'drop-shadow(0 0 30px rgba(0,255,148,0.3))',
            }}>
              Stop Faking.
            </span>
            <br/>
            <span className="text-white">
              Start Building.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.2 }}
            className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
            Genois AI guides engineering students day by day —
            roadmaps, tasks, tests, AI mentor, and a
            <span className="text-primary font-semibold"> verified skill score</span> that
            proves your ability without fake certificates.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity:0, y:20 }}
            animate={{ opacity:1, y:0 }}
            transition={{ duration:0.6, delay:0.3 }}
            className="flex items-center justify-center gap-4 flex-wrap mb-12">
            <Link to="/register"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-dark-900 transition-all"
              style={{
                background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                boxShadow:'0 0 30px rgba(0,255,148,0.4), 0 0 60px rgba(0,255,148,0.1)',
              }}>
              🚀 Start Free Trial — 14 Days
            </Link>
            <Link to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm text-gray-300 transition-all hover:text-white"
              style={{ background:'rgba(18,18,26,0.8)', border:'1px solid rgba(34,34,51,0.8)' }}>
              Already have account →
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity:0 }}
            animate={{ opacity:1 }}
            transition={{ delay:0.5 }}
            className="grid grid-cols-4 gap-4 max-w-xl mx-auto">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold font-heading"
                  style={{ color:'#00FF94' }}>
                  {stat.value}
                </div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* DOMAINS */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold font-heading text-white mb-2">
              10 CS Domains. One Platform.
            </h2>
            <p className="text-gray-500 text-sm">
              Choose your domain. Get a personalized roadmap. Start today.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {DOMAINS.map((domain, i) => (
              <motion.div key={i}
                initial={{ opacity:0, scale:0.9 }}
                whileInView={{ opacity:1, scale:1 }}
                transition={{ delay:i*0.05 }}
                whileHover={{ scale:1.05, y:-2 }}
                className="p-4 rounded-2xl text-center cursor-pointer transition-all"
                style={{
                  background:`${domain.color}06`,
                  border:`1px solid ${domain.color}20`,
                }}>
                <div className="text-2xl mb-1">{domain.icon}</div>
                <p className="text-xs font-bold text-white leading-tight">
                  {domain.name}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-white mb-2">
              Everything You Need to Get Hired
            </h2>
            <p className="text-gray-500 text-sm">
              Built for Indian engineering students by someone who understands the struggle.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div key={i}
                initial={{ opacity:0, y:20 }}
                whileInView={{ opacity:1, y:0 }}
                transition={{ delay:i*0.06 }}
                className="p-5 rounded-2xl"
                style={{
                  background:'rgba(8,8,14,0.9)',
                  border:`1px solid ${feat.color}18`,
                  boxShadow:`0 0 20px ${feat.color}05`,
                }}>
                <div className="text-3xl mb-3">{feat.icon}</div>
                <h3 className="text-sm font-bold text-white mb-2 font-heading">
                  {feat.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-white mb-2">
              Your Daily Learning Flow
            </h2>
            <p className="text-gray-500 text-sm">
              Every day follows the same proven system
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { step:'01', label:'Watch Video', icon:'🎥', color:'#FF6B6B' },
              { step:'02', label:'Read Article', icon:'📖', color:'#4A9EFF' },
              { step:'03', label:'Code Practice', icon:'💻', color:'#00FF94' },
              { step:'04', label:'Take Test', icon:'📝', color:'#7B61FF' },
              { step:'05', label:'Build Project', icon:'🔨', color:'#FFB347' },
              { step:'06', label:'Unlock Next Day', icon:'🔓', color:'#FFD700' },
            ].map((item, i) => (
              <React.Fragment key={i}>
                <motion.div
                  initial={{ opacity:0, scale:0.8 }}
                  whileInView={{ opacity:1, scale:1 }}
                  transition={{ delay:i*0.1 }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center w-28"
                  style={{
                    background:`${item.color}08`,
                    border:`1px solid ${item.color}20`,
                  }}>
                  <span className="text-xs font-bold text-gray-600">
                    {item.step}
                  </span>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-bold text-white leading-tight">
                    {item.label}
                  </span>
                </motion.div>
                {i < 5 && (
                  <span className="text-gray-700 text-lg hidden md:block">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* SCORE SECTION */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 rounded-2xl text-center"
            style={{
              background:'linear-gradient(135deg, rgba(0,255,148,0.06), rgba(123,97,255,0.06))',
              border:'1px solid rgba(0,255,148,0.15)',
            }}>
            <h2 className="text-3xl font-bold font-heading mb-3">
              <span style={{
                background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
              }}>
                The Genois Score™
              </span>
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
              Every point is earned through real daily activity.
              Timestamped. Verified. Cannot be faked.
              Companies see your actual skill — not a certificate.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { icon:'⚡', action:'Task Done',    pts:'+8 pts',  color:'#00FF94' },
                { icon:'📝', action:'Test Passed',  pts:'+10 pts', color:'#4A9EFF' },
                { icon:'🗺️', action:'Day Complete', pts:'+15 pts', color:'#7B61FF' },
                { icon:'💻', action:'Project Step', pts:'+10 pts', color:'#FFB347' },
              ].map((item, i) => (
                <div key={i}
                  className="p-4 rounded-xl text-center"
                  style={{ background:`${item.color}08`, border:`1px solid ${item.color}15` }}>
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-400">{item.action}</div>
                  <div className="text-sm font-bold font-heading mt-1"
                    style={{ color:item.color }}>
                    {item.pts}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 text-xs text-gray-600">
              {[
                { label:'Beginner',    score:'0-200',   color:'#555' },
                { label:'Developing',  score:'201-400',  color:'#4A9EFF' },
                { label:'Proficient',  score:'401-600',  color:'#00FF94' },
                { label:'Advanced',    score:'601-800',  color:'#7B61FF' },
                { label:'Elite',       score:'801-1000', color:'#FFD700' },
              ].map((tier, i) => (
                <div key={i} className="text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1"
                    style={{ background:tier.color, boxShadow:`0 0 6px ${tier.color}` }}/>
                  <div style={{ color:tier.color }} className="font-bold">
                    {tier.label}
                  </div>
                  <div>{tier.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOR THIEL — SOCIAL PROOF */}
      <section className="relative z-10 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading text-white mb-3">
            Built for India's Engineers
          </h2>
          <p className="text-gray-500 text-sm mb-10 max-w-xl mx-auto">
            Tier 2 and Tier 3 college students deserve the same
            tools as IIT students. Genois makes that possible.
          </p>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote:"Finally a platform that tracks REAL progress. Not just certificates.",
                name:"Rahul K.",
                college:"VTU, 3rd Year CSE",
                score:"423 pts",
              },
              {
                quote:"The 2AM Chat saved me during placement prep. Felt genuinely heard.",
                name:"Priya M.",
                college:"KLEIT, 4th Year",
                score:"387 pts",
              },
              {
                quote:"My roadmap has YouTube links for everything. I actually follow it daily.",
                name:"Arjun S.",
                college:"MSRIT, 2nd Year",
                score:"512 pts",
              },
            ].map((t, i) => (
              <motion.div key={i}
                initial={{ opacity:0, y:15 }}
                whileInView={{ opacity:1, y:0 }}
                transition={{ delay:i*0.1 }}
                className="p-5 rounded-2xl text-left"
                style={{ background:'rgba(8,8,14,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                <p className="text-sm text-gray-300 leading-relaxed mb-4 italic">
                  "{t.quote}"
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-xs text-gray-600">{t.college}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full"
                    style={{ background:'rgba(0,255,148,0.1)', color:'#00FF94' }}>
                    {t.score}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative z-10 py-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity:0, scale:0.95 }}
            whileInView={{ opacity:1, scale:1 }}
            className="p-10 rounded-3xl"
            style={{
              background:'linear-gradient(135deg, rgba(0,255,148,0.06), rgba(123,97,255,0.06))',
              border:'1px solid rgba(0,255,148,0.2)',
              boxShadow:'0 0 60px rgba(0,255,148,0.08)',
            }}>
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-3xl font-bold font-heading mb-3">
              <span style={{
                background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                WebkitBackgroundClip:'text',
                WebkitTextFillColor:'transparent',
              }}>
                Start Your Journey Today
              </span>
            </h2>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              14 days free. No credit card. All features unlocked.
              Join thousands of engineering students building real skills.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register"
                className="px-8 py-4 rounded-2xl font-bold text-lg text-dark-900 transition-all"
                style={{
                  background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                  boxShadow:'0 0 30px rgba(0,255,148,0.4)',
                }}>
                Start Free Trial 🚀
              </Link>
              <Link to="/pricing"
                className="px-8 py-4 rounded-2xl font-bold text-sm text-gray-300 transition-all hover:text-white"
                style={{ background:'rgba(18,18,26,0.8)', border:'1px solid rgba(34,34,51,0.8)' }}>
                View Pricing →
              </Link>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              Free for 14 days · No credit card · Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-8 px-4 border-t border-dark-600">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="logo-glow text-base font-bold font-heading">
            GENOIS AI
          </div>
          <div className="flex gap-6 text-xs text-gray-600">
            <Link to="/pricing" className="hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link to="/login" className="hover:text-primary transition-colors">
              Login
            </Link>
            <Link to="/register" className="hover:text-primary transition-colors">
              Register
            </Link>
          </div>
          <p className="text-xs text-gray-700">
            © 2025 Genois AI · Career OS for Engineers
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
