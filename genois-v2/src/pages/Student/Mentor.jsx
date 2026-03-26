import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Brain, Zap, RotateCcw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const QUICK_ACTIONS = [
  { label:'Explain today\'s topic', icon:'📖' },
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
        content: `Hi ${profile?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your AI Mentor, specialized in ${profile?.domain_id || 'programming'}.

I know your current progress:
- Domain: ${profile?.domain_id || 'Not set'}
- Day: ${profile?.current_day || 1}
- Score: ${Math.round(profile?.skill_score || 0)}/1000
- Level: ${profile?.level || 'beginner'}

I can help you understand concepts, solve coding problems, review weak areas, and guide your learning. What do you need help with today?`,
        timestamp: new Date(),
      }]);
    }
  }, [profile?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const fetchActiveNode = async () => {
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
  };

  const loadHistory = async () => {
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
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setLoading(true);

    const userMsg = { role:'user', content:msg, timestamp:new Date() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const systemPrompt = `You are an expert AI Mentor for engineering students.

STUDENT PROFILE:
- Name: ${profile?.full_name || 'Student'}
- Domain: ${profile?.domain_id || 'fullstack'}
- Level: ${profile?.level || 'beginner'}
- Learning Speed: ${profile?.learning_speed || 'normal'}
- Current Day: ${profile?.current_day || 1}
- Score: ${Math.round(profile?.skill_score || 0)}/1000
- Current Topic: ${activeNode?.title || 'General'}
- Weak Topics: ${(profile?.weak_topics||[]).join(', ') || 'None identified yet'}
- Strong Topics: ${(profile?.strong_topics||[]).join(', ') || 'None identified yet'}

RULES:
- Explain in simple layman language first
- Use real-world analogies and examples
- For ${profile?.learning_speed === 'slow' ? 'slow learner: be extra patient, use very simple words, repeat key points' : profile?.learning_speed === 'fast' ? 'fast learner: go deep, include advanced concepts' : 'normal learner: balance simplicity and depth'}
- Always end with a practical exercise or next step
- Use emojis to make it engaging
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
      const reply = data.content?.[0]?.text || 'I could not generate a response. Please try again.';

      const assistantMsg = {
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);

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
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please check your internet and try again.',
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const clearChat = async () => {
    await supabase.from('mentor_history')
      .delete().eq('student_id', profile.id);
    setMessages([{
      role: 'assistant',
      content: `Chat cleared! How can I help you with ${profile?.domain_id || 'programming'} today?`,
      timestamp: new Date(),
    }]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">

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
              {activeNode && ` · Current: ${activeNode.title}`}
            </p>
          </div>
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-danger transition-colors"
            style={{ border:'1px solid rgba(34,34,51,0.6)' }}>
            <RotateCcw size={12}/> Clear
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:8 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.15 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background:'rgba(0,255,148,0.15)', border:'1px solid rgba(0,255,148,0.25)' }}>
                  <Brain size={14} className="text-primary"/>
                </div>
              )}

              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'text-white rounded-tr-sm'
                  : 'text-gray-200 rounded-tl-sm'
              }`}
                style={msg.role === 'user' ? {
                  background:'linear-gradient(135deg,#00FF94,#7B61FF)',
                  color:'#050508',
                } : {
                  background:'rgba(10,10,18,0.9)',
                  border:'1px solid rgba(34,34,51,0.6)',
                }}>
                <p className="whitespace-pre-wrap text-xs leading-relaxed">
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center mr-2"
                style={{ background:'rgba(0,255,148,0.15)' }}>
                <Brain size={14} className="text-primary"/>
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
              style={{ background:'rgba(10,10,18,0.9)', color:'#666', border:'1px solid rgba(34,34,51,0.6)' }}>
              {action.icon} {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask your mentor anything about your domain..."
            disabled={loading}
            className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm text-dark-900 disabled:opacity-40 transition-all flex-shrink-0"
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#00FF94,#7B61FF)'
                : 'rgba(0,255,148,0.05)',
              boxShadow: input.trim() && !loading
                ? '0 0 15px rgba(0,255,148,0.3)' : 'none',
            }}>
            <Send size={15}/>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Mentor;
