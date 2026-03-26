import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useStore from '../../store/useStore';
import { Link } from 'react-router-dom';

const TrialBanner = ({ profile }) => {
  if (!profile) return null;
  const isPaid = profile.subscription_status === 'active';
  if (isPaid) return null;
  const expires = profile.trial_expires_at
    ? new Date(profile.trial_expires_at) : null;
  const now = new Date();
  const expired = expires && now > expires;
  const daysLeft = expires
    ? Math.max(0, Math.ceil((expires - now) / (1000*60*60*24)))
    : 0;

  if (expired) return (
    <div className="flex items-center justify-center gap-3 px-4 py-1.5 flex-shrink-0"
      style={{ background:'rgba(255,107,107,0.08)', borderBottom:'1px solid rgba(255,107,107,0.2)' }}>
      <span className="text-xs font-semibold text-danger">⚠️ Free trial expired</span>
      <Link to="/pricing"
        className="px-3 py-1 rounded-lg text-xs font-bold text-white"
        style={{ background:'#FF6B6B' }}>
        Upgrade Now →
      </Link>
    </div>
  );

  if (daysLeft <= 3) return (
    <div className="flex items-center justify-center gap-3 px-4 py-1.5 flex-shrink-0"
      style={{ background:'rgba(255,179,71,0.06)', borderBottom:'1px solid rgba(255,179,71,0.15)' }}>
      <span className="text-xs text-warning font-semibold">
        ⏰ {daysLeft} day{daysLeft !== 1 ? 's' : ''} left in free trial
      </span>
      <Link to="/pricing"
        className="px-2 py-0.5 rounded-md text-xs font-bold text-dark-900"
        style={{ background:'#FFB347' }}>
        Upgrade
      </Link>
    </div>
  );

  if (daysLeft <= 7) return (
    <div className="flex items-center justify-center gap-2 px-4 py-1 flex-shrink-0"
      style={{ background:'rgba(0,255,148,0.03)', borderBottom:'1px solid rgba(0,255,148,0.08)' }}>
      <span className="text-xs text-gray-600">
        ✨ Free trial: {daysLeft} days remaining —
        <Link to="/pricing" className="text-primary ml-1 hover:underline">
          View plans
        </Link>
      </span>
    </div>
  );

  return null;
};

const DashboardLayout = ({ children }) => {
  const { profile } = useStore();

  return (
    <div className="min-h-screen cyber-grid" style={{ background:'#050508' }}>
      <Navbar />
      <div className="flex pt-14">
        <Sidebar />
        <main
          className="flex-1 min-h-screen flex flex-col transition-all duration-300"
          style={{ marginLeft:'220px' }}>
          <TrialBanner profile={profile} />
          <div className="flex-1 p-5 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
