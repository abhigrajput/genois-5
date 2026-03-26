import React from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useStore from '../../store/useStore';

const Dashboard = () => {
  const { profile } = useStore();
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold font-heading text-white mb-2"
          style={{ textShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
          Welcome back, {profile?.full_name?.split(' ')[0] || 'Student'} 👋
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Your career OS is ready. More features coming soon.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon:'⚡', label:'Genois Score', value: Math.round(profile?.skill_score||0) + '/1000' },
            { icon:'🔥', label:'Streak', value: (profile?.streak_count||0) + ' days' },
            { icon:'📅', label:'Current Day', value: 'Day ' + (profile?.current_day||1) },
            { icon:'🎯', label:'Domain', value: profile?.domain_id || 'Not set' },
          ].map((stat,i) => (
            <div key={i} className="p-4 rounded-2xl text-center card-hover"
              style={{ background:'rgba(10,10,18,0.9)', border:'1px solid rgba(34,34,51,0.6)' }}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-lg font-bold text-white font-heading">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
