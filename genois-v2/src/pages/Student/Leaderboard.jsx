import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, TrendingUp } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';

const TIER = (s) => {
  if (s >= 801) return { label:'Elite',      color:'#FFD700' };
  if (s >= 601) return { label:'Advanced',   color:'#7B61FF' };
  if (s >= 401) return { label:'Proficient', color:'#00FF94' };
  if (s >= 201) return { label:'Developing', color:'#4A9EFF' };
  return               { label:'Beginner',   color:'#555' };
};

const Leaderboard = () => {
  const { profile } = useStore();
  const [global, setGlobal] = useState([]);
  const [college, setCollege] = useState([]);
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    if (profile?.id) fetchAll();
  }, [profile?.id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: globalData } = await supabase
        .from('profiles')
        .select('id,full_name,college,domain_id,skill_score,streak_count,current_day')
        .order('skill_score', { ascending: false })
        .limit(50);

      const gl = globalData || [];
      setGlobal(gl);

      const myIdx = gl.findIndex(p => p.id === profile.id);
      setMyRank(myIdx >= 0 ? myIdx + 1 : null);

      if (profile.college) {
        const { data: collegeData } = await supabase
          .from('profiles')
          .select('id,full_name,college,domain_id,skill_score,streak_count,current_day')
          .eq('college', profile.college)
          .order('skill_score', { ascending: false })
          .limit(20);
        setCollege(collegeData || []);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const currentList = tab === 'global' ? global : college;

  const MEDALS = ['🥇','🥈','🥉'];

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold font-heading text-white"
            style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
            🏆 Leaderboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            See where you rank among all Genois students
          </p>
        </div>

        {/* My rank card */}
        {myRank && (
          <div className="p-4 rounded-xl mb-5 flex items-center justify-between"
            style={{ background:'rgba(0,255,148,0.05)', border:'1px solid rgba(0,255,148,0.2)' }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold font-heading text-primary">
                #{myRank}
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Your Global Rank
                </p>
                <p className="text-xs text-gray-500">
                  Score: {Math.round(profile?.skill_score||0)} ·
                  Streak: {profile?.streak_count||0} days
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {myRank <= 10 ? '🔥 Top 10!' :
                  myRank <= 50 ? '⚡ Top 50' : '📈 Keep going'}
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[
            { id:'global',  label:'🌍 Global' },
            { id:'college', label:`🎓 ${profile?.college || 'College'}` },
          ].map(t => (
            <button key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={tab === t.id ? {
                background:'#00FF94', color:'#050508',
              } : {
                background:'rgba(10,10,18,0.8)',
                color:'#555',
                border:'1px solid rgba(34,34,51,0.5)',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 rounded-xl animate-pulse"
                style={{ background:'rgba(18,18,26,0.8)' }}/>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🏆</div>
            <p className="text-gray-500 text-sm">
              {tab === 'college'
                ? 'No other students from your college yet. Be the first!'
                : 'No students found'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map((student, i) => {
              const rank = i + 1;
              const isMe = student.id === profile.id;
              const score = Math.round(student.skill_score || 0);
              const tier = TIER(score);
              return (
                <motion.div key={student.id}
                  initial={{ opacity:0, x:-10 }}
                  animate={{ opacity:1, x:0 }}
                  transition={{ delay:i*0.03 }}
                  className="flex items-center gap-4 p-4 rounded-2xl transition-all"
                  style={{
                    background: isMe
                      ? 'rgba(0,255,148,0.06)'
                      : 'rgba(10,10,18,0.9)',
                    border:`1px solid ${isMe
                      ? 'rgba(0,255,148,0.25)'
                      : 'rgba(34,34,51,0.5)'}`,
                    boxShadow: isMe
                      ? '0 0 15px rgba(0,255,148,0.08)'
                      : 'none',
                  }}>

                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {rank <= 3 ? (
                      <span className="text-lg">{MEDALS[rank-1]}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-600">
                        #{rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{
                      background:`${tier.color}20`,
                      color:tier.color,
                      border:`1px solid ${tier.color}30`,
                    }}>
                    {student.full_name?.charAt(0)?.toUpperCase() || 'G'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${
                        isMe ? 'text-primary' : 'text-white'
                      }`}>
                        {student.full_name || 'Anonymous'}
                        {isMe && (
                          <span className="text-xs text-gray-500 ml-1">
                            (you)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {student.college && (
                        <span className="text-xs text-gray-600 truncate max-w-32">
                          {student.college}
                        </span>
                      )}
                      {student.domain_id && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background:`${tier.color}10`, color:tier.color, fontSize:'9px' }}>
                          {student.domain_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-bold font-heading"
                      style={{ color:tier.color }}>
                      {score}
                    </div>
                    <div className="text-xs text-gray-600">
                      🔥 {student.streak_count || 0}d
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* How scoring works */}
        <div className="mt-5 p-4 rounded-xl"
          style={{ background:'rgba(10,10,18,0.6)', border:'1px solid rgba(34,34,51,0.5)' }}>
          <p className="text-xs font-bold text-gray-500 mb-2">
            📊 How Genois Score Works
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon:'⚡', label:'Task done', pts:'+8' },
              { icon:'📝', label:'Test passed', pts:'+10' },
              { icon:'🗺️', label:'Day complete', pts:'+15' },
            ].map((item, i) => (
              <div key={i} className="text-center p-2 rounded-lg"
                style={{ background:'rgba(0,255,148,0.04)' }}>
                <div className="text-base">{item.icon}</div>
                <div className="text-xs text-primary font-bold">{item.pts}</div>
                <div className="text-xs text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default Leaderboard;
