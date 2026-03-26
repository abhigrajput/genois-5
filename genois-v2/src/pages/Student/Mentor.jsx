import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Brain, RotateCcw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';

const QUICK_ACTIONS = [
  { label:"Explain today's topic", icon:'📖' },
  { label:'Help me with coding', icon:'💻' },
  { label:'Review my weak areas', icon:'⚠️' },
  { label:'What should I study next?', icon:'🗺️' },
  { label:'Give me a practice problem', icon:'🎯' },
  { label:'Explain in simple terms', icon:'🧠' },
];

const Mentor = () => {
  const { profile } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      fetchActiveNode();
      loadHistory();
      setMessages([{
        role: 'assistant',
        content: `Hi ${profile?.full_name?.split(' ')[0] || 'there'}! 👋 I am your AI Mentor, specialized in ${profile?.domain_id || 'programming'}.

I know your current progress:
- Domain: ${profile?.domain_id || 'Not set'}
- Day: ${profile?.current_day || 1}
- Score: ${Math.round(profile?.skill_score || 0)}/1000
- Level: ${profile?.level || 'beginner'}
- Weak topics: ${(profile?.weak_topics||[]).join(', ') || 'None yet'}

Ask me anything — concepts, coding help, roadmap guidance, or practice problems!`,
        timestamp: new Date(),
      }]);
    }
  }, [profile?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

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
      if (nodes?.length) setActiveNode(nodes[0]);
    } catch(e) { console.error(e); }
  };

  const loadHistory = async () => {
    try {
      const { data } = await supabase
        .from('mentor_history').select('*')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: true })
        .limit(10);

      if (data?.length > 0) {
        const hist = data.flatMap(h => [
          { role:'user', content:h.message, timestamp:new Date(h.created_at) },
          { role:'assistant', content:h.response, timestamp:new Date(h.created_at) },
        ]);
        setMessages(prev => [...prev, ...hist]);
      }
    } catch(e) { console.error(e); }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      role:'user', content:msg, timestamp:new Date()
    }]);

    try {
      const systemPrompt = `You are an expert AI Mentor for engineering students in India.

STUDENT PROFILE:
- Name: ${profile?.full_name || 'Student'}
- Domain: ${profile?.domain_id || 'fullstack'}
- Level: ${profile?.level || 'beginner'}
- Learning Speed: ${profile?.learning_speed || 'normal'}
- Current Day: ${profile?.current_day || 1}
- Score: ${Math.round(profile?.skill_score || 0)}/1000
- Current Topic: ${activeNode?.title || 'General'}
- Weak Topics: ${(profile?.weak_topics||[]).join(', ') || 'None yet'}
- Strong Topics: ${(profile?.strong_topics||[]).join(', ') || 'None yet'}

TEACHING STYLE:
- Explain in simple layman language with real world analogies
- Use emojis to make it engaging
- ${profile?.learning_speed === 'slow'
    ? 'Student learns slowly: be very patient, use simple words, give step by step'
    : profile?.learning_speed === 'fast'
    ? 'Student learns fast: go deep, include advanced concepts and edge cases'
    : 'Normal pace: balance simplicity and depth'}
- Always end with one practical exercise or next action step
- If explaining code, add comments on every important line
- Keep responses focused and not too long`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [
            ...messages.slice(-6).map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role:'user', content:msg },
          ],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text ||
        'Sorry, I could not generate a response. Please try again.';

      setMessages(prev => [...prev, {
        role:'assistant', content:reply, timestamp:new Date()
      }]);

      await supabase.from('mentor_history').insert({
        student_id: profile.id,
        message: msg,
        response: reply,
        domain_id: profile.domain_id,
        topic: activeNode?.title || 'general',
      });

    } catch(e) {
      console.error(e);
      setMessages(prev => [...prev, {
        role:'assistant',
        content:'Sorry, I had trouble connecting. Please check your internet and try again.',
        timestamp:new Date(),
      }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    try {
      await supabase.from('mentor_history')
        .delete().eq('student_id', profile.id);
    } catch(e) { console.error(e); }
    setMessages([{
      role: 'assistant',
      content: `Chat cleared! How can I help you with ${profile?.domain_id || 'programming'} today? 🧠`,
      timestamp: new Date(),
    }]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col"
        style={{ height:'calc(100vh - 8rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold font-heading text-white flex items-center gap-2"
              style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              <Brain size={20} className="text-primary"/>
              AI Mentor
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Specialized in {profile?.domain_id || 'your domain'} ·
              Knows your progress
              {activeNode && ` · Topic: ${activeNode.title}`}
            </p>
          </div>
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-danger transition-colors"
            style={{ border:'1px solid rgba(34,34,51,0.6)' }}>
            <RotateCcw size={12}/> Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.15 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background:'rgba(0,255,148,0.12)', border:'1px solid rgba(0,255,148,0.25)' }}>
                  <Brain size={13} className="text-primary"/>
                </div>
              )}

              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
              }`}
                style={msg.role === 'user' ? {
                  background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                  color:'#050508',
                } : {
                  background:'rgba(10,10,18,0.9)',
                  border:'1px solid rgba(34,34,51,0.6)',
                  color:'#D0D0E0',
                }}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mr-2 flex-shrink-0"
                style={{ background:'rgba(0,255,148,0.12)', border:'1px solid rgba(0,255,148,0.25)' }}>
                <Brain size={13} className="text-primary"/>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i}
                      className="w-2 h-2 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay:`${i*0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mb-3 flex-wrap flex-shrink-0">
          {QUICK_ACTIONS.map((action, i) => (
            <button key={i}
              onClick={() => sendMessage(action.label)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 hover:opacity-80"
              style={{
                background:'rgba(10,10,18,0.9)',
                color:'#666',
                border:'1px solid rgba(34,34,51,0.6)',
              }}>
              {action.icon} {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask your mentor anything..."
            disabled={loading}
            className="flex-1 rounded-2xl px-4 py-3 text-sm placeholder-gray-600 disabled:opacity-50"
            style={{
              background:'rgba(10,10,18,0.9)',
              border:'1px solid rgba(0,255,148,0.15)',
              color:'white',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-12 h-12 rounded-2xl font-bold transition-all disabled:opacity-40 flex-shrink-0"
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#00FF94,#7B61FF)'
                : 'rgba(0,255,148,0.05)',
              boxShadow: input.trim() && !loading
                ? '0 0 15px rgba(0,255,148,0.3)' : 'none',
            }}>
            <Send size={15} style={{ color: input.trim() && !loading ? '#050508' : '#555' }}/>
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Mentor;
