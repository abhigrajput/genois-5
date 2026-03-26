import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const { setUser, setProfile } = useStore();
  const [form, setForm] = useState({ email:'', password:'' });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setUser(data.user);
    const { data: profile } = await supabase
      .from('profiles').select('*')
      .eq('id', data.user.id).single();
    if (profile) setProfile(profile);
    toast.success('Welcome back! 👋');
    navigate('/student/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen cyber-grid flex items-center justify-center px-4">
      <div className="w-full max-w-md p-8 rounded-2xl cyber-card">
        <h1 className="text-2xl font-bold logo-glow font-heading mb-2">GENOIS AI</h1>
        <p className="text-gray-500 text-sm mb-6">Login to your account</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input type="email" required
              value={form.email}
              onChange={e => setForm(p => ({...p, email:e.target.value}))}
              placeholder="your@email.com"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Password</label>
            <input type="password" required
              value={form.password}
              onChange={e => setForm(p => ({...p, password:e.target.value}))}
              placeholder="••••••••"
              className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-dark-900 disabled:opacity-50"
            style={{ background:'linear-gradient(135deg,#00FF94,#7B61FF)', boxShadow:'0 0 20px rgba(0,255,148,0.3)' }}>
            {loading ? 'Logging in...' : 'Login →'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">
          No account?{' '}
          <Link to="/register" className="text-primary hover:underline">Register free</Link>
        </p>
      </div>
    </div>
  );
};
export default Login;
