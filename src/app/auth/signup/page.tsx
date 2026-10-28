'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import { signupSchema, SignupFormValues } from '@/lib/validations/auth';
import { FormikField } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useSignupMutation } from '@/hooks/useAuth';
import { AlertCircle, Check, Globe, Loader2, Lock, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';

const COUNTRIES = [
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Nigeria', flag: '🇳🇬' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'India', flag: '🇮🇳' },
];

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const signupMutation = useSignupMutation();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const handleSubmit = async (values: SignupFormValues) => {
    setServerError('');
    setServerSuccess('');

    try {
      const res = await signupMutation.mutateAsync({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
        country: selectedCountry.name,
        countryFlag: selectedCountry.flag,
      });

      if (res.user) {
        setUser(res.user);
      }

      setServerSuccess(res.message || 'Account created! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 900);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to submit signup request';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal font-sans antialiased">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-24">
        <div className="w-full max-w-md bg-white border border-border rounded-[24px] p-8 shadow-2xl space-y-6 text-left">
          <div>
            <div className="w-10 h-10 bg-sage-light text-sage rounded-xl flex items-center justify-center mb-4">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold font-display text-charcoal tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-slate mt-1">
              Join GrossThrift to split family &amp; group subscriptions safely with escrow protection.
            </p>
          </div>

          {serverError && (
            <div className="p-3 bg-terracotta-light/60 border border-terracotta/25 text-terracotta rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {serverSuccess && (
            <div className="p-3 bg-sage-light border border-sage/25 text-sage rounded-xl text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{serverSuccess}</span>
            </div>
          )}

          <Formik
            initialValues={{ name: '', email: '', password: '', confirmPassword: '' }}
            validationSchema={signupSchema}
            onSubmit={handleSubmit}
          >
            {() => (
              <Form className="space-y-4">
                <FormikField
                  name="name"
                  label="Full Name"
                  placeholder="Alex Rivera"
                  type="text"
                />

                <FormikField
                  name="email"
                  label="Email Address"
                  placeholder="alex@example.com"
                  type="email"
                />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate mb-1.5 flex items-center gap-1.5">
                    <Globe size={13} className="text-sage" />
                    <span>Primary Billing Region</span>
                  </label>
                  <select
                    value={selectedCountry.name}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.name === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                    className="w-full px-4 py-3 bg-off-white border border-border rounded-xl text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage transition-all"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.name} value={country.name}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <FormikField
                  name="password"
                  label="Password (min 8 characters)"
                  placeholder="••••••••"
                  isPassword
                />

                <FormikField
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="••••••••"
                  isPassword
                />

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={signupMutation.isPending}
                    className="w-full py-3.5 bg-charcoal text-white dark:text-[#141c17] font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {signupMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <span>Create Free Account</span>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-slate pt-2">
                  Already have an account?{' '}
                  <Link href="/auth/login" className="text-sage font-semibold hover:underline">
                    Sign in
                  </Link>
                </p>
              </Form>
            )}
          </Formik>

          <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-1.5 text-[11px] text-dust">
            <Lock size={12} />
            <span>Protected by bank-level 256-bit encryption</span>
          </div>
        </div>
      </main>
    </div>
  );
}
