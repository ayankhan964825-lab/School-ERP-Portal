import React, { useState, useEffect } from 'react';
import { Phone, Mail, ShieldCheck, ArrowRight, Loader2, Edit2 } from 'lucide-react';

interface OTPCheckoutAuthProps {
  authMode?: 'phone_only' | 'email_only' | 'both';
  otpLength?: number;
}

export default function OTPCheckoutAuth({ authMode = 'phone_only', otpLength = 4 }: OTPCheckoutAuthProps) {
  const [step, setStep] = useState(1);
  const [via, setVia] = useState<'phone' | 'email'>(authMode === 'email_only' ? 'email' : 'phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // WebOTP API listener
  useEffect(() => {
    if (step === 2 && via === 'phone' && 'OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials.get({
        otp: { transport: ['sms'] },
        signal: ac.signal
      }).then((otp: any) => {
        if (otp && otp.code) {
          setOtp(otp.code);
          // We don't auto submit because the user might want to visually confirm, but filling is enough.
        }
      }).catch(err => {
        console.log("WebOTP API error / timeout", err);
      });
      return () => {
        ac.abort();
      };
    }
  }, [step, via]);
  
  useEffect(() => {
    if (authMode === 'email_only') setVia('email');
    if (authMode === 'phone_only') setVia('phone');
  }, [authMode]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (via === 'phone' && phone.length !== 10) {
      setError('Please enter a valid 10-digit number');
      return;
    }
    if (via === 'email' && !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const payload = via === 'phone' ? { phone } : { email };
      const res = await fetch('/api/account/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setStep(2);
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== otpLength) {
      setError(`OTP must be ${otpLength} digits`);
      return;
    }
    
    setLoading(true);
    try {
      const payload = via === 'phone' 
        ? { phone, otp, via: 'phone' } 
        : { email, otp, via: 'email' };

      const res = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        window.location.reload();
      } else {
        setError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const isInputValid = via === 'phone' ? phone.length === 10 : email.includes('@');

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</div>
        <div>
          <h2 className="font-bold text-secondary">Sign In or Register</h2>
          <p className="text-xs text-secondary/50">Secure login for faster checkout</p>
        </div>
      </div>
      
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            {authMode === 'both' && (
              <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => { setVia('phone'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    via === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-secondary/60 hover:text-secondary'
                  }`}
                >
                  <Phone className="w-4 h-4" /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setVia('email'); setError(''); }}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                    via === 'email' ? 'bg-white text-primary shadow-sm' : 'text-secondary/60 hover:text-secondary'
                  }`}
                >
                  <Mail className="w-4 h-4" /> Email
                </button>
              </div>
            )}

            {via === 'phone' ? (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Mobile Number</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50 font-medium">+91</span>
                  <input 
                    type="tel" 
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium text-lg tracking-wider"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-secondary mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary/50 w-5 h-5" />
                  <input 
                    type="email" 
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="your@email.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium text-lg"
                    required
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !isInputValid}
              className="w-full btn-primary !py-3.5 !rounded-xl flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue to Checkout'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
            <p className="text-xs text-center text-secondary/50 mt-4 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> We will send a secure OTP to verify
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                {via === 'phone' ? <Phone className="w-4 h-4 text-secondary/50" /> : <Mail className="w-4 h-4 text-secondary/50" />}
                <span className="font-medium text-secondary tracking-wider">
                  {via === 'phone' ? `+91 ${phone}` : email}
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => { setStep(1); setOtp(''); setError(''); }}
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-secondary mb-1 text-center">Enter {otpLength}-digit OTP</label>
              <input 
                type="text" 
                autoComplete="one-time-code"
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, otpLength))}
                placeholder={Array(otpLength).fill('•').join(' ')}
                className="w-full text-center py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-bold text-2xl tracking-[0.5em]"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || otp.length !== otpLength}
              className="w-full btn-primary !py-3.5 !rounded-xl flex justify-center items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Proceed'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
