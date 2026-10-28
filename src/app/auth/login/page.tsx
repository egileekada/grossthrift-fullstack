'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import { loginSchema, LoginFormValues } from '@/lib/validations/auth';
import { FormikField } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useLoginMutation } from '@/hooks/useAuth';
import { AlertCircle, ShieldCheck, Loader2, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useApp();
  const loginMutation = useLoginMutation();
  const [serverError, setServerError] = useState('');

  const handleSubmit = async (values: LoginFormValues) => {
    setServerError('');

    try {
      const res = await loginMutation.mutateAsync({
        provider: 'email',
        email: values.email.trim(),
        password: values.password,
      });

      setUser(res.user);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in. Please try again.';
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
              Welcome back
            </h1>
            <p className="text-sm text-slate mt-1">
              Sign in with your email and password to access your active splits, credentials, and escrow payouts.
            </p>
          </div>

          {serverError && (
            <div className="p-3 bg-terracotta-light/60 border border-terracotta/25 text-terracotta rounded-xl text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleSubmit}
          >
            {() => (
              <Form className="space-y-4">
                <FormikField
                  name="email"
                  label="Email Address"
                  placeholder="you@domain.com"
                  type="email"
                />

                <FormikField
                  name="password"
                  label="Password"
                  placeholder="••••••••"
                  isPassword
                />

                <div className="flex items-center justify-end -mt-1">
                  <Link
                    href="/auth/forgot-password"
                    className="text-xs font-semibold text-sage hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginMutation.isPending}
                    className="w-full py-3.5 bg-charcoal text-white dark:text-[#141c17] font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <span>Sign In</span>
                    )}
                  </button>
                </div>

                <p className="text-xs text-center text-slate pt-2">
                  Don&apos;t have an account?{' '}
                  <Link href="/auth/signup" className="text-sage font-semibold hover:underline">
                    Create one
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
