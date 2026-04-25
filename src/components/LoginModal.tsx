import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Mail, 
  Lock, 
  Phone, 
  User as UserIcon, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  Hash
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { signInWithGoogle, signInWithPhone, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'phone' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await resetPassword(email);
      setSuccess('Password reset link sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!otpSent) {
        // Send OTP
        const res = await signInWithPhone(phoneNumber, 'recaptcha-container');
        setConfirmationResult(res);
        setOtpSent(true);
      } else {
        // Verify OTP
        await confirmationResult.confirm(otp);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Phone authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-[2.5rem] relative overflow-hidden shadow-2xl flex flex-col pt-12 pb-10 px-10"
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-primary transition-all rounded-xl border border-transparent hover:border-neutral-100"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-primary/10 rounded-[1.5rem] flex items-center justify-center text-primary mx-auto mb-6">
              {mode === 'phone' ? <Phone size={32} /> : mode === 'register' ? <UserIcon size={32} /> : mode === 'reset' ? <AlertCircle size={32} />  : <Mail size={32} />}
           </div>
           <h2 className="text-3xl font-bold text-[#1A1F26] tracking-tight">
              {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Join eCert' : mode === 'reset' ? 'Reset Password' : 'Mobile Access'}
           </h2>
           <p className="text-neutral-500 text-sm mt-2">
              {mode === 'reset' ? 'Enter your email to receive a reset link.' : 'Secure digital identity for the national registry.'}
           </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 text-xs">
            <AlertCircle className="shrink-0" size={16} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex gap-3 text-green-600 text-xs">
            <AlertCircle className="shrink-0" size={16} />
            <p className="font-medium">{success}</p>
          </div>
        )}

        <div className="space-y-6">
          {mode === 'phone' ? (
            <form onSubmit={handlePhoneAuth} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Mobile Number</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                    <Phone size={18} />
                  </div>
                  <input 
                    disabled={otpSent || loading}
                    required
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 234 567 890"
                    className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {otpSent && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Verification Code</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                      <Hash size={18} />
                    </div>
                    <input 
                      disabled={loading}
                      required
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-Digit OTP"
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm text-center tracking-[0.5em] font-bold"
                    />
                  </div>
                </div>
              )}

              <div id="recaptcha-container"></div>

              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : otpSent ? 'Verify Identity' : 'Send One-Time Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={mode === 'reset' ? handleResetPassword : handleEmailAuth} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Full Name</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                      <UserIcon size={18} />
                    </div>
                    <input 
                      disabled={loading}
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Email Address</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                    <Mail size={18} />
                  </div>
                  <input 
                    disabled={loading}
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1">
                  <div className="flex justify-between items-end pr-4">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Secure Password</label>
                    {mode === 'login' && (
                      <button 
                        type="button" 
                        onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                      <Lock size={18} />
                    </div>
                    <input 
                      disabled={loading}
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              )}

              <button 
                disabled={loading}
                type="submit"
                className="w-full bg-primary text-white font-bold py-4 rounded-2xl hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : mode === 'reset' ? 'Send Reset Link' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}

          {mode !== 'reset' && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-100"></div></div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                   <span className="bg-white px-4 italic">or authenticate with</span>
                </div>
              </div>

              <div className="flex gap-4">
                {mode !== 'phone' ? (
                  <button 
                    onClick={() => setMode('phone')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all border border-neutral-100"
                  >
                    <Phone size={14} /> Phone
                  </button>
                ) : (
                  <button 
                    onClick={() => { setMode('login'); setOtpSent(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all border border-neutral-100"
                  >
                    <Mail size={14} /> Email
                  </button>
                )}
                <button 
                  onClick={handleGoogleAuth}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-all border border-neutral-100"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-50 contrast-125" alt="Google" /> Google
                </button>
              </div>
            </>
          )}
          
          <div className="mt-8 text-center">
             <button 
              onClick={() => {
                if (mode === 'register') setMode('login');
                else if (mode === 'reset') setMode('login');
                else setMode('register');
                setError(null);
                setSuccess(null);
              }}
              className="text-xs font-bold text-neutral-400 hover:text-primary transition-all"
             >
                {mode === 'register' || mode === 'reset' 
                  ? "Back to Sign In" 
                  : "Don't have an account? Join eCert"}
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
