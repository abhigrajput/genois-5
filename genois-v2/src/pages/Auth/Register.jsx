import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const { setUser, setProfile } = useStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name:'', email:'', password:'',
    college:'', year:'', branch:'',
  });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    });
    if (error) {
      if (error.status === 422) {
        toast.error('Email already registered. Please login.');
        navigate('/login');
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: form.full_name,
        college: form.college,
        year: form.year,
        branch: form.branch,
        email: form.email,
      }).eq('id', data.user.id);
      setUser(data.user);
      const { data: profile } = await supabase
        .from('profiles').select('*')
        .eq('id', data.user.id).single();
      if (profile) setProfile(profile);
      toast.success('Welcome to Genois AI! 🎉');
      navigate('/explore-domains');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen cyber-grid flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md p-8 rounded-2xl cyber-card">
        <h1 className="text-2xl font-bold logo-glow font-heading mb-2">GENOIS AI</h1>
        <p className="text-gray-500 text-sm mb-6">Create your account — 14 days free</p>
        <form onSubmit={handleRegister} className="space-y-3">
          {[
            { key:'full_name', label:'Full Name', type:'text', placeholder:'Abhishek Rajput' },
            { key:'email', label:'Email', type:'email', placeholder:'your@email.com' },
            { key:'password', label:'Password', type:'password', placeholder:'min 6 characters' },
            { key:'college', label:'College Name', type:'text', placeholder:'KLEIT, VTU...' },
            { key:'year', label:'Year', type:'text', placeholder:'3rd Year' },
            { key:'branch', label:'Branch', type:'text', placeholder:'Computer Science' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
              <input type={f.type} required={f.key !== 'year' && f.key !== 'branch'}
                value={form[f.key]}
                onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))}
                placeholder={f.placeholder}
                className="w-full bg-dark-700 border border-dark-500 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-sm text-dark-900 disabled:opacity-50 mt-2"
            style={{ background:'linear-gradient(135deg,#00FF94,#7B61FF)', boxShadow:'0 0 20px rgba(0,255,148,0.3)' }}>
            {loading ? 'Creating account...' : 'Start Free Trial →'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">
          Have account?{' '}
          <Link to="/login" className="text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};
export default Register;
