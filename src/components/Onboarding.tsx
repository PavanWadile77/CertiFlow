import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';
import { User, Building2, ChevronRight, ShieldCheck } from 'lucide-react';

export default function Onboarding() {
  const { setRole } = useAuth();
  const [role, setSelectedRole] = useState<'organiser' | 'user' | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!role) return;
    if (role === 'organiser' && !orgName) return;
    
    setLoading(true);
    await setRole(role, orgName);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl p-10 shadow-xl border border-border-muted"
      >
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-2xl font-bold tracking-tighter text-[#1A1F26]">CertiFlow</span>
        </div>

        <h1 className="text-3xl font-bold text-center mb-2">Welcome to CertiFlow</h1>
        <p className="text-center text-neutral-500 mb-10">Choose how you want to use the platform today.</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setSelectedRole('user')}
            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
              role === 'user' ? 'border-primary bg-primary-light' : 'border-neutral-100 hover:border-primary/30'
            }`}
          >
            <div className={`p-4 rounded-full ${role === 'user' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              <User size={32} />
            </div>
            <div className="text-center">
              <span className="font-bold block tracking-tight">Citizen User</span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Access Wallet</span>
            </div>
          </button>

          <button
            onClick={() => setSelectedRole('organiser')}
            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
              role === 'organiser' ? 'border-primary bg-primary-light' : 'border-neutral-100 hover:border-primary/30'
            }`}
          >
            <div className={`p-4 rounded-full ${role === 'organiser' ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-500'}`}>
              <Building2 size={32} />
            </div>
            <div className="text-center">
              <span className="font-bold block tracking-tight">Organiser</span>
              <span className="text-[10px] text-neutral-500 uppercase tracking-widest">Issue Records</span>
            </div>
          </button>
        </div>

        {role === 'organiser' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 overflow-hidden"
          >
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:outline-none focus:border-primary text-sm"
              placeholder="e.g. Stanford University"
            />
          </motion.div>
        )}

        <button
          disabled={!role || (role === 'organiser' && !orgName) || loading}
          onClick={handleComplete}
          className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? "Processing..." : (
            <>
              Initialize Profile <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
