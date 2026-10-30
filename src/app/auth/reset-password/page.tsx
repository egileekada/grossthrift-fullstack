'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Formik, Form } from 'formik';
import { resetPasswordSchema, ResetPasswordFormValues } from '@/lib/validations/auth';
import { FormikField, CustomField, OTPInput, AppButton, CustomText } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useUpdatePasswordMutation } from '@/hooks/useAuth';
import { AlertCircle, ArrowLeft, Check, KeyRound, Lock } from 'lucide-react';
import Navbar from '@/components/Navbar';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useApp();
  const updatePasswordMutation = useUpdatePasswordMutation();

  const initialEmail = searchParams?.get('email') || '';
  const initialToken = searchParams?.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [serverError, setServerError] = useState('');
  const [serverSuccess, setServerSuccess] = useState('');

  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setServerError('');
    setServerSuccess('');

    if (!email.trim() || !email.includes('@')) {
      setServerError('Please enter your account email address.');
      return;
    }

    try {
      const res = await updatePasswordMutation.mutateAsync({
        email: email.trim(),
        token: values.token.trim(),
        password: values.password,
      });

      if (res.user) {
        setUser(res.user);
      }

      setServerSuccess(res.message || 'Password updated successfully! Redirecting...');
      setTimeout(() => {
        router.push(res.user ? '/dashboard' : '/auth/login');
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reset password.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-off-white text-charcoal font-sans antialiased">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6 pt-32 pb-24">
        <div className="w-full max-w-md bg-white border border-border rounded-[24px] p-8 shadow-2xl space-y-6 text-left">
          <div>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:text-ink mb-4"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </Link>
            <div className="w-10 h-10 bg-sage-light text-sage rounded-xl flex items-center justify-center mb-4">
              <KeyRound size={20} />
            </div>
            <CustomText
              type="headline-sm"
              as="h1"
              className="font-bold font-display text-charcoal tracking-tight"
            >
              Reset your password
            </CustomText>
            <CustomText type="body-md" className="text-slate mt-1">
              Enter your email, 6-digit verification code, and your new password.
            </CustomText>
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
            initialValues={{
              token: initialToken,
              password: '',
              confirmPassword: '',
            }}
            enableReinitialize
            validationSchema={resetPasswordSchema}
            onSubmit={handleSubmit}
          >
            {() => (
              <Form className="space-y-4">
                <CustomField
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(val) => setEmail(String(val))}
                  placeholder="you@domain.com"
                />

                <OTPInput
                  name="token"
                  label="6-Digit Verification Code"
                  length={6}
                  autoSubmit={false}
                  error={Boolean(serverError)}
                />

                <FormikField
                  name="password"
                  label="New Password (min 8 characters)"
                  placeholder="••••••••"
                  isPassword
                />

                <FormikField
                  name="confirmPassword"
                  label="Confirm New Password"
                  placeholder="••••••••"
                  isPassword
                />

                <div className="pt-2">
                  <AppButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={updatePasswordMutation.isPending}
                  >
                    Update Password
                  </AppButton>
                </div>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-off-white" />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
