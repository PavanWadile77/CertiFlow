import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Wallet as WalletIcon, 
  Building2, 
  ChevronRight, 
  FileCheck,
  Globe,
  Loader2,
  LogOut
} from 'lucide-react';

// Modular Components
import Onboarding from './Onboarding';
import Wallet from './Wallet';
import OrganiserDashboard from './OrganiserDashboard';
import Verify from './Verify';
import LoginModal from './LoginModal';

export default function System() {
  const { user, profile, loading, signInWithGoogle, logout } = useAuth();
  const [showVerify, setShowVerify] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('verify')) {
      setShowVerify(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  // Handle Public Verification View
  if (showVerify) {
    return (
      <div className="min-h-screen bg-[#F5F7FA]">
        <nav className="fixed top-0 inset-x-0 bg-white/80 backdrop-blur-md border-b border-border-muted z-50 p-4 flex justify-between items-center px-8">
           <div className="flex items-center gap-2">
              <ShieldCheck className="text-primary font-bold" />
              <span className="font-bold text-[#1A1F26] tracking-tighter">CertiFlow Registry</span>
           </div>
           <button 
            onClick={() => setShowVerify(false)}
            className="text-xs font-bold text-primary uppercase tracking-widest hover:underline"
           >
             Return Home
           </button>
        </nav>
        <div className="pt-20">
          <Verify />
        </div>
      </div>
    );
  }

  // Handle Authenticated Session
  if (user) {
    // 1. If profile is not loaded or role is null, show onboarding
    if (!profile || profile.role === null) {
      return <Onboarding />;
    }

    // 2. Render based on role
    if (profile.role === 'organiser') {
      return <OrganiserDashboard />;
    }

    if (profile.role === 'user') {
      return (
        <div className="min-h-screen bg-[#F5F7FA]">
           <nav className="bg-white border-b border-border-muted px-8 py-4 flex items-center justify-between sticky top-0 z-40">
              <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <ShieldCheck className="text-white" size={18} />
                  </div>
                  <span className="font-bold text-lg tracking-tighter text-[#1A1F26]">CertiFlow</span>
              </div>
              <div className="flex items-center gap-6">
                 <div className="hidden md:flex items-center gap-2 text-xs font-medium text-neutral-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full" /> System Active
                 </div>
                 <button 
                  onClick={logout}
                  className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                 >
                   <LogOut size={16} /> Sign Out
                 </button>
              </div>
           </nav>
           <Wallet />
        </div>
      );
    }
  }

  // Landing Page (Unauthenticated)
  return (
    <div className="min-h-screen bg-[#F5F7FA] selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-border-muted px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter text-[#1A1F26] hidden sm:block">CertiFlow</span>
        </div>

        <nav className="hidden md:flex items-center gap-12 text-sm font-semibold text-neutral-500">
          <a href="#" className="hover:text-primary transition-colors">Features</a>
          <a href="#" className="hover:text-primary transition-colors">Institutions</a>
          <button onClick={() => setShowVerify(true)} className="hover:text-primary transition-colors">Verify Record</button>
        </nav>

        <div className="flex items-center gap-4">
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold tracking-widest uppercase mb-8">
              <Globe size={14} /> Global Digital Registry
            </div>
            <h1 className="text-6xl md:text-7xl font-bold text-[#1A1F26] leading-tight tracking-tighter mb-8 text-balance">
              Your Records, <br />
              <span className="text-primary italic">Secured & Accessible.</span>
            </h1>
            <p className="text-xl text-neutral-500 mb-10 max-w-lg leading-relaxed">
              The national infrastructure for digital credentials. Issue, store, and verify certificates with cryptographic certainty.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <button 
                onClick={() => setIsLoginModalOpen(true)}
                className="digi-btn-primary flex items-center justify-center gap-3 py-5 px-8 text-lg"
              >
                Log in as User <ChevronRight size={20} />
              </button>
              <button 
                 onClick={() => setIsLoginModalOpen(true)}
                 className="digi-btn-outline flex items-center justify-center gap-3 py-5 px-8 text-lg"
              >
                Organiser Portal <Building2 size={20} />
              </button>
            </div>

            <div className="flex items-center gap-8 border-t border-border-muted pt-10">
              <div>
                <p className="text-2xl font-bold text-[#1A1F26]">2.5M+</p>
                <p className="text-xs text-neutral-400 font-bold uppercase">Issued</p>
              </div>
              <div className="w-px h-8 bg-neutral-200" />
              <div>
                <p className="text-2xl font-bold text-[#1A1F26]">500+</p>
                <p className="text-xs text-neutral-400 font-bold uppercase">Partners</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 bg-white p-4 rounded-[3rem] shadow-2xl border border-border-muted">
               <div className="bg-[#F5F7FA] rounded-[2.5rem] p-8 aspect-[4/5] flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-primary text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-primary/30">
                    <ShieldCheck size={48} />
                  </div>
                  <h3 className="text-2xl font-bold mb-3 tracking-tight">DigiWallet Proof</h3>
                  <p className="text-neutral-500 text-sm mb-10 max-w-[240px]">Tamper-proof certificates stored directly on the blockchain-secured registry.</p>
                  <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="h-full bg-primary"
                    />
                  </div>
               </div>
            </div>
            
            {/* Decorative Orbs */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-400/5 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight text-[#1A1F26] mb-4">Trust Infrastructure</h2>
            <p className="text-neutral-500">Built for mass verification and secure credential lifecycle.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: WalletIcon, title: 'Citizen Wallet', desc: 'A personal secure vault for all your government and educational records.' },
              { icon: FileCheck, title: 'Instant Verification', desc: 'Scan and validate credentials in real-time with zero-knowledge protocols.' },
              { icon: Building2, title: 'Institutional Trust', desc: 'Apply institutional seals to digital documents with legal weight.' }
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-[2.5rem] bg-[#F5F7FA] hover:bg-primary-light transition-all group">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-neutral-500 leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-20 border-t border-border-muted px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 text-primary">
            <ShieldCheck size={20} />
            <span className="font-bold tracking-tighter text-[#1A1F26]">CertiFlow v2.0</span>
          </div>
          <p className="text-neutral-400 text-xs font-medium uppercase tracking-[0.3em]">Institutional Grade Digital Records</p>
      </footer>

      <AnimatePresence>
        {isLoginModalOpen && (
           <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
