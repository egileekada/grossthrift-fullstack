'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Globe,
  Mail,
  UserCheck,
  Lock,
  Check,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { User } from '@/types/listing';
import {
  useLoginMutation,
  useSignupMutation,
  useOnboardingMutation,
} from '@/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const COUNTRIES = [
  { name: 'United States', flag: '🇺🇸', code: 'US' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'GB' },
  { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  { name: 'Nigeria', flag: '🇳🇬', code: 'NG' },
  { name: 'Germany', flag: '🇩🇪', code: 'DE' },
  { name: 'India', flag: '🇮🇳', code: 'IN' },
  { name: 'South Africa', flag: '🇿🇦', code: 'ZA' },
  { name: 'Kenya', flag: '🇰🇪', code: 'KE' },
  { name: 'Australia', flag: '🇦🇺', code: 'AU' },
];

export default function AuthModal({ isOpen, onClose, onLoginSuccess }: AuthModalProps) {
  const [method, setMethod] = useState<'selection' | 'email' | 'phone' | 'otp' | 'onboarding'>('email');
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');

  // Email login/signup fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone OTP fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [countdown, setCountdown] = useState(59);
  const [error, setError] = useState('');

  // Temp user profile storage before finishing onboarding
  const [tempUser, setTempUser] = useState<User | null>(null);

  // Onboarding parameters
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [selectedCountry, setSelectedCountry] = useState('United States');
  const [selectedFlag, setSelectedFlag] = useState('🇺🇸');
  const [vettingMethod, setVettingMethod] = useState<'linkedin' | 'email' | 'declaration'>('linkedin');
  const [vettingDetail, setVettingDetail] = useState('');
  const [pledgeAccepted, setPledgeAccepted] = useState(false);

  // TanStack Query Mutations backed by Axios httpService
  const loginMutation = useLoginMutation();
  const signupMutation = useSignupMutation();
  const onboardingMutation = useOnboardingMutation();

  const isBusy =
    loginMutation.isPending ||
    signupMutation.isPending ||
    onboardingMutation.isPending;

  // Auto focus for OTP inputs & resend countdown
  useEffect(() => {
    if (method === 'otp') {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [method]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setMethod('email');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      if (emailMode === 'signup') {
        if (!fullName.trim()) {
          setError('Please enter your full name.');
          return;
        }
        const res = await signupMutation.mutateAsync({
          name: fullName.trim(),
          email: email.trim(),
          password,
          country: selectedCountry,
          countryFlag: selectedFlag,
        });
        if (res.user) {
          setTempUser(res.user);
          setMethod('onboarding');
          setOnboardingStep(1);
        }
      } else {
        const res = await loginMutation.mutateAsync({
          provider: 'email',
          email: email.trim(),
          password,
        });
        if (res.user.isVetted) {
          onLoginSuccess(res.user);
          onClose();
        } else {
          setTempUser(res.user);
          setMethod('onboarding');
          setOnboardingStep(1);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    try {
      const res = await loginMutation.mutateAsync({
        provider: 'phone',
        phone,
      });
      if (res.devOtp) {
        setGeneratedOtp(res.devOtp);
      }
      setMethod('otp');
      setCountdown(59);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 6) {
      setError('Please enter all 6 digits of the OTP code');
      return;
    }
    setError('');
    try {
      const res = await loginMutation.mutateAsync({
        provider: 'phone',
        phone,
        otp: enteredOtp,
      });
      setTempUser(res.user);
      setMethod('onboarding');
      setOnboardingStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    }
  };

  const handleCountrySelect = (name: string, flag: string) => {
    setSelectedCountry(name);
    setSelectedFlag(flag);
  };

  const handleProceedToPledge = () => {
    if (vettingMethod !== 'declaration' && !vettingDetail.trim()) {
      setError(
        vettingMethod === 'linkedin'
          ? 'Please enter your professional profile URL'
          : 'Please enter your company or school email domain'
      );
      return;
    }
    setError('');
    setOnboardingStep(2);
  };

  const handleCompleteOnboarding = async () => {
    if (!pledgeAccepted) {
      setError('You must accept the community split guidelines to complete verification.');
      return;
    }

    if (!tempUser) return;
    setError('');

    const finalVerificationDetail =
      vettingMethod === 'declaration' ? 'Self-Attested Declaration' : vettingDetail;

    try {
      await onboardingMutation.mutateAsync({
        display_name: tempUser.name,
        phone: tempUser.phone,
        country: selectedCountry,
        country_flag: selectedFlag,
        verification_method: vettingMethod,
        verification_detail: finalVerificationDetail,
        is_vetted: true,
      });
    } catch (e) {
      console.warn('Onboarding profile sync fallback:', e);
    }

    const finalUser: User = {
      ...tempUser,
      country: selectedCountry,
      countryFlag: selectedFlag,
      verificationMethod: vettingMethod,
      verificationDetail: finalVerificationDetail,
      isVetted: true,
    };

    onLoginSuccess(finalUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-ink/60 backdrop-blur-md"
        id="auth-backdrop"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', duration: 0.4 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-gt-modal border border-border"
        id="auth-modal-container"
      >
        {/* Header branding */}
        <div className="bg-[#141c17] px-6 py-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 rounded-full p-2 hover:bg-white/10 text-dust hover:text-white transition-all cursor-pointer"
            aria-label="Close dialog"
            id="close-auth-btn"
          >
            <X size={15} />
          </button>

          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white uppercase">
              Gross<span className="text-accent font-serif italic font-normal lowercase tracking-wide">thrift</span>
            </span>
          </div>
          <p className="text-xs text-dust font-sans text-left">
            {method === 'onboarding'
              ? 'Complete a quick, stress-free vetting check to protect yourself & other co-buyers.'
              : 'Join a community of trusted co-buyers splitting subscription costs together.'}
          </p>
        </div>

        <div className="p-5 sm:p-8 max-h-[82vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {method === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="text-left">
                  <h3 className="font-display font-semibold text-lg text-ink">
                    Get Started on GrossThrift
                  </h3>
                  <p className="text-xs text-slate mt-1 font-sans">
                    Connect your profile to explore active splits or manage group seats.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans text-left">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={isBusy}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-white border border-border rounded-xl hover:bg-surface font-semibold text-ink transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    id="google-oauth-btn"
                  >
                    {loginMutation.isPending ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-charcoal" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.3 1.55-1.18 2.86-2.5 3.73v3.1h4.05c2.37-2.18 3.73-5.39 3.73-8.82z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.05-3.1c-1.12.75-2.56 1.21-3.91 1.21-3.0 0-5.54-2.03-6.44-4.76H1.27v3.2C3.25 21.82 7.37 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.56 14.44A7.17 7.17 0 0 1 5.2 12c0-.85.15-1.68.42-2.44v-3.2H1.27A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.27 5.39l4.29-3.23z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.37 0 3.25 2.18 1.27 5.39l4.29 3.2C6.46 5.8 9.0 3.75 12 3.75z"
                        />
                      </svg>
                    )}
                    <span className="text-xs font-semibold">Sign in with Google</span>
                  </button>

                  <button
                    onClick={() => {
                      setError('');
                      setMethod('email');
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-surface border border-border rounded-xl font-semibold text-ink cursor-pointer shadow-xs"
                    id="email-auth-select-btn"
                  >
                    <Mail size={14} />
                    <span className="text-xs font-semibold">Continue with Email & Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setError('');
                      setMethod('phone');
                    }}
                    className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 bg-charcoal text-white dark:text-[#141c17] rounded-xl font-semibold cursor-pointer shadow-xs"
                    id="phone-otp-select-btn"
                  >
                    <Phone size={14} />
                    <span className="text-xs font-semibold">Sign in with Phone / WhatsApp</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-surface border border-border p-4 rounded-2xl text-[11px] text-slate font-sans leading-relaxed text-left">
                  <ShieldCheck size={16} className="text-gt-green shrink-0 mt-0.5" />
                  <span>
                    GrossThrift cross-verifies all host and co-buyer contact credentials to ensure safety.
                  </span>
                </div>
              </motion.div>
            )}

            {method === 'email' && (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleEmailAuth}
                className="space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-display font-semibold text-ink text-base">
                      {emailMode === 'login' ? 'Sign In with Email' : 'Create Your Account'}
                    </h3>
                    <p className="text-xs text-slate mt-0.5 font-sans">
                      {emailMode === 'login'
                        ? 'Enter your credentials to access your co-buying account.'
                        : 'Register with your email to join or host subscription splits.'}
                    </p>
                  </div>
                  <div className="flex bg-surface p-1 rounded-lg border border-border text-[11px] font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('login');
                        setError('');
                      }}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        emailMode === 'login'
                          ? 'bg-charcoal text-white dark:text-[#141c17]'
                          : 'text-slate'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signup');
                        setError('');
                      }}
                      className={`px-2.5 py-1 rounded-md cursor-pointer ${
                        emailMode === 'signup'
                          ? 'bg-charcoal text-white dark:text-[#141c17]'
                          : 'text-slate'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans">
                    {error}
                  </div>
                )}

                {emailMode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all text-xs text-ink font-sans shadow-xs"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all text-xs text-ink font-sans shadow-xs"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-3 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all text-xs text-ink font-sans shadow-xs"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setMethod('selection');
                    }}
                    className="flex-1 px-4 py-3 border border-border hover:bg-surface rounded-xl text-xs font-semibold text-slate transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs shadow-xs disabled:opacity-75 cursor-pointer"
                  >
                    {isBusy ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-ink" />
                    ) : (
                      <span>{emailMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {method === 'phone' && (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleSendOtp}
                className="space-y-5 text-left"
              >
                <div>
                  <h3 className="font-display font-semibold text-ink text-base">
                    Enter Phone Coordinate
                  </h3>
                  <p className="text-xs text-slate mt-1 font-sans">
                    We will send a one-time verification token.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="phone-input"
                    className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate font-mono">
                      +1
                    </span>
                    <input
                      type="tel"
                      id="phone-input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="(555) 012-3456"
                      className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all font-mono font-bold text-xs text-ink shadow-xs"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setMethod('selection')}
                    className="flex-1 px-4 py-3 border border-border hover:bg-surface rounded-xl text-xs font-semibold text-slate transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs shadow-xs disabled:opacity-75 cursor-pointer"
                    id="submit-phone-btn"
                  >
                    {isBusy ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-ink" />
                    ) : (
                      <span>Get Code</span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {method === 'otp' && (
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6 text-left"
              >
                <div>
                  <h3 className="font-display font-semibold text-ink text-base">
                    Enter Verification Code
                  </h3>
                  <p className="text-xs text-slate mt-1 font-sans">
                    OTP sent to <span className="font-mono text-ink font-bold">+1 {phone}</span>
                  </p>
                  {generatedOtp && (
                    <p className="text-xs text-gt-green mt-1.5 font-mono font-semibold bg-surface border border-border px-3 py-1.5 rounded-lg inline-block">
                      Verification Code: {generatedOtp}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans">
                    {error}
                  </div>
                )}

                <div className="flex justify-between gap-1.5 sm:gap-2" id="otp-inputs-row">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      type="text"
                      id={`otp-${i}`}
                      value={digit}
                      maxLength={1}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-9 h-12 sm:w-11 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold text-ink bg-surface border border-border rounded-lg sm:rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all shadow-xs"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate px-1 font-sans">
                  <span>No SMS received?</span>
                  {countdown > 0 ? (
                    <span className="font-semibold text-ink font-mono">Resend in {countdown}s</span>
                  ) : (
                    <button
                      onClick={() => {
                        setCountdown(59);
                        setError('');
                      }}
                      className="font-bold text-gt-green hover:underline cursor-pointer"
                    >
                      Resend SMS
                    </button>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod('phone')}
                    className="flex-1 px-4 py-3 border border-border hover:bg-surface rounded-xl text-xs font-semibold text-slate transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs shadow-xs disabled:opacity-75 cursor-pointer"
                    id="verify-otp-btn"
                  >
                    {isBusy ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-ink" />
                    ) : (
                      <>
                        <span>Verify Code</span>
                        <CheckCircle2 size={13} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {method === 'onboarding' && (
              <motion.div
                key="onboarding-flow"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-left"
              >
                {/* Step Progress Bar */}
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-gt-green text-white text-[11px] font-bold flex items-center justify-center">
                      {onboardingStep}
                    </span>
                    <span className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
                      {onboardingStep === 1 ? 'Location & Vetting' : 'The Co-buyer Pledge'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-dust">Step {onboardingStep} of 2</span>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2 font-sans">
                    <ShieldAlert size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {onboardingStep === 1 ? (
                  <div className="space-y-5">
                    {/* 1. Country Selection */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-mono font-bold text-dust uppercase tracking-wider flex items-center gap-1.5">
                          <Globe size={13} className="text-slate" />
                          <span>1. Select Your Region (Prevents Region Locks)</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {COUNTRIES.map((c) => {
                          const isSelected = selectedCountry === c.name;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => handleCountrySelect(c.name, c.flag)}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-ink bg-surface font-semibold shadow-xs'
                                  : 'border-border bg-white hover:bg-surface/60 text-slate'
                              }`}
                            >
                              <span className="text-base leading-none">{c.flag}</span>
                              <span className="text-[11px] text-ink truncate leading-tight">
                                {c.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Simple Vetting Selection */}
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono font-bold text-dust uppercase tracking-wider block">
                          2. LIGHTWEIGHT ACCOUNT VETTING
                        </span>
                      </div>
                      <p className="text-xs text-slate font-sans leading-relaxed">
                        To keep GrossThrift spam-free and safe, choose one verification method to confirm you are a real user.
                      </p>

                      <div className="space-y-2.5">
                        {/* Vetting Option 1: Professional LinkedIn */}
                        <div
                          onClick={() => setVettingMethod('linkedin')}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            vettingMethod === 'linkedin'
                              ? 'border-ink bg-surface shadow-xs'
                              : 'border-border bg-white hover:bg-surface/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                vettingMethod === 'linkedin'
                                  ? 'bg-sky-50 text-sky-600'
                                  : 'bg-surface text-slate'
                              }`}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                                <rect width="4" height="12" x="2" y="9" />
                                <circle cx="4" cy="4" r="2" />
                              </svg>
                            </div>
                            <div className="text-left space-y-0.5">
                              <h5 className="text-xs font-bold text-ink">
                                LinkedIn / Professional Profile
                              </h5>
                              <p className="text-[11px] text-slate font-sans">
                                Share your profile link to instantly self-validate with hosts.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Vetting Option 2: Work/School Email Domain */}
                        <div
                          onClick={() => setVettingMethod('email')}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            vettingMethod === 'email'
                              ? 'border-ink bg-surface shadow-xs'
                              : 'border-border bg-white hover:bg-surface/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                vettingMethod === 'email'
                                  ? 'bg-red-50 text-red-600'
                                  : 'bg-surface text-slate'
                              }`}
                            >
                              <Mail size={16} />
                            </div>
                            <div className="text-left space-y-0.5">
                              <h5 className="text-xs font-bold text-ink">
                                Work or School Email Domain
                              </h5>
                              <p className="text-[11px] text-slate font-sans">
                                E.g., name@university.edu or name@company.com to verify.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Vetting Option 3: Self-Attested Legal Name */}
                        <div
                          onClick={() => setVettingMethod('declaration')}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            vettingMethod === 'declaration'
                              ? 'border-ink bg-surface shadow-xs'
                              : 'border-border bg-white hover:bg-surface/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                vettingMethod === 'declaration'
                                  ? 'bg-amber-50 text-amber-600'
                                  : 'bg-surface text-slate'
                              }`}
                            >
                              <UserCheck size={16} />
                            </div>
                            <div className="text-left space-y-0.5">
                              <h5 className="text-xs font-bold text-ink">
                                Simple Self-Declaration Pledge
                              </h5>
                              <p className="text-[11px] text-slate font-sans">
                                Confirm your legal identity and agree to strict platform guidelines.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Method Inputs */}
                      <div className="mt-3.5 pt-1">
                        {vettingMethod === 'linkedin' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                              LinkedIn Profile URL
                            </label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate font-sans">
                                linkedin.com/in/
                              </span>
                              <input
                                type="text"
                                placeholder="username"
                                value={vettingDetail.replace(
                                  /^https?:\/\/(www\.)?linkedin\.com\/in\//,
                                  ''
                                )}
                                onChange={(e) =>
                                  setVettingDetail('https://linkedin.com/in/' + e.target.value)
                                }
                                className="w-full pl-32 pr-4 py-2.5 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all text-xs text-ink font-sans shadow-xs"
                              />
                            </div>
                          </div>
                        )}

                        {vettingMethod === 'email' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                              Company or School Email
                            </label>
                            <input
                              type="email"
                              placeholder="you@company.com"
                              value={vettingDetail}
                              onChange={(e) => setVettingDetail(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl focus:bg-white focus:ring-1 focus:ring-gt-green/20 focus:border-gt-green outline-none transition-all text-xs text-ink font-sans shadow-xs"
                            />
                          </div>
                        )}

                        {vettingMethod === 'declaration' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-dust uppercase tracking-wider block">
                              Legal Full Name
                            </label>
                            <input
                              type="text"
                              placeholder="Full Name"
                              value={tempUser?.name || ''}
                              disabled
                              className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-xs font-sans select-none text-slate"
                            />
                            <p className="text-[10px] text-slate mt-1 font-sans">
                              Verified via your connected login account.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={handleProceedToPledge}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-charcoal text-white dark:text-[#141c17] font-semibold rounded-xl text-xs shadow-md cursor-pointer"
                      >
                        <span>Proceed to Guidelines & Pledge</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* The Pledge */}
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-mono font-bold text-dust uppercase tracking-wider block">
                          THE CO-BUYER PLEDGE
                        </span>
                      </div>

                      <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-xs text-ink font-sans space-y-3">
                        <p className="font-semibold text-emerald-800 dark:text-emerald-300 text-[13px]">
                          To maintain trust, I pledge to follow the split rules:
                        </p>

                        <div className="space-y-2.5 text-left text-slate text-[11px] leading-relaxed">
                          <div className="flex items-start gap-2.5">
                            <div className="p-0.5 bg-emerald-100 rounded-full text-emerald-700 shrink-0 mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>
                              I will make subscription payments promptly within 24 hours of requests.
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="p-0.5 bg-emerald-100 rounded-full text-emerald-700 shrink-0 mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>
                              I will not change group login details or passwords without telling the host.
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="p-0.5 bg-emerald-100 rounded-full text-emerald-700 shrink-0 mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>
                              I will not share account credentials with external third parties.
                            </span>
                          </div>

                          <div className="flex items-start gap-2.5">
                            <div className="p-0.5 bg-emerald-100 rounded-full text-emerald-700 shrink-0 mt-0.5">
                              <Check size={10} strokeWidth={3} />
                            </div>
                            <span>
                              I understand that violating co-buyer agreements leads to immediate platform eviction.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Accept checkbox */}
                      <label className="flex items-start gap-3 p-3 bg-surface border border-border rounded-xl cursor-pointer hover:bg-surface/80 transition-all text-left">
                        <input
                          type="checkbox"
                          checked={pledgeAccepted}
                          onChange={(e) => setPledgeAccepted(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-emerald-600 border-border rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs text-ink font-medium leading-tight font-sans select-none">
                          I accept these guidelines and authorize hosts to view my self-declared location & verification status.
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setOnboardingStep(1)}
                        className="flex-1 px-4 py-3 border border-border hover:bg-surface rounded-xl text-xs font-semibold text-slate transition-all cursor-pointer"
                      >
                        Back
                      </button>

                      <button
                        onClick={handleCompleteOnboarding}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-[#115c3e] hover:bg-[#15724c] text-white font-semibold rounded-xl text-xs shadow-xs transition-all disabled:opacity-75 cursor-pointer"
                        style={{ color: '#ffffff' }}
                      >
                        {isBusy ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-border border-t-white" />
                        ) : (
                          <>
                            <span>Complete Onboarding</span>
                            <CheckCircle2 size={13} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
