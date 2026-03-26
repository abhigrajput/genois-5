import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useStore from '../store/useStore';
import toast from 'react-hot-toast';

const PLANS = {
  starter: {
    id:'starter', name:'Starter', amount:29900,
    display:'₹299', duration:30, color:'#4A9EFF',
    features:[
      'Full roadmap access',
      'Unlimited daily tasks',
      'Daily + Weekly tests',
      'Study notes library',
      'AI task generation',
      'Score tracking',
    ],
  },
  pro: {
    id:'pro', name:'Pro', amount:49900,
    display:'₹499', duration:30, color:'#00FF94',
    popular:true,
    features:[
      'Everything in Starter',
      'AI Mentor (unlimited)',
      '2AM Anxiety Chat',
      'Monthly tests',
      'Public Skill Identity',
      'GitHub verification',
      'Analytics dashboard',
    ],
  },
  elite: {
    id:'elite', name:'Elite', amount:199900,
    display:'₹1999', duration:30, color:'#FFD700',
    features:[
      'Everything in Pro',
      'Company visibility',
      'Priority support',
      'Interview simulation',
      'Resume AI review',
      'Certificate generation',
      'Placement assistance',
    ],
  },
};

const loadRazorpay = () => new Promise(resolve => {
  if (window.Razorpay) { resolve(true); return; }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const Pricing = () => {
  const { profile, setProfile } = useStore();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(null);

  const trial = profile ? (() => {
    const expires = profile.trial_expires_at
      ? new Date(profile.trial_expires_at) : null;
    const now = new Date();
    const daysLeft = expires
      ? Math.max(0, Math.ceil((expires - now)/(1000*60*60*24)))
      : 0;
    const isPaid = profile.subscription_status === 'active';
    const expired = !isPaid && expires && now > expires;
    return { daysLeft, isPaid, expired };
  })() : null;

  const handlePay = async (planId) => {
    if (!profile) {
      navigate('/register');
      return;
    }

    const plan = PLANS[planId];
    if (!plan) return;

    setPaying(planId);
    const loaded = await loadRazorpay();

    if (!loaded) {
      toast.error('Payment gateway failed to load. Check internet.');
      setPaying(null);
      return;
    }

    const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
    if (!key || key === 'your_razorpay_key_here') {
      toast.error('Razorpay key not configured in .env');
      setPaying(null);
      return;
    }

    const options = {
      key,
      amount: plan.amount,
      currency: 'INR',
      name: 'Genois AI',
      description: `${plan.name} Plan — Monthly`,
      prefill: {
        name: profile?.full_name || '',
        email: profile?.email || '',
        contact: profile?.phone || '',
      },
      notes: { student_id:profile?.id, plan:planId },
      theme: { color:'#00FF94' },
      handler: async (response) => {
        try {
          const expires = new Date(
            Date.now() + plan.duration * 24*60*60*1000
          ).toISOString();

          await supabase.from('payments').insert({
            student_id: profile.id,
            razorpay_payment_id: response.razorpay_payment_id,
            amount: plan.amount,
            plan: planId,
            status: 'success',
            invoice_no: `GEN-${Date.now().toString().slice(-8)}`,
          });

          await supabase.from('profiles').update({
            subscription_status: 'active',
            subscription_plan: planId,
            subscription_expires_at: expires,
            plan: planId,
          }).eq('id', profile.id);

          const { data: fresh } = await supabase
            .from('profiles').select('*')
            .eq('id', profile.id).single();
          if (fresh) setProfile(fresh);

          toast.success(`${plan.name} activated! 🎉`, { duration:4000 });
          navigate('/student/dashboard');
        } catch(e) {
          console.error(e);
          toast.error('Payment saved but profile update failed. Contact support.');
        }
        setPaying(null);
      },
      modal: {
        ondismiss: () => setPaying(null),
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="min-h-screen cyber-grid py-12 px-4"
      style={{ background:'#050508' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <Link to="/" className="text-sm logo-glow font-heading font-bold mb-6 inline-block">
            GENOIS AI
          </Link>
          <h1 className="text-4xl font-bold font-heading text-white mb-3">
            Choose Your Plan
          </h1>
          <p className="text-gray-500 text-sm">
            Invest in your career. Cancel anytime. No hidden fees.
          </p>
        </div>

        {/* Trial banner */}
        {trial && !trial.isPaid && (
          <div className="p-4 rounded-xl mb-8 text-center"
            style={{
              background: trial.expired
                ? 'rgba(255,107,107,0.08)'
                : 'rgba(0,255,148,0.08)',
              border: trial.expired
                ? '1px solid rgba(255,107,107,0.2)'
                : '1px solid rgba(0,255,148,0.2)',
            }}>
            {trial.expired ? (
              <p className="text-danger text-sm font-bold">
                Trial expired — upgrade to continue 🔒
              </p>
            ) : (
              <p className="text-primary text-sm font-bold">
                🎉 {trial.daysLeft} days left in your free trial
              </p>
            )}
          </div>
        )}

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {Object.values(PLANS).map((plan, i) => (
            <motion.div key={plan.id}
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.1 }}
              className="relative p-6 rounded-2xl flex flex-col"
              style={{
                background: plan.popular
                  ? 'rgba(0,255,148,0.05)'
                  : 'rgba(10,10,18,0.9)',
                border:`1px solid ${plan.popular
                  ? 'rgba(0,255,148,0.3)'
                  : `${plan.color}25`}`,
                boxShadow: plan.popular
                  ? '0 0 30px rgba(0,255,148,0.08)'
                  : 'none',
              }}>

              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-dark-900"
                    style={{ background:'#00FF94' }}>
                    ⚡ Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h2 className="text-lg font-bold font-heading text-white mb-1">
                  {plan.name}
                </h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-heading"
                    style={{ color:plan.color }}>
                    {plan.display}
                  </span>
                  <span className="text-gray-600 text-sm">/month</span>
                </div>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-400">
                    <Check size={13} className="flex-shrink-0"
                      style={{ color:plan.color }}/>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePay(plan.id)}
                disabled={
                  paying === plan.id ||
                  (trial?.isPaid && profile?.subscription_plan === plan.id)
                }
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50"
                style={plan.popular ? {
                  background:'#00FF94',
                  color:'#050508',
                  boxShadow:'0 0 15px rgba(0,255,148,0.3)',
                } : {
                  background:`${plan.color}15`,
                  color:plan.color,
                  border:`1px solid ${plan.color}30`,
                }}>
                {paying === plan.id
                  ? 'Processing...'
                  : trial?.isPaid && profile?.subscription_plan === plan.id
                  ? '✅ Current Plan'
                  : `Get ${plan.name} →`}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Free trial CTA — only for guests */}
        {!profile && (
          <div className="p-6 rounded-2xl text-center mb-8"
            style={{ background:'rgba(123,97,255,0.06)', border:'1px solid rgba(123,97,255,0.2)' }}>
            <div className="text-3xl mb-2">🎁</div>
            <h2 className="text-xl font-bold text-white font-heading mb-1">
              Start Free — No Card Required
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              Get 14 days full access to everything. Cancel anytime.
            </p>
            <Link to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-dark-900"
              style={{ background:'linear-gradient(135deg,#00FF94,#7B61FF)', boxShadow:'0 0 15px rgba(0,255,148,0.3)' }}>
              <Zap size={16}/> Start Free Trial
            </Link>
          </div>
        )}

        {/* FAQ */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { q:'Can I cancel anytime?', a:'Yes. Cancel from your profile. No questions asked.' },
            { q:'Is my data safe?', a:'Absolutely. Hosted on Supabase with row-level security.' },
            { q:'What payment methods?', a:'UPI, cards, net banking via Razorpay.' },
          ].map((item, i) => (
            <div key={i} className="p-4 rounded-xl"
              style={{ background:'rgba(10,10,18,0.6)', border:'1px solid rgba(34,34,51,0.5)' }}>
              <p className="text-xs font-bold text-white mb-1">{item.q}</p>
              <p className="text-xs text-gray-500">{item.a}</p>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link to="/"
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Pricing;
