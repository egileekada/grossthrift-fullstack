'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Formik, Form } from 'formik';
import { loginSchema, LoginFormValues } from '@/lib/validations/auth';
import { FormikField, AppButton, CustomText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useLoginMutation } from '@/hooks/useAuth';
import { AlertCircle, ShieldCheck, Lock } from 'lucide-react';
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
            <CustomText
              type="headline-sm"
              as="h1"
              className="font-bold font-display text-charcoal tracking-tight"
            >
              Welcome back
            </CustomText>
            <CustomText type="body-md" className="text-slate mt-1">
              Sign in with your email and password to access your active splits, credentials, and escrow payouts.
            </CustomText>
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
                  labelRight={
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-semibold text-sage hover:underline"
                    >
                      Forgot password?
                    </Link>
                  }
                />

                <div className="pt-2">
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loginMutation.isPending}
                  >
                    Sign In
                  </AppButton>
                </div>

                <CustomText type="body-sm" className="text-center text-slate pt-2">
                  Don&apos;t have an account?{' '}
                  <Link href="/auth/signup" className="text-sage font-semibold hover:underline">
                    Create one
                  </Link>
                </CustomText>
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
