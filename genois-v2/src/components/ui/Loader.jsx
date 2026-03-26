import React from 'react';

const Loader = () => (
  <div className="min-h-screen cyber-grid flex items-center justify-center"
    style={{ background: '#050508' }}>
    <div className="text-center">
      <div className="text-4xl font-bold logo-glow mb-4 font-heading">
        GENOIS AI
      </div>
      <div className="w-8 h-8 border-2 border-dark-600 border-t-primary rounded-full animate-spin mx-auto" />
      <p className="text-gray-600 text-xs mt-3">Loading your career OS...</p>
    </div>
  </div>
);

export default Loader;
