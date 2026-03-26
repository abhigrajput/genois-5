import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Moon, Heart, RotateCcw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';

const QUICK_REPLIES = [
  "I'm feeling overwhelmed with studies 😔",
  "I don't think I'm smart enough for this",
  "I failed my test and feel terrible",
  "Everyone else seems ahead of me",
  "I want to quit, it feels too hard",
  "I'm anxious about placements",
  "I study but nothing sticks",
  "I feel lonely and unmotivated",
];

const Chat2AM = () => {
  const { profile } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    setMessages([{
      role: 'assistant',
      content: `Hey ${profile?.full_name?.split(' ')[0] || 'friend'} 💙

It's late and you're here. Whatever you're going through right now — I'm listening.

This is a safe space. No judgment. No pressure. Just talk to me.

What's on your mind tonight? 🌙`,
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      role:'user', content:msg, timestamp:new Date()
    }]);

    try {
      const systemPrompt = `You are a compassionate 2AM Chat support for engineering students in India.

STUDENT: ${profile?.full_name || 'Student'}
CONTEXT: This student is studying ${profile?.domain_id || 'engineering'} and might be stressed about studies, placements, family pressure, or feeling behind.

YOUR ROLE:
- Be warm, empathetic, like a caring senior friend
- Use Hinglish naturally when appropriate (it feels more personal)
- NEVER dismiss their feelings
- Acknowledge their struggle first before giving any advice
- Give realistic hope (not toxic positivity)
- Share that struggles are normal for engineering students
- Remind them of small wins
- If they seem very distressed, gently encourage them to talk to someone they trust
- Keep messages short and warm, not lecture-y
- Use emojis naturally 💙

Remember: At 2AM, people need to feel heard, not lectured.`;

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
          max_tokens: 400,
          system: systemPrompt,
          messages: [
            ...messages.slice(-6).map(m => ({
              role: m.role, content: m.content,
            })),
            { role:'user', content:msg },
          ],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text ||
        "I hear you. Tell me more about what's happening. 💙";

      setMessages(prev => [...prev, {
        role:'assistant', content:reply, timestamp:new Date()
      }]);

      await supabase.from('chat_history').insert({
        student_id: profile.id,
        message: msg,
        response: reply,
      });

    } catch(e) {
      console.error(e);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now 😔 But I'm still here. Try again in a moment.",
        timestamp: new Date(),
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: `Hey ${profile?.full_name?.split(' ')[0] || 'friend'} 💙\n\nFresh start. What's on your mind? 🌙`,
      timestamp: new Date(),
    }]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold font-heading text-white flex items-center gap-2"
              style={{ textShadow:'0 0 15px rgba(123,97,255,0.3)' }}>
              <Moon size={20} className="text-secondary"/>
              2AM Chat
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Safe space · No judgment · Always here 💙
            </p>
          </div>
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-primary transition-colors"
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
                  style={{ background:'rgba(123,97,255,0.15)', border:'1px solid rgba(123,97,255,0.25)' }}>
                  <Moon size={14} className="text-secondary"/>
                </div>
              )}

              <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
                style={msg.role === 'user' ? {
                  background:'linear-gradient(135deg,#7B61FF,#4A9EFF)',
                  color:'white',
                  borderRadius:'18px 18px 4px 18px',
                } : {
                  background:'rgba(10,10,18,0.9)',
                  border:'1px solid rgba(123,97,255,0.2)',
                  borderRadius:'18px 18px 18px 4px',
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
                style={{ background:'rgba(123,97,255,0.15)' }}>
                <Moon size={14} className="text-secondary"/>
              </div>
              <div className="px-4 py-3 rounded-2xl"
                style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(123,97,255,0.2)' }}>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i}
                      className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background:'#7B61FF', animationDelay:`${i*0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick replies */}
        <div className="flex gap-2 mb-3 flex-wrap flex-shrink-0">
          {QUICK_REPLIES.map((reply, i) => (
            <button key={i}
              onClick={() => sendMessage(reply)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl text-xs transition-all disabled:opacity-40 hover:opacity-80"
              style={{ background:'rgba(123,97,255,0.08)', color:'#7B61FF', border:'1px solid rgba(123,97,255,0.2)' }}>
              {reply}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2 flex-shrink-0">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Talk to me... what's on your mind? 💙"
            disabled={loading}
            className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 transition-all flex-shrink-0"
            style={{
              background: input.trim() && !loading
                ? 'linear-gradient(135deg,#7B61FF,#4A9EFF)'
                : 'rgba(123,97,255,0.05)',
              color: input.trim() && !loading ? 'white' : '#555',
              boxShadow: input.trim() && !loading
                ? '0 0 15px rgba(123,97,255,0.3)' : 'none',
            }}>
            <Send size={15}/>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Chat2AM;
