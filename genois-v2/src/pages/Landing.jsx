import React from 'react';
const Landing = () => (
  <div className="min-h-screen cyber-grid flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-5xl font-bold logo-glow font-heading mb-4">GENOIS AI</h1>
      <p className="text-gray-400 mb-6">Career OS for Engineering Students</p>
      <div className="flex gap-3 justify-center">
        <a href="/register" className="btn-neon px-6 py-3 rounded-xl font-bold text-sm">
          Start Free Trial →
        </a>
        <a href="/login" className="px-6 py-3 rounded-xl font-bold text-sm text-gray-400"
          style={{ border:'1px solid rgba(34,34,51,0.8)' }}>
          Login
        </a>
      </div>
    </div>
  </div>
);
export default Landing;
