import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { profile, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const trial = profile ? (() => {
    const expires = profile.trial_expires_at
      ? new Date(profile.trial_expires_at) : null;
    const now = new Date();
    const daysLeft = expires
      ? Math.max(0, Math.ceil((expires - now) / (1000*60*60*24)))
      : 0;
    const isPaid = profile.subscription_status === 'active';
    const expired = !isPaid && expires && now > expires;
    return { daysLeft, isPaid, expired };
  })() : null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4"
      style={{
        background: 'rgba(5,5,8,0.97)',
        borderBottom: '1px solid rgba(0,255,148,0.1)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 2px 20px rgba(0,0,0,0.5)',
      }}>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2">
        <span className="logo-glow text-lg font-bold font-heading">
          GENOIS AI
        </span>
      </Link>

      {/* Trial banner inline */}
      {trial && !trial.isPaid && !trial.expired && trial.daysLeft <= 5 && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg"
          style={{ background:'rgba(255,179,71,0.08)', border:'1px solid rgba(255,179,71,0.2)' }}>
          <span className="text-xs text-warning font-semibold">
            ⏰ {trial.daysLeft} days trial left
          </span>
          <Link to="/pricing"
            className="text-xs font-bold text-dark-900 px-2 py-0.5 rounded-md"
            style={{ background:'#FFB347' }}>
            Upgrade
          </Link>
        </div>
      )}

      {trial && trial.expired && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg"
          style={{ background:'rgba(255,107,107,0.08)', border:'1px solid rgba(255,107,107,0.2)' }}>
          <span className="text-xs text-danger font-semibold">⚠️ Trial expired</span>
          <Link to="/pricing"
            className="text-xs font-bold text-white px-2 py-0.5 rounded-md"
            style={{ background:'#FF6B6B' }}>
            Upgrade Now
          </Link>
        </div>
      )}

      {/* Right side */}
      <div className="flex items-center gap-3">
        {profile ? (
          <>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background:'rgba(0,255,148,0.2)', color:'#00FF94' }}>
                {profile.full_name?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <span className="text-xs text-gray-400 max-w-24 truncate">
                {profile.full_name || profile.email}
              </span>
            </div>
            <button onClick={handleLogout}
              className="text-xs text-gray-600 hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger/10">
              Logout
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            <Link to="/login"
              className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:text-white transition-colors"
              style={{ border:'1px solid rgba(34,34,51,0.6)' }}>
              Login
            </Link>
            <Link to="/register"
              className="text-xs font-bold text-dark-900 px-3 py-1.5 rounded-lg"
              style={{ background:'#00FF94' }}>
              Start Free
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
