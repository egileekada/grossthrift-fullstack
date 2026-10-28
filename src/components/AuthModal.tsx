'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Formik, Form } from 'formik';
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
  FormikField,
  CustomField,
  CustomText,
  AppButton,
  OTPInput,
  CustomCheckboxGroup,
} from '@/components/ui';
import {
  loginSchema,
  modalSignupSchema,
  phoneLoginSchema,
  otpVerifySchema,
  onboardingVettingSchema,
  onboardingPledgeSchema,
  LoginFormValues,
  ModalSignupFormValues,
  PhoneLoginFormValues,
  OtpVerifyFormValues,
  OnboardingVettingFormValues,
  OnboardingPledgeFormValues,
} from '@/lib/validations/auth';
import {
  useLoginMutation,
  useSignupMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
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

  // Phone & OTP state
  const [phone, setPhone] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [countdown, setCountdown] = useState(59);
  const [error, setError] = useState('');

  // Temp user profile storage before finishing onboarding
  const [tempUser, setTempUser] = useState<User | null>(null);

  // Onboarding parameters persisted between step 1 & step 2
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingVettingFormValues>({
    country: 'United States',
    countryFlag: '🇺🇸',
    vettingMethod: 'linkedin',
    vettingDetail: '',
  });

  // TanStack Query Mutations backed by Axios httpService
  const loginMutation = useLoginMutation();
  const signupMutation = useSignupMutation();
  const sendPhoneOtpMutation = useSendPhoneOtpMutation();
  const verifyPhoneOtpMutation = useVerifyPhoneOtpMutation();
  const onboardingMutation = useOnboardingMutation();

  const isBusy =
    loginMutation.isPending ||
    signupMutation.isPending ||
    sendPhoneOtpMutation.isPending ||
    verifyPhoneOtpMutation.isPending ||
    onboardingMutation.isPending;

  // Resend countdown timer for OTP screen
  useEffect(() => {
    if (method === 'otp') {
      const timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [method]);

  if (!isOpen) return null;

  const handleGoogleLogin = () => {
    setError('');
    setMethod('email');
  };

  const handleEmailLogin = async (values: LoginFormValues) => {
    setError('');
    try {
      const res = await loginMutation.mutateAsync({
        provider: 'email',
        email: values.email.trim(),
        password: values.password,
      });
      if (res.user.isVetted) {
        onLoginSuccess(res.user);
        onClose();
      } else {
        setTempUser(res.user);
        setMethod('onboarding');
        setOnboardingStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    }
  };

  const handleEmailSignup = async (values: ModalSignupFormValues) => {
    setError('');
    try {
      const res = await signupMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        country: onboardingDraft.country,
        countryFlag: onboardingDraft.countryFlag,
      });
      if (res.user) {
        setTempUser(res.user);
        setMethod('onboarding');
        setOnboardingStep(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
    }
  };

  const handleSendOtp = async (values: PhoneLoginFormValues) => {
    const cleanPhone = values.phone.replace(/\D/g, '');
    setError('');
    try {
      const res = await sendPhoneOtpMutation.mutateAsync({
        phone: cleanPhone,
      });
      setPhone(cleanPhone);
      if (res.devOtp) {
        setGeneratedOtp(res.devOtp);
      }
      setMethod('otp');
      setCountdown(59);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (!phone) return;
    setError('');
    try {
      const res = await sendPhoneOtpMutation.mutateAsync({ phone });
      if (res.devOtp) {
        setGeneratedOtp(res.devOtp);
      }
      setCountdown(59);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code.');
    }
  };

  const handleVerifyOtp = async (values: OtpVerifyFormValues) => {
    setError('');
    try {
      const res = await verifyPhoneOtpMutation.mutateAsync({
        phone,
        otp: values.otp.trim(),
      });
      setTempUser(res.user);
      setMethod('onboarding');
      setOnboardingStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid verification code.');
    }
  };

  const handleProceedToPledge = (values: OnboardingVettingFormValues) => {
    setError('');
    const normalizedDetail =
      values.vettingMethod === 'linkedin' && values.vettingDetail
        ? values.vettingDetail.startsWith('http')
          ? values.vettingDetail.trim()
          : `https://linkedin.com/in/${values.vettingDetail.trim()}`
        : values.vettingDetail?.trim() || '';

    setOnboardingDraft({
      ...values,
      vettingDetail: normalizedDetail,
    });
    setOnboardingStep(2);
  };

  const handleCompleteOnboarding = async (values: OnboardingPledgeFormValues) => {
    if (!values.pledgeAccepted?.length) {
      setError('You must accept the community split guidelines to complete verification.');
      return;
    }
    if (!tempUser) return;
    setError('');

    const finalVerificationDetail =
      onboardingDraft.vettingMethod === 'declaration'
        ? 'Self-Attested Declaration'
        : onboardingDraft.vettingDetail || '';

    try {
      await onboardingMutation.mutateAsync({
        display_name: tempUser.name,
        phone: tempUser.phone,
        country: onboardingDraft.country,
        country_flag: onboardingDraft.countryFlag,
        verification_method: onboardingDraft.vettingMethod,
        verification_detail: finalVerificationDetail,
        is_vetted: true,
      });
    } catch (e) {
      console.warn('Onboarding profile sync fallback:', e);
    }

    const finalUser: User = {
      ...tempUser,
      country: onboardingDraft.country,
      countryFlag: onboardingDraft.countryFlag,
      verificationMethod: onboardingDraft.vettingMethod as 'linkedin' | 'email' | 'declaration',
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
          <CustomText type="body-sm" className="text-dust font-sans text-left">
            {method === 'onboarding'
              ? 'Complete a quick, stress-free vetting check to protect yourself & other co-buyers.'
              : 'Join a community of trusted co-buyers splitting subscription costs together.'}
          </CustomText>
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
                  <CustomText type="title-md" as="h3" className="font-display font-semibold text-lg text-ink">
                    Get Started on GrossThrift
                  </CustomText>
                  <CustomText type="body-sm" className="text-slate mt-1 font-sans">
                    Connect your profile to explore active splits or manage group seats.
                  </CustomText>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans text-left">
                    {error}
                  </div>
                )}

                <div className="space-y-3">
                  <AppButton
                    onPress={handleGoogleLogin}
                    disabled={isBusy}
                    loading={loginMutation.isPending}
                    variant="primary-outline"
                    fullWidth
                    id="google-oauth-btn"
                    startContent={
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
                    }
                  >
                    Sign in with Google
                  </AppButton>

                  <AppButton
                    onPress={() => {
                      setError('');
                      setMethod('email');
                    }}
                    variant="secondary-btn"
                    fullWidth
                    id="email-auth-select-btn"
                    startContent={<Mail size={14} />}
                  >
                    Continue with Email & Password
                  </AppButton>

                  <AppButton
                    onPress={() => {
                      setError('');
                      setMethod('phone');
                    }}
                    variant="primary"
                    fullWidth
                    id="phone-otp-select-btn"
                    startContent={<Phone size={14} />}
                  >
                    Sign in with Phone / WhatsApp
                  </AppButton>
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
              <motion.div
                key="email-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4 text-left"
              >
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <CustomText type="title-md" as="h3" className="font-display font-semibold text-ink">
                      {emailMode === 'login' ? 'Sign In with Email' : 'Create Your Account'}
                    </CustomText>
                    <CustomText type="body-sm" className="text-slate mt-0.5 font-sans">
                      {emailMode === 'login'
                        ? 'Enter your credentials to access your co-buying account.'
                        : 'Register with your email to join or host subscription splits.'}
                    </CustomText>
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

                {emailMode === 'login' ? (
                  <Formik
                    key="email-login-formik"
                    initialValues={{ email: '', password: '' }}
                    validationSchema={loginSchema}
                    onSubmit={handleEmailLogin}
                  >
                    {() => (
                      <Form className="space-y-4">
                        <FormikField
                          name="email"
                          label="Email Address"
                          type="email"
                          placeholder="you@domain.com"
                        />

                        <FormikField
                          name="password"
                          label="Password"
                          placeholder="Min. 8 characters"
                          isPassword
                          labelRight={
                            <Link
                              href="/auth/forgot-password"
                              onClick={onClose}
                              className="text-[11px] font-semibold text-sage hover:underline"
                            >
                              Forgot password?
                            </Link>
                          }
                        />

                        <div className="flex gap-3 pt-2">
                          <AppButton
                            type="button"
                            variant="secondary-outline"
                            fullWidth
                            onPress={() => {
                              setError('');
                              setMethod('selection');
                            }}
                          >
                            Back
                          </AppButton>
                          <AppButton
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loginMutation.isPending}
                          >
                            Sign In
                          </AppButton>
                        </div>
                      </Form>
                    )}
                  </Formik>
                ) : (
                  <Formik
                    key="email-signup-formik"
                    initialValues={{ name: '', email: '', password: '' }}
                    validationSchema={modalSignupSchema}
                    onSubmit={handleEmailSignup}
                  >
                    {() => (
                      <Form className="space-y-4">
                        <FormikField
                          name="name"
                          label="Full Name"
                          type="text"
                          placeholder="Enter your full name"
                        />

                        <FormikField
                          name="email"
                          label="Email Address"
                          type="email"
                          placeholder="you@domain.com"
                        />

                        <FormikField
                          name="password"
                          label="Password"
                          placeholder="Min. 8 characters"
                          isPassword
                        />

                        <div className="flex gap-3 pt-2">
                          <AppButton
                            type="button"
                            variant="secondary-outline"
                            fullWidth
                            onPress={() => {
                              setError('');
                              setMethod('selection');
                            }}
                          >
                            Back
                          </AppButton>
                          <AppButton
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={signupMutation.isPending}
                          >
                            Create Account
                          </AppButton>
                        </div>
                      </Form>
                    )}
                  </Formik>
                )}
              </motion.div>
            )}

            {method === 'phone' && (
              <motion.div
                key="phone-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5 text-left"
              >
                <div>
                  <CustomText type="title-md" as="h3" className="font-display font-semibold text-ink">
                    Enter Phone Coordinate
                  </CustomText>
                  <CustomText type="body-sm" className="text-slate mt-1 font-sans">
                    We will send a one-time verification token.
                  </CustomText>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold font-sans">
                    {error}
                  </div>
                )}

                <Formik
                  initialValues={{ phone }}
                  validationSchema={phoneLoginSchema}
                  onSubmit={handleSendOtp}
                >
                  {() => (
                    <Form className="space-y-5">
                      <FormikField
                        name="phone"
                        label="Phone Number"
                        type="tel"
                        placeholder="5550123456"
                        prefix={
                          <span className="text-xs font-bold text-slate font-mono pr-1">
                            +1
                          </span>
                        }
                      />

                      <div className="flex gap-3 pt-2">
                        <AppButton
                          type="button"
                          variant="secondary-outline"
                          fullWidth
                          onPress={() => setMethod('selection')}
                        >
                          Back
                        </AppButton>
                        <AppButton
                          type="submit"
                          variant="primary"
                          fullWidth
                          loading={sendPhoneOtpMutation.isPending}
                          id="submit-phone-btn"
                        >
                          Get Code
                        </AppButton>
                      </div>
                    </Form>
                  )}
                </Formik>
              </motion.div>
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
                  <CustomText type="title-md" as="h3" className="font-display font-semibold text-ink">
                    Enter Verification Code
                  </CustomText>
                  <CustomText type="body-sm" className="text-slate mt-1 font-sans">
                    OTP sent to <span className="font-mono text-ink font-bold">+1 {phone}</span>
                  </CustomText>
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

                <Formik
                  initialValues={{ otp: '' }}
                  validationSchema={otpVerifySchema}
                  onSubmit={handleVerifyOtp}
                >
                  {() => (
                    <Form className="space-y-6">
                      <div className="flex justify-center" id="otp-inputs-row">
                        <OTPInput
                          name="otp"
                          length={6}
                          error={Boolean(error)}
                          isLoading={verifyPhoneOtpMutation.isPending}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate px-1 font-sans">
                        <span>No SMS received?</span>
                        {countdown > 0 ? (
                          <span className="font-semibold text-ink font-mono">
                            Resend in {countdown}s
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendOtp}
                            className="font-bold text-gt-green hover:underline cursor-pointer"
                          >
                            Resend SMS
                          </button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <AppButton
                          type="button"
                          variant="secondary-outline"
                          fullWidth
                          onPress={() => setMethod('phone')}
                        >
                          Back
                        </AppButton>
                        <AppButton
                          type="submit"
                          variant="primary"
                          fullWidth
                          loading={verifyPhoneOtpMutation.isPending}
                          endContent={<CheckCircle2 size={13} />}
                          id="verify-otp-btn"
                        >
                          Verify Code
                        </AppButton>
                      </div>
                    </Form>
                  )}
                </Formik>
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
                    <CustomText
                      type="label-sm"
                      className="text-ink uppercase tracking-wider font-mono"
                    >
                      {onboardingStep === 1 ? 'Location & Vetting' : 'The Co-buyer Pledge'}
                    </CustomText>
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
                  <Formik
                    initialValues={onboardingDraft}
                    enableReinitialize
                    validationSchema={onboardingVettingSchema}
                    onSubmit={handleProceedToPledge}
                  >
                    {({ values, setFieldValue }) => (
                      <Form className="space-y-5">
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
                              const isSelected = values.country === c.name;
                              return (
                                <button
                                  key={c.code}
                                  type="button"
                                  onClick={() => {
                                    setFieldValue('country', c.name);
                                    setFieldValue('countryFlag', c.flag);
                                  }}
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
                          <CustomText type="body-sm" className="text-slate font-sans leading-relaxed">
                            To keep GrossThrift spam-free and safe, choose one verification method to confirm you are a real user.
                          </CustomText>

                          <div className="space-y-2.5">
                            {/* Vetting Option 1: Professional LinkedIn */}
                            <div
                              onClick={() => {
                                setFieldValue('vettingMethod', 'linkedin');
                                setFieldValue('vettingDetail', '');
                              }}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                values.vettingMethod === 'linkedin'
                                  ? 'border-ink bg-surface shadow-xs'
                                  : 'border-border bg-white hover:bg-surface/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    values.vettingMethod === 'linkedin'
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
                                  <CustomText type="body-sm-bold" as="h5" className="text-ink">
                                    LinkedIn / Professional Profile
                                  </CustomText>
                                  <CustomText type="body-sm" className="text-[11px] text-slate font-sans">
                                    Share your profile link to instantly self-validate with hosts.
                                  </CustomText>
                                </div>
                              </div>
                            </div>

                            {/* Vetting Option 2: Work/School Email Domain */}
                            <div
                              onClick={() => {
                                setFieldValue('vettingMethod', 'email');
                                setFieldValue('vettingDetail', '');
                              }}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                values.vettingMethod === 'email'
                                  ? 'border-ink bg-surface shadow-xs'
                                  : 'border-border bg-white hover:bg-surface/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    values.vettingMethod === 'email'
                                      ? 'bg-red-50 text-red-600'
                                      : 'bg-surface text-slate'
                                  }`}
                                >
                                  <Mail size={16} />
                                </div>
                                <div className="text-left space-y-0.5">
                                  <CustomText type="body-sm-bold" as="h5" className="text-ink">
                                    Work or School Email Domain
                                  </CustomText>
                                  <CustomText type="body-sm" className="text-[11px] text-slate font-sans">
                                    E.g., name@university.edu or name@company.com to verify.
                                  </CustomText>
                                </div>
                              </div>
                            </div>

                            {/* Vetting Option 3: Self-Attested Legal Name */}
                            <div
                              onClick={() => {
                                setFieldValue('vettingMethod', 'declaration');
                                setFieldValue('vettingDetail', 'Self-Attested Declaration');
                              }}
                              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                                values.vettingMethod === 'declaration'
                                  ? 'border-ink bg-surface shadow-xs'
                                  : 'border-border bg-white hover:bg-surface/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    values.vettingMethod === 'declaration'
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-surface text-slate'
                                  }`}
                                >
                                  <UserCheck size={16} />
                                </div>
                                <div className="text-left space-y-0.5">
                                  <CustomText type="body-sm-bold" as="h5" className="text-ink">
                                    Simple Self-Declaration Pledge
                                  </CustomText>
                                  <CustomText type="body-sm" className="text-[11px] text-slate font-sans">
                                    Confirm your legal identity and agree to strict platform guidelines.
                                  </CustomText>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Method Inputs using FormikField & CustomField */}
                          <div className="mt-3.5 pt-1">
                            {values.vettingMethod === 'linkedin' && (
                              <FormikField
                                name="vettingDetail"
                                label="LinkedIn Profile URL"
                                placeholder="username"
                                prefix={
                                  <span className="text-xs text-slate font-sans pr-1">
                                    linkedin.com/in/
                                  </span>
                                }
                              />
                            )}

                            {values.vettingMethod === 'email' && (
                              <FormikField
                                name="vettingDetail"
                                label="Company or School Email"
                                type="email"
                                placeholder="you@company.com"
                              />
                            )}

                            {values.vettingMethod === 'declaration' && (
                              <CustomField
                                label="Legal Full Name"
                                placeholder="Full Name"
                                value={tempUser?.name || ''}
                                disabled
                                info="Verified via your connected login account."
                              />
                            )}
                          </div>
                        </div>

                        <div className="pt-3">
                          <AppButton
                            type="submit"
                            variant="primary"
                            fullWidth
                            endContent={<ArrowRight size={14} />}
                          >
                            Proceed to Guidelines & Pledge
                          </AppButton>
                        </div>
                      </Form>
                    )}
                  </Formik>
                ) : (
                  <Formik
                    initialValues={{ pledgeAccepted: [] as string[] }}
                    validationSchema={onboardingPledgeSchema}
                    onSubmit={handleCompleteOnboarding}
                  >
                    {() => (
                      <Form className="space-y-5">
                        {/* The Pledge */}
                        <div className="space-y-3.5">
                          <div className="flex items-center gap-1.5">
                            <Lock className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px] font-mono font-bold text-dust uppercase tracking-wider block">
                              THE CO-BUYER PLEDGE
                            </span>
                          </div>

                          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl text-xs text-ink font-sans space-y-3">
                            <CustomText
                              type="body-sm-bold"
                              className="text-emerald-800 dark:text-emerald-300 text-[13px]"
                            >
                              To maintain trust, I pledge to follow the split rules:
                            </CustomText>

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

                          {/* Accept checkbox using CustomCheckboxGroup */}
                          <div className="p-3 bg-surface border border-border rounded-xl text-left">
                            <CustomCheckboxGroup
                              name="pledgeAccepted"
                              options={[
                                {
                                  value: 'accepted',
                                  label:
                                    'I accept these guidelines and authorize hosts to view my self-declared location & verification status.',
                                },
                              ]}
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-3">
                          <AppButton
                            type="button"
                            variant="secondary-outline"
                            fullWidth
                            onPress={() => setOnboardingStep(1)}
                          >
                            Back
                          </AppButton>

                          <AppButton
                            type="submit"
                            fullWidth
                            loading={onboardingMutation.isPending}
                            endContent={<CheckCircle2 size={13} />}
                            className="bg-[#115c3e] hover:bg-[#15724c] text-white"
                          >
                            Complete Onboarding
                          </AppButton>
                        </div>
                      </Form>
                    )}
                  </Formik>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
