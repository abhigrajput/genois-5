import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Moon, Heart, RotateCcw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';

const QUICK_REPLIES = [
  "I'm feeling overwhelmed 😔",
  "I don't think I'm smart enough",
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

It is late and you are here. Whatever you are going through right now — I am listening.

This is a safe space. No judgment. No pressure. Just talk to me.

What is on your mind tonight? 🌙`,
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    setMessages(prev => [...prev, {
      role:'user', content:msg, timestamp:new Date()
    }]);

    try {
      const systemPrompt = `You are a compassionate 2AM support chat for engineering students in India.

STUDENT: ${profile?.full_name || 'Student'}
CONTEXT: This student is studying ${profile?.domain_id || 'engineering'}.
They might be stressed about studies, placements, family pressure, feeling behind, or just lonely at night.

YOUR PERSONALITY:
- Warm and caring like a close senior friend
- Use Hinglish naturally when it feels right (yaar, bhai, arrey, sach mein, etc.)
- NEVER dismiss or minimize their feelings
- First acknowledge their feelings, THEN gently offer perspective
- Give realistic hope — not toxic positivity
- Remind them struggles are completely normal for engineering students
- Keep messages short, warm, conversational
- Use emojis naturally 💙
- If they seem very distressed, gently suggest talking to someone they trust

Remember: At 2AM people need to feel heard first. Not lectured.`;

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
              role: m.role,
              content: m.content,
            })),
            { role:'user', content:msg },
          ],
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text ||
        "I hear you. Tell me more about what is happening. 💙";

      setMessages(prev => [...prev, {
        role:'assistant', content:reply, timestamp:new Date()
      }]);

      await supabase.from('chat_history').insert({
        student_id: profile.id,
        message: msg,
        response: reply,
        mode: 'anxiety',
      });

    } catch(e) {
      console.error(e);
      setMessages(prev => [...prev, {
        role:'assistant',
        content:"I am having trouble connecting, but I am here. Try again in a moment. 💙",
        timestamp:new Date(),
      }]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Fresh start 💙 What is on your mind?",
      timestamp: new Date(),
    }]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto flex flex-col"
        style={{ height:'calc(100vh - 8rem)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold font-heading text-white flex items-center gap-2">
              <Moon size={18} className="text-secondary"/>
              2AM Chat
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Safe space · No judgment · Always here 💙
            </p>
          </div>
          <button onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-warning transition-colors"
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
              transition={{ duration:0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mr-2 mt-1"
                  style={{ background:'rgba(123,97,255,0.15)', border:'1px solid rgba(123,97,255,0.3)' }}>
                  <Heart size={13} className="text-secondary"/>
                </div>
              )}

              <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
              }`}
                style={msg.role === 'user' ? {
                  background:'rgba(123,97,255,0.15)',
                  border:'1px solid rgba(123,97,255,0.3)',
                  color:'white',
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
                style={{ background:'rgba(123,97,255,0.15)' }}>
                <Heart size={13} className="text-secondary"/>
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => (
                    <div key={i}
                      className="w-2 h-2 rounded-full bg-secondary animate-bounce"
                      style={{ animationDelay:`${i*0.15}s` }}/>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick replies */}
        <div className="flex gap-2 mb-3 overflow-x-auto flex-shrink-0 pb-1">
          {QUICK_REPLIES.map((reply, i) => (
            <button key={i}
              onClick={() => sendMessage(reply)}
              disabled={loading}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 hover:opacity-80 whitespace-nowrap"
              style={{
                background:'rgba(123,97,255,0.08)',
                color:'#7B61FF',
                border:'1px solid rgba(123,97,255,0.2)',
              }}>
              {reply}
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
            placeholder="Talk to me... what is happening? 💙"
            disabled={loading}
            className="flex-1 rounded-2xl px-4 py-3 text-sm placeholder-gray-600 disabled:opacity-50"
            style={{
              background:'rgba(10,10,18,0.9)',
              border:'1px solid rgba(123,97,255,0.2)',
              color:'white',
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="flex items-center justify-center w-12 h-12 rounded-2xl transition-all disabled:opacity-40 flex-shrink-0"
            style={{
              background: input.trim() && !loading
                ? 'rgba(123,97,255,0.2)'
                : 'rgba(123,97,255,0.05)',
              border:'1px solid rgba(123,97,255,0.3)',
            }}>
            <Send size={15} className="text-secondary"/>
          </button>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Chat2AM;
