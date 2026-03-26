import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, CheckSquare, FileText,
  BookOpen, User, BarChart2, Brain, MessageCircle,
  FolderOpen, Trophy, Zap, ChevronLeft, ChevronRight,
  LogOut
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const NAV = [
  { icon:LayoutDashboard, label:'Dashboard',   path:'/student/dashboard' },
  { icon:Map,             label:'Roadmap',     path:'/student/roadmap' },
  { icon:CheckSquare,     label:'Tasks',       path:'/student/tasks' },
  { icon:FileText,        label:'Tests',       path:'/student/tests' },
  { icon:FolderOpen,      label:'Projects',    path:'/student/projects' },
  { icon:BookOpen,        label:'Notes',       path:'/student/notes' },
  { icon:Brain,           label:'AI Mentor',   path:'/student/mentor' },
  { icon:MessageCircle,   label:'2AM Chat',    path:'/student/chat' },
  { icon:User,            label:'Profile',     path:'/student/profile' },
  { icon:BarChart2,       label:'Analytics',   path:'/student/analytics' },
  { icon:Trophy,          label:'Leaderboard', path:'/student/leaderboard' },
];

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, logout } = useStore();
  const navigate = useNavigate();

  const score = Math.round(profile?.skill_score || 0);
  const tier = score >= 801 ? { label:'Elite',      color:'#FFD700' }
    : score >= 601 ? { label:'Advanced',   color:'#7B61FF' }
    : score >= 401 ? { label:'Proficient', color:'#00FF94' }
    : score >= 201 ? { label:'Developing', color:'#4A9EFF' }
    : { label:'Beginner',   color:'#555' };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? '60px' : '220px',
        background: 'rgba(5,5,8,0.98)',
        borderRight: '1px solid rgba(0,255,148,0.08)',
        boxShadow: '2px 0 20px rgba(0,0,0,0.4)',
      }}>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center z-50"
        style={{ background:'#0A0A0F', border:'1px solid rgba(0,255,148,0.2)', color:'#00FF94' }}>
        {collapsed ? <ChevronRight size={12}/> : <ChevronLeft size={12}/>}
      </button>

      {/* Profile mini */}
      {!collapsed && (
        <div className="p-3 border-b border-dark-600 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background:`${tier.color}20`, color:tier.color, border:`1px solid ${tier.color}30` }}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'G'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {profile?.full_name || 'Student'}
              </p>
              <p className="text-xs font-bold" style={{ color:tier.color }}>
                {score} pts · {tier.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map(({ icon:Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive ? 'nav-active' : 'text-gray-500 hover:text-gray-200 hover:bg-white/[0.03]'
              }`
            }
            title={collapsed ? label : undefined}>
            <Icon size={16} className="flex-shrink-0"/>
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Domain + Logout */}
      <div className="p-2 border-t border-dark-600 flex-shrink-0 space-y-1">
        {!collapsed && profile?.domain_id && (
          <NavLink to="/explore-domains"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-600 hover:text-primary hover:bg-primary/5 transition-all">
            <Zap size={13}/>
            <span className="truncate capitalize">{profile.domain_id}</span>
          </NavLink>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-danger hover:bg-danger/5 transition-all">
          <LogOut size={15} className="flex-shrink-0"/>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
